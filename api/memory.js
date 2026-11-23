import { setCors, validateAppToken, getAuthSession, isRateLimited } from './_cors.js';
import {
  loadPersistentMemory,
  addMemoryItem,
  updateMemoryItem,
  supersedeMemoryItem,
  deleteMemoryItem,
  retrieveRelevantMemory,
  createConversationSummary,
  exportMemoryBackup,
  importMemoryBackup,
  findDuplicateMemory,
  MEMORY_TIERS
} from './_lib/memory.js';
import {
  loadLedger,
  addRecord,
  updateRecordVerification,
  deleteRecord,
  getFinancialSummary,
  FINANCIAL_VERIFICATION_STATES
} from './_lib/business_records.js';

export const maxDuration = 60;

/**
 * Memory Hub API v3.0
 * Comprehensive endpoint for user-editable facts, relevance retrieval,
 * duplicate detection, outdated info correction, summaries, and backup.
 * Enforces strict per-tenant isolation: Client A cannot access Client B's data.
 */
export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Mandatory App Token Authentication
  const session = getAuthSession(req);
  if (!session.authenticated) {
    return res.status(403).json({ error: 'Unauthorized: Valid Bvmbino session required' });
  }

  // Rate Limiting (60 req/min)
  if (await isRateLimited(req, 60, res, 'memory')) {
    return res.status(429).json({ error: 'Rate limit exceeded (60 req/min)' });
  }

  // Tenant Resolution & Cross-Tenant Authorization
  let bodyData = null;
  if (req.body) {
    bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }

  const requestedTenant = req.query?.tenantId || bodyData?.tenantId;
  if (requestedTenant && requestedTenant !== session.tenantId && session.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Cross-tenant access denied' });
  }

  const tenantId = (session.role === 'admin' && requestedTenant) ? requestedTenant : session.tenantId;

  // 1. GET Requests
  if (req.method === 'GET') {
    try {
      const action = req.query?.action;

      // Backup Export
      if (action === 'export') {
        const backup = exportMemoryBackup(tenantId);
        res.setHeader('Content-Disposition', `attachment; filename="bvmbino-memory-backup-${tenantId}-${Date.now()}.json"`);
        return res.status(200).json(backup);
      }

      // Relevance-based Retrieval
      if (action === 'retrieve') {
        const query = req.query?.query || '';
        const venture = req.query?.venture || null;
        const limit = parseInt(req.query?.limit, 10) || 10;
        const retrieved = retrieveRelevantMemory({ query, venture, limit }, tenantId);
        return res.status(200).json({ ok: true, query, tenantId, ...retrieved });
      }

      // Check Duplicates
      if (action === 'check_duplicate') {
        const text = req.query?.text || '';
        const venture = req.query?.venture || null;
        const dupResult = findDuplicateMemory(text, venture, 0.80, tenantId);
        return res.status(200).json({ ok: true, duplicate: dupResult });
      }

      // Default: Load complete Memory Hub state for this tenant
      const memory = loadPersistentMemory(tenantId);
      const ledger = loadLedger(tenantId);
      const summary = getFinancialSummary(req.query?.period || null, null, tenantId);

      // Separate items by tier for the UI
      const confirmedFacts = memory.items.filter(i => i.type === MEMORY_TIERS.CONFIRMED_FACT && i.status === 'active');
      const assumptions = memory.items.filter(i => i.type === MEMORY_TIERS.ASSUMPTION && i.status === 'active');
      const targets = memory.items.filter(i => i.type === MEMORY_TIERS.TARGET && i.status === 'active');
      const superseded = memory.items.filter(i => i.status === 'superseded');

      return res.status(200).json({
        ok: true,
        tenantId,
        memory,
        profile: memory.profile,
        facts: memory.facts || [],
        tiers: {
          confirmedFacts,
          assumptions,
          targets,
          superseded
        },
        summaries: memory.summaries,
        ledger,
        summary,
        financialSummary: summary,
        totalActiveItems: confirmedFacts.length + assumptions.length + targets.length
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // 2. POST Requests
  if (req.method === 'POST') {
    try {
      const body = bodyData || {};
      const action = body.action || req.query?.action;

      // A. Add Memory Item (with tier: confirmed_fact | assumption | target)
      if (action === 'add_item' || action === 'add_fact') {
        const result = addMemoryItem({
          text: body.text,
          type: body.type || MEMORY_TIERS.CONFIRMED_FACT,
          venture: body.venture || 'Global',
          category: body.category || 'general',
          tags: body.tags || [],
          source: body.source || 'user_edit',
          allowDuplicate: body.allowDuplicate === true
        }, tenantId);
        return res.status(201).json({ ok: true, tenantId, ...result });
      }

      // B. Update Memory Item (User-editable)
      if (action === 'update_item') {
        if (!body.id) return res.status(400).json({ error: 'Item id is required' });
        const updated = updateMemoryItem(body.id, {
          text: body.text,
          type: body.type,
          venture: body.venture,
          category: body.category,
          tags: body.tags,
          status: body.status
        }, tenantId);
        return res.status(200).json({ ok: true, tenantId, item: updated });
      }

      // C. Correct Outdated Info (Supersede)
      if (action === 'supersede_item') {
        if (!body.oldId || !body.newText) {
          return res.status(400).json({ error: 'oldId and newText are required to supersede an item' });
        }
        const result = supersedeMemoryItem(body.oldId, body.newText, {
          type: body.type,
          venture: body.venture,
          category: body.category,
          tags: body.tags
        }, tenantId);
        return res.status(200).json({ ok: true, tenantId, ...result });
      }

      // D. Delete Memory Item
      if (action === 'delete_item' || action === 'delete_fact') {
        if (!body.id) return res.status(400).json({ error: 'Item id is required' });
        const success = deleteMemoryItem(body.id, tenantId);
        return res.status(200).json({ ok: success, tenantId });
      }

      // E. Conversation Summarisation
      if (action === 'summarize') {
        const { sessionId, messages, title } = body;
        if (!messages || !Array.isArray(messages)) {
          return res.status(400).json({ error: 'messages array is required for conversation summarisation' });
        }
        const summary = createConversationSummary({ sessionId, messages, title }, tenantId);
        return res.status(201).json({ ok: true, tenantId, summary });
      }

      // F. Import / Restore Backup
      if (action === 'import') {
        const { backup, mode = 'merge' } = body;
        if (!backup) return res.status(400).json({ error: 'backup JSON data is required' });
        const result = importMemoryBackup(backup, mode, tenantId);
        return res.status(200).json({ ok: true, tenantId, ...result });
      }

      // G. Business Records Ledger actions
      if (action === 'add_record') {
        const record = addRecord({
          venture: body.venture,
          amount: body.amount,
          currency: body.currency,
          client: body.client,
          type: body.type,
          date: body.date,
          description: body.description,
          verifiedBy: body.verifiedBy || session.sub || 'Boss',
          status: body.status,
          verificationStatus: body.verificationStatus,
          evidenceRef: body.evidenceRef
        }, tenantId);
        const summary = getFinancialSummary(record.date?.slice(0, 7), null, tenantId);
        return res.status(201).json({ ok: true, tenantId, record, summary });
      }

      if (action === 'verify_record') {
        if (!body.id) return res.status(400).json({ error: 'Record id is required' });
        const updated = updateRecordVerification(body.id, {
          verificationStatus: body.verificationStatus || body.status || FINANCIAL_VERIFICATION_STATES.VERIFIED,
          evidenceRef: body.evidenceRef,
          verifiedBy: body.verifiedBy || session.sub || 'Boss'
        }, tenantId);
        const summary = getFinancialSummary(updated.date?.slice(0, 7), null, tenantId);
        return res.status(200).json({ ok: true, tenantId, record: updated, summary });
      }

      if (action === 'delete_record') {
        if (!body.id) return res.status(400).json({ error: 'Record id is required' });
        const success = deleteRecord(body.id, tenantId);
        return res.status(200).json({ ok: success, tenantId });
      }

      if (action === 'summary') {
        const summary = getFinancialSummary(body.period || null, null, tenantId);
        return res.status(200).json({ ok: true, tenantId, summary });
      }

      return res.status(400).json({ error: `Unknown action: ${action}` });
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
