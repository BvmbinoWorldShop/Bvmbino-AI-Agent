import fs from 'fs';
import path from 'path';

/**
 * Verified Business Records & Ledger Engine
 * Zero Fabrication Policy: Strictly calculates financial metrics from real, verified entries.
 */

// Canonical Financial Verification States
export const FINANCIAL_VERIFICATION_STATES = {
  PENDING_REVIEW: 'pending_review', // Draft entry awaiting proof/documentation
  VERIFIED: 'verified',             // Confirmed with invoice, receipt, or signed contract
  RECONCILED: 'reconciled',         // Audited and reconciled against bank settlement
  DISPUTED: 'disputed'              // Flagged, questioned, or disputed
};

// Persistent storage path (durable across restarts)
const DATA_DIR = path.resolve(process.cwd(), '.data');

export function sanitizeTenantId(rawId) {
  if (!rawId || typeof rawId !== 'string') return 'default';
  const clean = rawId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 64);
  return clean || 'default';
}

function getTenantLedgerDir(tenantId = 'default') {
  const cleanTenant = sanitizeTenantId(tenantId);
  return path.join(DATA_DIR, 'tenants', cleanTenant);
}

function getLedgerFilePath(tenantId = 'default') {
  const cleanTenant = sanitizeTenantId(tenantId);
  if (cleanTenant === 'default' || cleanTenant === 'lataupe95') {
    const legacyPath = path.join(DATA_DIR, 'business_ledger.json');
    if (fs.existsSync(legacyPath)) return legacyPath;
  }
  return path.join(getTenantLedgerDir(cleanTenant), 'business_ledger.json');
}

const _tenantLedgerCaches = new Map();

// Canonical Venture Registry
export const VENTURES = {
  FormationPro: {
    id: 'fpro',
    name: 'FormationPro',
    category: 'Corporate Training & Athletic Performance',
    markets: ['France', 'Côte d\'Ivoire', 'West Africa'],
    description: 'Elite professional training (Qualiopi, CPF, SST, conflict management, athletic mental performance).'
  },
  PurgoClean: {
    id: 'purgo',
    name: 'Purgo Clean',
    category: 'Commercial Facility Maintenance',
    markets: ['Île-de-France'],
    description: 'Commercial and corporate facility maintenance, office cleaning, syndics, coworking spaces.'
  },
  KeoJus: {
    id: 'keo',
    name: 'Keo Jus',
    category: 'Premium Artisanal Beverages',
    markets: ['Abidjan', 'Côte d\'Ivoire'],
    description: 'Artisanal cold-pressed juices and institutional distribution (Accor Hotels, hospitality, retail).'
  },
  EntrepriseAI: {
    id: 'eai',
    name: 'Entreprise AI',
    category: 'AI Enterprise Automation',
    markets: ['Global'],
    description: 'B2B enterprise automation, bespoke multi-agent operating systems, workflow integrations.'
  }
};

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
  }
}

function ensureTenantStorage(tenantId = 'default') {
  ensureStorage();
  const dir = getTenantLedgerDir(tenantId);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }
}

/**
 * Load all business records from durable store for a specific tenant
 */
export function loadLedger(tenantId = 'default') {
  const cleanTenant = sanitizeTenantId(tenantId);
  if (_tenantLedgerCaches.has(cleanTenant)) {
    return _tenantLedgerCaches.get(cleanTenant);
  }

  ensureTenantStorage(cleanTenant);
  const filePath = getLedgerFilePath(cleanTenant);

  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(raw);
      if (!Array.isArray(data.records)) {
        data.records = [];
      }
      data.tenantId = cleanTenant;
      _tenantLedgerCaches.set(cleanTenant, data);
      return data;
    } catch (e) {
      console.warn(`[Ledger] Failed to read ledger file for ${cleanTenant}:`, e.message);
    }
  }

  // Initial clean state with ZERO fabricated records
  const initial = {
    version: 1,
    tenantId: cleanTenant,
    records: [],
    updatedAt: new Date().toISOString()
  };
  saveLedger(initial, cleanTenant);
  return initial;
}

/**
 * Persist business records to durable store for a specific tenant
 */
export function saveLedger(data, tenantId = 'default') {
  const cleanTenant = sanitizeTenantId(tenantId || data?.tenantId);
  if (data) data.tenantId = cleanTenant;
  _tenantLedgerCaches.set(cleanTenant, data);
  ensureTenantStorage(cleanTenant);
  const filePath = getLedgerFilePath(cleanTenant);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.warn(`[Ledger] Failed to write ledger file for ${cleanTenant} to disk:`, e.message);
  }
}

