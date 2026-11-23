import fs from 'fs';
import path from 'path';
import { loadLedger, VENTURES } from './business_records.js';

/**
 * Sovereign Memory Hub Engine v3.0
 * 
 * Core Capabilities:
 * 1. Strict Classification: Confirmed Facts vs Assumptions vs Targets
 * 2. User-Editable Lifecycle: Add, edit, correct, supersede outdated data
 * 3. Fuzzy Duplicate Detection: Token overlap & Jaccard similarity
 * 4. Relevance-Based Retrieval: TF-IDF / keyword affinity scoring
 * 5. Conversation Summarisation: Decision extraction & action item tracking
 * 6. Backup Engine: Full JSON import & export
 */

const DATA_DIR = path.resolve(process.cwd(), '.data');

export function sanitizeTenantId(rawId) {
  if (!rawId || typeof rawId !== 'string') return 'default';
  const clean = rawId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 64);
  return clean || 'default';
}

function getTenantMemoryDir(tenantId = 'default') {
  const cleanTenant = sanitizeTenantId(tenantId);
  return path.join(DATA_DIR, 'tenants', cleanTenant);
}

function getMemoryFilePath(tenantId = 'default') {
  const cleanTenant = sanitizeTenantId(tenantId);
  if (cleanTenant === 'default' || cleanTenant === 'lataupe95') {
    const legacyPath = path.join(DATA_DIR, 'persistent_memory.json');
    if (fs.existsSync(legacyPath)) return legacyPath;
  }
  return path.join(getTenantMemoryDir(cleanTenant), 'persistent_memory.json');
}

// Supported memory tiers
export const MEMORY_TIERS = {
  CONFIRMED_FACT: 'confirmed_fact',
  ASSUMPTION: 'assumption',
  TARGET: 'target'
};

const _tenantMemoryCaches = new Map();

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
  }
}

function ensureTenantMemoryStorage(tenantId = 'default') {
  ensureStorage();
  const dir = getTenantMemoryDir(tenantId);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }
}

/**
 * Tokenize string into normalized words, ignoring stop words
 */
