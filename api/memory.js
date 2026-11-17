import { setCors, validateAppToken, isRateLimited } from './_cors.js';
import {
  loadPersistentMemory,
  addPersistentFact,
  deletePersistentFact
} from './_lib/memory.js';
import {
  loadLedger,
  addRecord,
  deleteRecord,
  getFinancialSummary
} from './_lib/business_records.js';

export const maxDuration = 60;

/**
 * Persistent Memory & Verified Business Records API
 * Protected with mandatory session authentication.
 */
export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Rate Limiting (60 req/min)
  if (isRateLimited(req, 60, res, 'memory')) {
    return res.status(429).json({ error: 'Rate limit exceeded (60 req/min)' });
  }

  // Mandatory Production Authentication
  if (!validateAppToken(req)) {
    return res.status(403).json({ error: 'Unauthorized: Valid Bvmbino session required' });
  }

  // 1. GET: Retrieve full persistent state (Memory + Verified Ledger + Monthly Summary)
  if (req.method === 'GET') {
    try {
      const memory = loadPersistentMemory();
      const ledger = loadLedger();
      const summary = getFinancialSummary(req.query?.period || null);

      return res.status(200).json({
        ok: true,
        memory,
        ledger,
        summary
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // 2. POST: Mutate persistent memory or business records
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const action = body.action || req.query?.action;

      // A. Add a verified business record
      if (action === 'add_record') {
        const record = addRecord({
          venture: body.venture,
          amount: body.amount,
          currency: body.currency,
          client: body.client,
          type: body.type,
          date: body.date,
          description: body.description,
          verifiedBy: body.verifiedBy || 'Boss'
        });
        const summary = getFinancialSummary(record.date?.slice(0, 7));
        return res.status(201).json({ ok: true, record, summary });
      }

      // B. Delete a business record
      if (action === 'delete_record') {
        if (!body.id) return res.status(400).json({ error: 'Record id is required' });
        const success = deleteRecord(body.id);
        return res.status(200).json({ ok: success });
      }

      // C. Add a persistent fact
      if (action === 'add_fact') {
        if (!body.text) return res.status(400).json({ error: 'text is required' });
        const fact = addPersistentFact(body.text, body.source || 'Boss');
        return res.status(201).json({ ok: true, fact });
      }

      // D. Delete a persistent fact
      if (action === 'delete_fact') {
        if (!body.id) return res.status(400).json({ error: 'Fact id is required' });
        const success = deletePersistentFact(body.id);
        return res.status(200).json({ ok: success });
      }

      // E. Financial Summary request
      if (action === 'summary') {
        const summary = getFinancialSummary(body.period || null);
        return res.status(200).json({ ok: true, summary });
      }

      return res.status(400).json({ error: `Unknown action: ${action}. Available: add_record, delete_record, add_fact, delete_fact, summary` });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