/**
 * Add a business record with explicit verification state
 * New records default strictly to pending_review.
 * Only entries explicitly marked verified/reconciled WITH valid evidenceRef contribute to audited totals.
 */
export function addRecord({
  venture,
  amount,
  currency = 'EUR',
  client = '',
  type = 'invoice', // invoice | retainer | contract | payout
  date = new Date().toISOString().split('T')[0],
  description = '',
  verifiedBy = 'Boss',
  status = null,
  verificationStatus = null,
  evidenceRef = ''
}, tenantId = 'default') {
  if (!venture || amount === undefined || amount === null) {
    throw new Error('venture and amount are required to log a business record');
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount < 0) {
    throw new Error('amount must be a valid positive number');
  }

  const cleanTenant = sanitizeTenantId(tenantId);

  // Canonicalize venture name
  let matchedVenture = Object.keys(VENTURES).find(
    v => v.toLowerCase() === venture.toLowerCase() ||
         VENTURES[v].name.toLowerCase() === venture.toLowerCase() ||
         VENTURES[v].id.toLowerCase() === venture.toLowerCase()
  );

  if (!matchedVenture) {
    matchedVenture = venture; // Allow custom venture if specified
  }

  const cleanCurrency = currency.toUpperCase().trim();
  if (!['EUR', 'FCFA', 'USD', 'GBP'].includes(cleanCurrency)) {
    throw new Error(`Unsupported currency: ${currency}. Supported: EUR, FCFA, USD, GBP`);
  }

  const cleanEvidence = (evidenceRef || '').trim();
  const hasEvidence = cleanEvidence.length > 0;

  // Resolve verification status — NEW RECORDS DEFAULT STRICTLY TO PENDING_REVIEW
  let resolvedStatus = FINANCIAL_VERIFICATION_STATES.PENDING_REVIEW;
  const rawStatus = (verificationStatus || status || '').toLowerCase().trim();

  if (rawStatus === 'reconciled' && hasEvidence) {
    resolvedStatus = FINANCIAL_VERIFICATION_STATES.RECONCILED;
  } else if (rawStatus === 'verified' && hasEvidence) {
    resolvedStatus = FINANCIAL_VERIFICATION_STATES.VERIFIED;
  } else if (rawStatus === 'disputed') {
    resolvedStatus = FINANCIAL_VERIFICATION_STATES.DISPUTED;
  } else {
    // Missing evidence or explicitly pending
    resolvedStatus = FINANCIAL_VERIFICATION_STATES.PENDING_REVIEW;
  }

  const isAuditedGroundTruth = (resolvedStatus === FINANCIAL_VERIFICATION_STATES.VERIFIED ||
                               resolvedStatus === FINANCIAL_VERIFICATION_STATES.RECONCILED) &&
                               hasEvidence;

  const ledger = loadLedger(cleanTenant);
  const id = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const nowIso = new Date().toISOString();

  const newRecord = {
    id,
    tenantId: cleanTenant,
    venture: matchedVenture,
    amount: numAmount,
    currency: cleanCurrency,
    client: client.trim(),
    type: type.toLowerCase().trim(),
    date,
    description: description.trim(),
    verificationStatus: resolvedStatus,
    verified: isAuditedGroundTruth,
    evidenceRef: cleanEvidence,
    verifiedBy: verifiedBy.trim(),
    verifiedAt: isAuditedGroundTruth ? nowIso : null,
    reconciledAt: resolvedStatus === FINANCIAL_VERIFICATION_STATES.RECONCILED ? nowIso : null,
    createdAt: nowIso
  };

  ledger.records.unshift(newRecord);
  ledger.updatedAt = nowIso;
  saveLedger(ledger, cleanTenant);

  return newRecord;
}

/**
 * Update the verification state of a business record (Audit Trail)
 */
