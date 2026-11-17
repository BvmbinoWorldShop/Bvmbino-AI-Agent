import fs from 'fs';
import path from 'path';
import { loadLedger, VENTURES } from './business_records.js';

/**
 * Server-Side Persistent Memory Engine
 * Durable ground truth across sessions and devices.
 * Replaces synthetic hardcoded browser storage.
 */

const DATA_DIR = path.resolve(process.cwd(), '.data');
const MEMORY_FILE = path.join(DATA_DIR, 'persistent_memory.json');

let _persistentCache = null;

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
  }
}

/**
 * Load persistent memory from server-side store
 */
export function loadPersistentMemory() {
  if (_persistentCache) return _persistentCache;

  ensureStorage();
  if (fs.existsSync(MEMORY_FILE)) {
    try {
      const raw = fs.readFileSync(MEMORY_FILE, 'utf8');
      _persistentCache = JSON.parse(raw);
      if (!Array.isArray(_persistentCache.facts)) _persistentCache.facts = [];
      if (!Array.isArray(_persistentCache.notes)) _persistentCache.notes = [];
      return _persistentCache;
    } catch (e) {
      console.warn('[Memory] Failed to read memory file, initializing new:', e.message);
    }
  }

  // Initial clean state with real structural foundation and ZERO fabricated facts
  _persistentCache = {
    version: 2,
    profile: {
      user: 'Boss',
      callsign: 'Bvmbino',
      handle: 'Lataupe95',
      title: 'Founder & Managing Director',
      activeVentures: Object.values(VENTURES).map(v => v.name)
    },
    facts: [
      { id: 'f_ventures', text: 'Boss operates 4 ventures: FormationPro, Purgo Clean, Keo Jus, and Entreprise AI.', createdAt: new Date().toISOString() },
      { id: 'f_circle', text: 'Inner Circle: Poupex (CFO / Finance), Mami (Legal & Compliance), Daphne (Brand & Market), Brody (Art Direction & Decks), Zeur (Security & Systems), Coach Doobs (NBA Trainer & Athletic Performance).', createdAt: new Date().toISOString() }
    ],
    notes: [],
    updatedAt: new Date().toISOString()
  };

  savePersistentMemory(_persistentCache);
  return _persistentCache;
}

/**
 * Save persistent memory to server-side store
 */
export function savePersistentMemory(data) {
  _persistentCache = data;
  ensureStorage();
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.warn('[Memory] Failed to write memory file to disk:', e.message);
  }
}

/**
 * Add a verified fact to persistent memory
 */
export function addPersistentFact(text, source = 'Boss') {
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new Error('Fact text is required');
  }

  const memory = loadPersistentMemory();
  const clean = text.trim();

  // Deduplicate
  const exists = memory.facts.some(f => f.text.toLowerCase() === clean.toLowerCase());
  if (exists) return memory.facts.find(f => f.text.toLowerCase() === clean.toLowerCase());

  const newFact = {
    id: `fact_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    text: clean,
    source,
    createdAt: new Date().toISOString()
  };

  memory.facts.unshift(newFact);
  // Cap at 100 high-priority facts with FIFO eviction
  if (memory.facts.length > 100) memory.facts = memory.facts.slice(0, 100);
  memory.updatedAt = new Date().toISOString();
  savePersistentMemory(memory);

  return newFact;
}

/**
 * Delete a persistent fact by ID
 */
export function deletePersistentFact(id) {
  const memory = loadPersistentMemory();
  const initialLen = memory.facts.length;
  memory.facts = memory.facts.filter(f => f.id !== id);
  if (memory.facts.length !== initialLen) {
    memory.updatedAt = new Date().toISOString();
    savePersistentMemory(memory);
    return true;
  }
  return false;
}

/**
 * Format complete persistent memory for LLM system prompt injection
 */
export function formatPersistentMemoryForPrompt() {
  const memory = loadPersistentMemory();
  const ledger = loadLedger();

  let out = `━━ PERSISTENT SOVEREIGN MEMORY VAULT ━━━━━━━━━━━━━\n`;
  out += `User: ${memory.profile.user} (${memory.profile.handle})\n`;
  out += `Active Ventures: ${memory.profile.activeVentures.join(' · ')}\n\n`;

  if (memory.facts.length > 0) {
    out += `Verified Facts & Directives:\n`;
    for (const f of memory.facts.slice(0, 15)) {
      out += `• ${f.text}\n`;
    }
  }

  out += `Total Verified Ledger Entries on File: ${ledger.records.length}\n`;
  out += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  return out;
}

/**
 * Reset memory (for testing)
 */
export function resetPersistentMemory() {
  _persistentCache = null;
  if (fs.existsSync(MEMORY_FILE)) {
    try { fs.unlinkSync(MEMORY_FILE); } catch {}
  }
}