function tokenize(str) {
  if (!str || typeof str !== 'string') return [];
  const stopWords = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
    'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
    'can', 'did', 'do', 'does', 'doing', 'don', 'down', 'during', 'each', 'few', 'for', 'from', 'further',
    'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his',
    'how', 'i', 'if', 'in', 'into', 'is', 'isn', 'it', 'its', 'itself', 'just', 'me', 'more', 'most',
    'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our',
    'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than',
    'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this',
    'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn', 'we', 'were', 'weren',
    'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'won', 'would', 'you', 'your',
    'le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'est', 'en', 'ce', 'que', 'qui', 'pour', 'dans'
  ]);
  return str
    .toLowerCase()
    .replace(/[^\w\sàâéèêëîïôùûüç-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}

/**
 * Calculate Jaccard similarity between two token arrays
 */
function jaccardSimilarity(tokensA, tokensB) {
  if (!tokensA.length || !tokensB.length) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Load persistent memory from server-side store for a specific tenant
 */
export function loadPersistentMemory(tenantId = 'default') {
  const cleanTenant = sanitizeTenantId(tenantId);
  if (_tenantMemoryCaches.has(cleanTenant)) {
    return _tenantMemoryCaches.get(cleanTenant);
  }

  ensureTenantMemoryStorage(cleanTenant);
  const filePath = getMemoryFilePath(cleanTenant);

  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(raw);
      if (!Array.isArray(data.items)) data.items = [];
      if (!Array.isArray(data.summaries)) data.summaries = [];
      if (!Array.isArray(data.facts)) data.facts = [];
      data.tenantId = cleanTenant;
      _tenantMemoryCaches.set(cleanTenant, data);
      return data;
    } catch (e) {
      console.warn(`[Memory] Failed to read memory file for ${cleanTenant}, initializing new:`, e.message);
    }
  }

  const isDefaultTenant = cleanTenant === 'default' || cleanTenant === 'lataupe95';

  // Initial state partitioned for this tenant
  const initial = {
    version: 2,
    tenantId: cleanTenant,
    profile: {
      user: isDefaultTenant ? 'Boss' : `Customer_${cleanTenant}`,
      callsign: 'Bvmbino',
      handle: isDefaultTenant ? 'Lataupe95' : cleanTenant,
      title: isDefaultTenant ? 'Founder & Managing Director' : 'Business Client',
      activeVentures: Object.values(VENTURES).map(v => v.name)
    },
    facts: isDefaultTenant ? [
      { id: 'fact_ventures', text: 'Boss operates 4 ventures: FormationPro, Purgo Clean, Keo Jus, and Entreprise AI.', createdAt: new Date().toISOString() },
      { id: 'fact_circle', text: 'Executive team consists of 24 specialist agents coordinated by Billy.', createdAt: new Date().toISOString() }
    ] : [],
    items: isDefaultTenant ? [
      {
        id: 'fact_ventures',
        tenantId: cleanTenant,
        type: MEMORY_TIERS.CONFIRMED_FACT,
        venture: 'Global',
        category: 'structure',
        text: 'Boss operates 4 ventures: FormationPro, Purgo Clean, Keo Jus, and Entreprise AI.',
        status: 'active',
        confidence: 1.0,
        source: 'system_core',
        tags: ['ventures', 'structure', 'operations'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'fact_circle',
        tenantId: cleanTenant,
        type: MEMORY_TIERS.CONFIRMED_FACT,
        venture: 'Global',
        category: 'team',
        text: 'Executive team consists of 24 specialist agents coordinated by Billy.',
        status: 'active',
        confidence: 1.0,
        source: 'system_core',
        tags: ['agents', 'team', 'billy'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'mem_fpro_core',
        tenantId: cleanTenant,
        type: MEMORY_TIERS.CONFIRMED_FACT,
        venture: 'FormationPro',
        category: 'venture',
        text: 'FormationPro is a certified training organization (Qualiopi, CPF, SST, conflict management, athletic mental performance) operating in France and West Africa.',
        status: 'active',
        confidence: 1.0,
        source: 'system_core',
        tags: ['training', 'qualiopi', 'cpf', 'education'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'mem_purgo_core',
        tenantId: cleanTenant,
        type: MEMORY_TIERS.CONFIRMED_FACT,
        venture: 'Purgo Clean',
        category: 'venture',
        text: 'Purgo Clean provides commercial facility maintenance, corporate office cleaning, and syndic property upkeep across Île-de-France.',
        status: 'active',
        confidence: 1.0,
        source: 'system_core',
        tags: ['cleaning', 'b2b', 'maintenance', 'syndic', 'offices'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'mem_keo_core',
        tenantId: cleanTenant,
        type: MEMORY_TIERS.CONFIRMED_FACT,
        venture: 'Keo Jus',
        category: 'venture',
        text: 'Keo Jus is a premium cold-pressed artisanal juice brand distributed in Abidjan with hospitality partnerships including Accor Hotels.',
        status: 'active',
        confidence: 1.0,
        source: 'system_core',
        tags: ['juice', 'beverage', 'accor', 'abidjan'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'mem_eai_core',
        tenantId: cleanTenant,
        type: MEMORY_TIERS.CONFIRMED_FACT,
        venture: 'Entreprise AI',
        category: 'venture',
        text: 'Entreprise AI specializes in sovereign AI agent workflows, enterprise automation, and custom LLM integrations.',
        status: 'active',
        confidence: 1.0,
        source: 'system_core',
        tags: ['ai', 'automation', 'agents', 'workflow'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ] : [],
    summaries: [],
    updatedAt: new Date().toISOString()
  };

  savePersistentMemory(initial, cleanTenant);
  return initial;
}

/**
 * Save persistent memory to server-side store for a specific tenant
 */
export function savePersistentMemory(data, tenantId = 'default') {
  const cleanTenant = sanitizeTenantId(tenantId || data?.tenantId);
  if (data) data.tenantId = cleanTenant;
  _tenantMemoryCaches.set(cleanTenant, data);
  ensureTenantMemoryStorage(cleanTenant);
  const filePath = getMemoryFilePath(cleanTenant);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.warn(`[Memory] Failed to write memory file for ${cleanTenant} to disk:`, e.message);
  }
}

/**
 * Duplicate Detection Engine:
 * Compares text against active memory items of the same venture or type.
 */
export function findDuplicateMemory(text, venture = null, threshold = 0.80, tenantId = 'default') {
  const memory = loadPersistentMemory(tenantId);
  const inputTokens = tokenize(text);
  if (!inputTokens.length) return null;

  const activeItems = memory.items.filter(item => item.status === 'active');

  for (const item of activeItems) {
    // If venture specified, prefer comparing within same venture
    if (venture && item.venture && item.venture.toLowerCase() !== venture.toLowerCase() && item.venture !== 'Global') {
      continue;
    }

    const itemTokens = tokenize(item.text);
    const sim = jaccardSimilarity(inputTokens, itemTokens);

    if (sim >= threshold) {
      return {
        isDuplicate: true,
        similarity: Math.round(sim * 100) / 100,
        existingItem: item
      };
    }
  }

  return null;
}

/**
 * Add a memory item with strict tier separation and duplicate protection
 */
export function addMemoryItem({
  text,
  type = MEMORY_TIERS.CONFIRMED_FACT,
  venture = 'Global',
  category = 'general',
  tags = [],
  source = 'user_edit',
  confidence = 1.0,
  allowDuplicate = false
}, tenantId = 'default') {
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new Error('Memory text is required');
  }

  const cleanTenant = sanitizeTenantId(tenantId);
  const cleanText = text.trim();
  const validTypes = Object.values(MEMORY_TIERS);
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid memory type: ${type}. Must be one of: ${validTypes.join(', ')}`);
  }

  // Duplicate Check
  if (!allowDuplicate) {
    const dup = findDuplicateMemory(cleanText, venture, 0.80, cleanTenant);
    if (dup && dup.isDuplicate) {
      return {
        item: dup.existingItem,
        isDuplicate: true,
        similarity: dup.similarity,
        message: `Near-duplicate item already exists (ID: ${dup.existingItem.id}, ${(dup.similarity * 100).toFixed(0)}% match)`
      };
    }
  }

  const memory = loadPersistentMemory(cleanTenant);
  const idPrefix = type === MEMORY_TIERS.CONFIRMED_FACT ? 'fact_' : 'mem_';
  const id = `${idPrefix}${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  const calculatedConfidence = typeof confidence === 'number'
    ? confidence
    : (type === MEMORY_TIERS.CONFIRMED_FACT ? 1.0 : type === MEMORY_TIERS.TARGET ? 0.75 : 0.45);

  const newItem = {
    id,
    tenantId: cleanTenant,
    type,
    venture: venture.trim(),
    category: category.toLowerCase().trim(),
    text: cleanText,
    status: 'active',
    confidence: calculatedConfidence,
    source,
    tags: Array.isArray(tags) ? tags.map(t => String(t).toLowerCase().trim()) : tokenize(cleanText).slice(0, 5),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  memory.items.unshift(newItem);
  if (type === MEMORY_TIERS.CONFIRMED_FACT) {
    if (!Array.isArray(memory.facts)) memory.facts = [];
    memory.facts.unshift({ id, text: cleanText, createdAt: newItem.createdAt });
  }
  memory.updatedAt = new Date().toISOString();
  savePersistentMemory(memory, cleanTenant);

  return { item: newItem, isDuplicate: false };
}

/**
 * User-Editable Facts: Update an existing memory item
 */
export function updateMemoryItem(id, updates = {}, tenantId = 'default') {
  const cleanTenant = sanitizeTenantId(tenantId);
  const memory = loadPersistentMemory(cleanTenant);
  const idx = memory.items.findIndex(m => m.id === id);
  if (idx === -1) {
    throw new Error(`Memory item not found: ${id}`);
  }

  const cur = memory.items[idx];
  const updated = {
    ...cur,
    ...updates,
    id: cur.id, // Immutable ID
    tenantId: cleanTenant,
    updatedAt: new Date().toISOString()
  };

  // Re-verify type if updated
  if (updates.type && !Object.values(MEMORY_TIERS).includes(updates.type)) {
    throw new Error(`Invalid memory type: ${updates.type}`);
  }

  memory.items[idx] = updated;
  memory.updatedAt = new Date().toISOString();
  savePersistentMemory(memory, cleanTenant);

  return updated;
}

/**
 * Correct Outdated Information: Supersede an old item with a corrected version
 */
export function supersedeMemoryItem(oldId, newText, newProperties = {}, tenantId = 'default') {
  const cleanTenant = sanitizeTenantId(tenantId);
  const memory = loadPersistentMemory(cleanTenant);
  const oldItem = memory.items.find(m => m.id === oldId);
  if (!oldItem) {
    throw new Error(`Cannot supersede: item ${oldId} not found`);
  }

  // Create the new active replacement item
  const newType = newProperties.type || oldItem.type;
  const newVenture = newProperties.venture || oldItem.venture;
  const newCategory = newProperties.category || oldItem.category;

  const { item: newItem } = addMemoryItem({
    text: newText,
    type: newType,
    venture: newVenture,
    category: newCategory,
    source: 'user_correction',
    tags: newProperties.tags || oldItem.tags,
    allowDuplicate: true
  }, cleanTenant);

  // Mark old item as superseded and link to the new item
  oldItem.status = 'superseded';
  oldItem.supersededBy = newItem.id;
  oldItem.updatedAt = new Date().toISOString();

  savePersistentMemory(memory, cleanTenant);
  return { newItem, oldItem };
}

/**
 * Delete a memory item by ID
 */
export function deleteMemoryItem(id, tenantId = 'default') {
  const cleanTenant = sanitizeTenantId(tenantId);
  const memory = loadPersistentMemory(cleanTenant);
  const initialLen = memory.items.length;
  memory.items = memory.items.filter(m => m.id !== id);
  if (Array.isArray(memory.facts)) {
    memory.facts = memory.facts.filter(f => f.id !== id);
  }
  if (memory.items.length !== initialLen) {
    memory.updatedAt = new Date().toISOString();
    savePersistentMemory(memory, cleanTenant);
    return true;
  }
  return false;
}

/**
 * Conversation Summarisation:
 * Ingests a conversation session, extracts decisions and action items, and saves a summary.
 */
export function createConversationSummary({ sessionId, messages = [], title = 'Strategy Session' }, tenantId = 'default') {
  if (!messages || !messages.length) return null;

  const cleanTenant = sanitizeTenantId(tenantId);
  const memory = loadPersistentMemory(cleanTenant);
  const now = new Date().toISOString();

  // Extract key phrases and content from user and assistant turns
  const userTexts = messages.filter(m => m.role === 'user').map(m => String(m.content || ''));
  const assistantTexts = messages.filter(m => m.role === 'assistant').map(m => String(m.content || ''));

  // Detect key decisions & action items
  const actionItems = [];
  const extractedFacts = [];

  for (const text of [...userTexts, ...assistantTexts]) {
    const lines = text.split('\n');
    for (const line of lines) {
      const clean = line.replace(/^[•*\-\d.]+\s*/, '').trim();
      if (!clean || clean.length < 15) continue;

      if (/\b(decided|agreed|target|goal|next step|action item|to do|plan to|prioritise|focus on)\b/i.test(clean)) {
        if (!actionItems.includes(clean) && actionItems.length < 6) {
          actionItems.push(clean);
        }
      } else if (/\b(signed|launched|closed|revenue|contract|partner|partnership|agreed)\b/i.test(clean)) {
        if (!extractedFacts.includes(clean) && extractedFacts.length < 5) {
          extractedFacts.push(clean);
        }
      }
    }
  }

  const summaryText = userTexts.length > 0
    ? `Discussion on: ${userTexts.slice(0, 3).map(t => t.slice(0, 60)).join(' | ')}`
    : 'Executive session';

  const newSummary = {
    id: `sum_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    tenantId: cleanTenant,
    sessionId: sessionId || `sess_${Date.now()}`,
    title: title.slice(0, 80),
    timestamp: now,
    summary: summaryText,
    actionItems,
    extractedFacts
  };

  memory.summaries.unshift(newSummary);
  if (memory.summaries.length > 50) memory.summaries = memory.summaries.slice(0, 50);
  memory.updatedAt = now;
  savePersistentMemory(memory, cleanTenant);

  return newSummary;
}

/**
 * Memory Retrieval Based on Relevance (Semantic Keyword / Scoring RAG)
 * Retrieves most relevant memory items based on query tokens, venture match, and tier confidence.
 * Strictly excludes superseded/archived items to prevent acting on stale data.
 */
export function retrieveRelevantMemory({ query = '', venture = null, limit = 8, sourceMemory = null }, tenantId = 'default') {
  const cleanTenant = sanitizeTenantId(tenantId);
  const memory = sourceMemory || loadPersistentMemory(cleanTenant);
  const queryTokens = tokenize(query);

  const items = Array.isArray(memory.items) ? memory.items : [];
  const activeItems = items.filter(item => item.status === 'active');

  const scored = activeItems.map(item => {
    let score = 0;
    const itemTokens = tokenize(item.text);

    // 1. Keyword match score
    for (const q of queryTokens) {
      if (itemTokens.includes(q)) score += 2.0;
      if (item.tags.some(tag => tag.includes(q))) score += 1.5;
    }

    // 2. Venture match bonus
    if (venture && item.venture.toLowerCase() === venture.toLowerCase()) {
      score += 3.0;
    }

    // 3. Query mentions venture name or alias
    for (const v of Object.values(VENTURES)) {
      const vWords = tokenize(v.name);
      const queryMatchesV = query.toLowerCase().includes(v.name.toLowerCase()) || vWords.some(vw => queryTokens.includes(vw));
      const itemMatchesV = item.venture.toLowerCase().includes(v.name.toLowerCase()) || vWords.some(vw => item.venture.toLowerCase().includes(vw));
      if (queryMatchesV && itemMatchesV) {
        score += 3.5;
      }
    }

    // 4. Tier Priority weighting: Confirmed Facts > Targets > Assumptions
    if (item.type === MEMORY_TIERS.CONFIRMED_FACT) score += 1.5;
    else if (item.type === MEMORY_TIERS.TARGET) score += 1.0;
    else if (item.type === MEMORY_TIERS.ASSUMPTION) score += 0.5;

    return { item, score };
  });

  // Sort descending by score, take top items
  scored.sort((a, b) => b.score - a.score);
  const selected = scored.slice(0, limit).map(s => s.item);

  // Group by tier
  return {
    confirmedFacts: selected.filter(i => i.type === MEMORY_TIERS.CONFIRMED_FACT),
    assumptions: selected.filter(i => i.type === MEMORY_TIERS.ASSUMPTION),
    targets: selected.filter(i => i.type === MEMORY_TIERS.TARGET),
    allRelevant: selected,
    items: selected
  };
}

/**
 * Format retrieved memory for LLM system prompt injection with clear tier separation.
 */
export function formatRelevantMemoryForPrompt(query = '', venture = null, clientDeviceMemory = null, tenantId = 'default') {
  const cleanTenant = sanitizeTenantId(tenantId);
  const memory = (clientDeviceMemory && typeof clientDeviceMemory === 'object') ? clientDeviceMemory : loadPersistentMemory(cleanTenant);
  const { confirmedFacts, assumptions, targets } = retrieveRelevantMemory({ query, venture, limit: 10, sourceMemory: memory }, cleanTenant);
  const ledger = loadLedger(cleanTenant);

  let out = `━━ PERSISTENT SOVEREIGN MEMORY HUB ━━━━━━━━━━━━━\n`;
  out += `User: ${memory.profile?.user || 'User'} (${memory.profile?.handle || cleanTenant}) · Status: Active Managing Director\n`;
  out += `Ventures: ${(memory.profile?.activeVentures || []).join(' · ')}\n\n`;

  // 1. Confirmed Facts (Ground Truth)
  if (confirmedFacts.length > 0) {
    out += `[CONFIRMED FACTS — VERIFIED GROUND TRUTH (TREAT AS REALITY)]:\n`;
    for (const f of confirmedFacts) {
      out += `• [${f.venture}] ${f.text}\n`;
    }
    out += `\n`;
  }

  // 2. Working Assumptions (Unverified hypotheses — NEVER treat as done facts)
  if (assumptions.length > 0) {
    out += `[WORKING ASSUMPTIONS & HYPOTHESES (UNVERIFIED — DO NOT STATE AS FACT)]:\n`;
    for (const a of assumptions) {
      out += `• [${a.venture}] ${a.text} (Hypothesis only)\n`;
    }
    out += `\n`;
  }

  // 3. Active Targets (Goals to achieve — not yet realized)
  if (targets.length > 0) {
    out += `[ACTIVE TARGETS & GOALS — OBJECTIVES IN PROGRESS (NOT DONE DEALS)]:\n`;
    for (const t of targets) {
      out += `• [${t.venture}] ${t.text} (Target)\n`;
    }
    out += `\n`;
  }

  // 4. Recent conversation decision/summary
  if (memory.summaries && memory.summaries.length > 0) {
    const latestSum = memory.summaries[0];
    out += `[LATEST STRATEGIC DECISIONS (${latestSum.timestamp.slice(0, 10)})]:\n`;
    if (latestSum.actionItems && latestSum.actionItems.length) {
      for (const act of latestSum.actionItems.slice(0, 3)) {
        out += `→ ${act}\n`;
      }
    }
    out += `\n`;
  }

  out += `Total Audited Ledger Transactions on File: ${ledger.records.length}\n`;
  out += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  return out;
}

/**
 * Import/Export & Backup
 */
export function exportMemoryBackup(tenantId = 'default') {
  const cleanTenant = sanitizeTenantId(tenantId);
  const memory = loadPersistentMemory(cleanTenant);
  const ledger = loadLedger(cleanTenant);

  return {
    exportVersion: 3,
    tenantId: cleanTenant,
    exportedAt: new Date().toISOString(),
    profile: memory.profile,
    memoryItems: memory.items,
    summaries: memory.summaries,
    ledgerRecords: ledger.records
  };
}

export function importMemoryBackup(backupData, mode = 'merge', tenantId = 'default') {
  if (!backupData || typeof backupData !== 'object') {
    throw new Error('Invalid backup data format: must be JSON object');
  }

  const cleanTenant = sanitizeTenantId(tenantId);
  const memory = loadPersistentMemory(cleanTenant);
  const incomingItems = Array.isArray(backupData.memoryItems) ? backupData.memoryItems : [];
  const incomingSummaries = Array.isArray(backupData.summaries) ? backupData.summaries : [];

  if (mode === 'replace') {
    memory.items = incomingItems.map(i => ({ ...i, tenantId: cleanTenant }));
    memory.summaries = incomingSummaries.map(s => ({ ...s, tenantId: cleanTenant }));
    if (backupData.profile) memory.profile = backupData.profile;
  } else {
    // Merge: add items that don't exist by id, or update if newer
    const itemMap = new Map(memory.items.map(m => [m.id, m]));
    for (const item of incomingItems) {
      const existing = itemMap.get(item.id);
      if (!existing) {
        memory.items.push({ ...item, tenantId: cleanTenant });
      } else if (item.updatedAt && existing.updatedAt && new Date(item.updatedAt) > new Date(existing.updatedAt)) {
        // Last-Write-Wins based on ISO updatedAt
        Object.assign(existing, item, { tenantId: cleanTenant });
      }
    }

    const existingSumIds = new Set(memory.summaries.map(s => s.id));
    for (const sum of incomingSummaries) {
      if (!existingSumIds.has(sum.id)) {
        memory.summaries.push({ ...sum, tenantId: cleanTenant });
      }
    }
  }

  memory.updatedAt = new Date().toISOString();
  savePersistentMemory(memory, cleanTenant);

  return {
    success: true,
    tenantId: cleanTenant,
    totalItems: memory.items.length,
    totalSummaries: memory.summaries.length,
    mode
  };
}

/**
 * Backward compatibility helpers
 */
export function addPersistentFact(text, source = 'Boss', tenantId = 'default') {
  const { item } = addMemoryItem({
    text,
    type: MEMORY_TIERS.CONFIRMED_FACT,
    source,
    allowDuplicate: false
  }, tenantId);
  return item;
}

export function deletePersistentFact(id, tenantId = 'default') {
  return deleteMemoryItem(id, tenantId);
}

export function formatPersistentMemoryForPrompt(query = '', tenantId = 'default') {
  return formatRelevantMemoryForPrompt(query, null, null, tenantId);
}

export function resetPersistentMemory(tenantId = 'default') {
  const cleanTenant = sanitizeTenantId(tenantId);
  _tenantMemoryCaches.delete(cleanTenant);
  const filePath = getMemoryFilePath(cleanTenant);
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch {}
  }
}