export function updateRecordVerification(id, {
  verificationStatus,
  evidenceRef = '',
  verifiedBy = 'Boss'
}, tenantId = 'default') {
  const cleanTenant = sanitizeTenantId(tenantId);
  const ledger = loadLedger(cleanTenant);
  const record = ledger.records.find(r => r.id === id);
  if (!record) {
    throw new Error(`Business record not found: ${id}`);
  }

  const validStates = Object.values(FINANCIAL_VERIFICATION_STATES);
  const cleanStatus = (verificationStatus || '').toLowerCase().trim();
  if (!validStates.includes(cleanStatus)) {
    throw new Error(`Invalid verification status: ${verificationStatus}. Allowed: ${validStates.join(', ')}`);
  }

  const cleanEvidence = (evidenceRef || record.evidenceRef || '').trim();

  if (cleanStatus === FINANCIAL_VERIFICATION_STATES.VERIFIED || cleanStatus === FINANCIAL_VERIFICATION_STATES.RECONCILED) {
    if (!cleanEvidence) {
      throw new Error(`Cannot verify record ${id} without valid invoice, receipt, or contract evidenceRef.`);
    }
    record.verified = true;
  } else {
    record.verified = false;
  }

  record.verificationStatus = cleanStatus;
  record.evidenceRef = cleanEvidence;
  record.verifiedBy = verifiedBy.trim();

  const nowIso = new Date().toISOString();
  if (record.verified && !record.verifiedAt) {
    record.verifiedAt = nowIso;
  }
  if (cleanStatus === FINANCIAL_VERIFICATION_STATES.RECONCILED) {
    record.reconciledAt = nowIso;
  }
  record.updatedAt = nowIso;

  ledger.updatedAt = nowIso;
  saveLedger(ledger, cleanTenant);
  return record;
}

/**
 * Delete a business record by ID
 */
export function deleteRecord(id, tenantId = 'default') {
  const cleanTenant = sanitizeTenantId(tenantId);
  const ledger = loadLedger(cleanTenant);
  const initialLen = ledger.records.length;
  ledger.records = ledger.records.filter(r => r.id !== id);
  if (ledger.records.length !== initialLen) {
    ledger.updatedAt = new Date().toISOString();
    saveLedger(ledger, cleanTenant);
    return true;
  }
  return false;
}

/**
 * Get verified financial summary for a period (e.g. '2026-11' or null for all-time)
 * STRICTLY returns audited totals from real records. If zero records, returns 0.
 * Clearly separates Verified/Reconciled revenue from Pending Drafts and Disputed items.
 */
export function getFinancialSummary(filterMonth = null, customLedger = null, tenantId = 'default') {
  const cleanTenant = sanitizeTenantId(tenantId);
  const ledger = customLedger && Array.isArray(customLedger)
    ? { records: customLedger }
    : (customLedger && Array.isArray(customLedger.records) ? customLedger : loadLedger(cleanTenant));
  const targetPrefix = filterMonth || new Date().toISOString().slice(0, 7); // 'YYYY-MM'

  const recordsInPeriod = ledger.records.filter(r => {
    if (!r.date) return false;
    return r.date.startsWith(targetPrefix);
  });

  // Only records explicitly verified/reconciled WITH evidence contribute to audited totals
  const auditedRecords = recordsInPeriod.filter(r => 
    r.verified === true &&
    (r.verificationStatus === FINANCIAL_VERIFICATION_STATES.VERIFIED || r.verificationStatus === FINANCIAL_VERIFICATION_STATES.RECONCILED) &&
    Boolean(r.evidenceRef && r.evidenceRef.trim().length > 0)
  );
  const pendingRecords = recordsInPeriod.filter(r => 
    r.verificationStatus === FINANCIAL_VERIFICATION_STATES.PENDING_REVIEW ||
    (r.verificationStatus !== FINANCIAL_VERIFICATION_STATES.DISPUTED && (!r.verified || !r.evidenceRef))
  );
  const disputedRecords = recordsInPeriod.filter(r => r.verificationStatus === FINANCIAL_VERIFICATION_STATES.DISPUTED);
  const reconciledRecords = auditedRecords.filter(r => r.verificationStatus === FINANCIAL_VERIFICATION_STATES.RECONCILED);

  const totals = {
    period: targetPrefix,
    recordCount: auditedRecords.length,
    totalEur: 0,
    totalFcfa: 0,
    totalUsd: 0,
    reconciledEur: 0,
    pendingEur: 0,
    disputedEur: 0,
    verificationCounts: {
      verified: auditedRecords.length - reconciledRecords.length,
      reconciled: reconciledRecords.length,
      pending: pendingRecords.length,
      disputed: disputedRecords.length,
      totalAudited: auditedRecords.length
    },
    byVenture: {},
    records: auditedRecords,
    pendingRecords
  };

  // Initialize all canonical ventures with 0
  for (const vKey of Object.keys(VENTURES)) {
    totals.byVenture[vKey] = {
      ventureName: VENTURES[vKey].name,
      totalEur: 0,
      totalFcfa: 0,
      reconciledEur: 0,
      pendingEur: 0,
      recordCount: 0
    };
  }

  // Calculate Audited Totals
  for (const r of auditedRecords) {
    if (!totals.byVenture[r.venture]) {
      totals.byVenture[r.venture] = {
        ventureName: r.venture,
        totalEur: 0,
        totalFcfa: 0,
        reconciledEur: 0,
        pendingEur: 0,
        recordCount: 0
      };
    }

    totals.byVenture[r.venture].recordCount += 1;

    if (r.currency === 'EUR') {
      totals.totalEur += r.amount;
      totals.byVenture[r.venture].totalEur += r.amount;
      if (r.verificationStatus === FINANCIAL_VERIFICATION_STATES.RECONCILED) {
        totals.reconciledEur += r.amount;
        totals.byVenture[r.venture].reconciledEur += r.amount;
      }
    } else if (r.currency === 'FCFA') {
      totals.totalFcfa += r.amount;
      totals.byVenture[r.venture].totalFcfa += r.amount;
    } else if (r.currency === 'USD') {
      totals.totalUsd += r.amount;
    }
  }

  // Calculate Pending Drafts & Disputed Totals
  for (const r of pendingRecords) {
    if (r.currency === 'EUR') {
      totals.pendingEur += r.amount;
      if (totals.byVenture[r.venture]) {
        totals.byVenture[r.venture].pendingEur += r.amount;
      }
    }
  }

  for (const r of disputedRecords) {
    if (r.currency === 'EUR') {
      totals.disputedEur += r.amount;
    }
  }

  return totals;
}

/**
 * Format verified financial ledger string for injection into LLM system prompt.
 * Zero fabrication: guarantees truthfulness.
 */
export function formatLedgerForPrompt(filterMonth = null, customLedger = null, tenantId = 'default') {
  const summary = getFinancialSummary(filterMonth, customLedger, tenantId);

  if (summary.recordCount === 0) {
    return `[VERIFIED BUSINESS LEDGER — ZERO FABRICATION GROUND TRUTH]:
- Active Period: ${summary.period}
- Status: 0 VERIFIED INVOICES / PAYMENTS LOGGED FOR THIS MONTH.
- Verified Monthly Revenue: €0.00 (0 FCFA).
- INSTRUCTION: You MUST inform Boss honestly that there are currently 0 verified revenue records logged in the ledger for this period. NEVER guess or make up numbers. Ask Boss if he would like to log a closed invoice, payment, or client retainer.`;
  }

  let text = `[VERIFIED BUSINESS LEDGER — AUDITED GROUND TRUTH]:\n`;
  text += `- Active Period: ${summary.period}\n`;
  text += `- Audited Booked Revenue: €${summary.totalEur.toLocaleString('en-US', { minimumFractionDigits: 2 })} EUR (Bank Reconciled: €${summary.reconciledEur.toLocaleString('en-US', { minimumFractionDigits: 2 })} EUR)\n`;
  if (summary.pendingEur > 0) {
    text += `- Pending Invoices / Drafts: €${summary.pendingEur.toLocaleString('en-US', { minimumFractionDigits: 2 })} EUR (${summary.verificationCounts.pending} drafts awaiting verification)\n`;
  }
  if (summary.totalFcfa > 0) {
    text += `- Verified Total FCFA: ${summary.totalFcfa.toLocaleString('en-US')} FCFA\n`;
  }
  text += `- Total Audited Records: ${summary.recordCount}\n\n`;
  text += `Breakdown by Venture:\n`;

  for (const [, data] of Object.entries(summary.byVenture)) {
    if (data.recordCount > 0) {
      let vStr = `• ${data.ventureName}: `;
      if (data.totalEur > 0) vStr += `€${data.totalEur.toLocaleString('en-US', { minimumFractionDigits: 2 })} `;
      if (data.totalFcfa > 0) vStr += `(${data.totalFcfa.toLocaleString('en-US')} FCFA) `;
      vStr += `[${data.recordCount} verified transaction(s)]`;
      text += `${vStr}\n`;
    }
  }

  text += `\nVerified Records Detail:\n`;
  for (const r of summary.records) {
    text += `  - [${r.date}] ${r.venture}: ${r.amount} ${r.currency} from "${r.client || 'N/A'}" (${r.description || r.type}) - Verified by ${r.verifiedBy}\n`;
  }

  return text.trim();
}

/**
 * Reset ledger (used for automated tests)
 */
export function resetLedger(tenantId = 'default') {
  const cleanTenant = sanitizeTenantId(tenantId);
  const initial = {
    version: 1,
    tenantId: cleanTenant,
    records: [],
    updatedAt: new Date().toISOString()
  };
  _tenantLedgerCaches.set(cleanTenant, initial);
  saveLedger(initial, cleanTenant);
}
