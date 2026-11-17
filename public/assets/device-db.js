/**
 * Bvmbino Sovereign Device Database Engine
 * Real Structured Database for Phone / Browser Local Storage (IndexedDB + Storage Fallback)
 * Zero dependency · Offline-First · Persistent Across Mobile Restarts
 */

const DB_NAME = 'BvmbinoDeviceStore';
const DB_VERSION = 1;

let _dbPromise = null;

function openDb() {
  if (_dbPromise) return _dbPromise;

  _dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      console.warn('[DeviceDB] IndexedDB not available, falling back to localStorage');
      resolve(null);
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      // 1. Memory Items Store
      if (!db.objectStoreNames.contains('memory_items')) {
        const memStore = db.createObjectStore('memory_items', { keyPath: 'id' });
        memStore.createIndex('type', 'type', { unique: false });
        memStore.createIndex('venture', 'venture', { unique: false });
        memStore.createIndex('status', 'status', { unique: false });
        memStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // 2. Ledger Records Store
      if (!db.objectStoreNames.contains('ledger_records')) {
        const ledStore = db.createObjectStore('ledger_records', { keyPath: 'id' });
        ledStore.createIndex('verificationStatus', 'verificationStatus', { unique: false });
        ledStore.createIndex('venture', 'venture', { unique: false });
        ledStore.createIndex('date', 'date', { unique: false });
      }

      // 3. Conversation Summaries Store
      if (!db.objectStoreNames.contains('chat_summaries')) {
        const sumStore = db.createObjectStore('chat_summaries', { keyPath: 'id' });
        sumStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // 4. KV Store (Config, Sync State)
      if (!db.objectStoreNames.contains('kv_store')) {
        db.createObjectStore('kv_store', { keyPath: 'key' });
      }
    };

    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => {
      console.warn('[DeviceDB] Failed to open IndexedDB:', e.target.error);
      resolve(null);
    };
  });

  return _dbPromise;
}

// Fallback to localStorage if IndexedDB is not active
function getLocalFallback(key) {
  try {
    const raw = localStorage.getItem(`bv_db_${key}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalFallback(key, val) {
  try {
    localStorage.setItem(`bv_db_${key}`, JSON.stringify(val));
  } catch {}
}

export const SovereignDeviceDB = {
  /**
   * Save or update a memory item into user device database
   */
  async putMemoryItem(item) {
    if (!item || !item.id) return;
    const db = await openDb();
    if (!db) {
      const items = getLocalFallback('memory_items');
      const idx = items.findIndex(i => i.id === item.id);
      if (idx >= 0) items[idx] = item;
      else items.unshift(item);
      setLocalFallback('memory_items', items);
      return item;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction('memory_items', 'readwrite');
      const store = tx.objectStore('memory_items');
      const req = store.put(item);
      req.onsuccess = () => resolve(item);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Get all memory items from user device database
   */
  async getAllMemoryItems() {
    const db = await openDb();
    if (!db) return getLocalFallback('memory_items');

    return new Promise((resolve, reject) => {
      const tx = db.transaction('memory_items', 'readonly');
      const store = tx.objectStore('memory_items');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Delete memory item by ID
   */
  async deleteMemoryItem(id) {
    const db = await openDb();
    if (!db) {
      const items = getLocalFallback('memory_items').filter(i => i.id !== id);
      setLocalFallback('memory_items', items);
      return true;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction('memory_items', 'readwrite');
      const store = tx.objectStore('memory_items');
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Save or update a business ledger record into user device database
   */
  async putLedgerRecord(record) {
    if (!record || !record.id) return;
    const db = await openDb();
    if (!db) {
      const records = getLocalFallback('ledger_records');
      const idx = records.findIndex(r => r.id === record.id);
      if (idx >= 0) records[idx] = record;
      else records.unshift(record);
      setLocalFallback('ledger_records', records);
      return record;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction('ledger_records', 'readwrite');
      const store = tx.objectStore('ledger_records');
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Get all ledger records from user device database
   */
  async getAllLedgerRecords() {
    const db = await openDb();
    if (!db) return getLocalFallback('ledger_records');

    return new Promise((resolve, reject) => {
      const tx = db.transaction('ledger_records', 'readonly');
      const store = tx.objectStore('ledger_records');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Delete ledger record by ID
   */
  async deleteLedgerRecord(id) {
    const db = await openDb();
    if (!db) {
      const records = getLocalFallback('ledger_records').filter(r => r.id !== id);
      setLocalFallback('ledger_records', records);
      return true;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction('ledger_records', 'readwrite');
      const store = tx.objectStore('ledger_records');
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Save a conversation summary into user device database
   */
  async putSummary(summary) {
    if (!summary || !summary.id) return;
    const db = await openDb();
    if (!db) {
      const sums = getLocalFallback('chat_summaries');
      sums.unshift(summary);
      setLocalFallback('chat_summaries', sums.slice(0, 50));
      return summary;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction('chat_summaries', 'readwrite');
      const store = tx.objectStore('chat_summaries');
      const req = store.put(summary);
      req.onsuccess = () => resolve(summary);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Get all conversation summaries from user device database
   */
  async getAllSummaries() {
    const db = await openDb();
    if (!db) return getLocalFallback('chat_summaries');

    return new Promise((resolve, reject) => {
      const tx = db.transaction('chat_summaries', 'readonly');
      const store = tx.objectStore('chat_summaries');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Export complete device database snapshot
   */
  async exportSnapshot() {
    const [memoryItems, ledgerRecords, summaries] = await Promise.all([
      this.getAllMemoryItems(),
      this.getAllLedgerRecords(),
      this.getAllSummaries()
    ]);

    return {
      exportedAt: new Date().toISOString(),
      platform: 'bvmbino-device-indexeddb',
      version: 1,
      memoryItems,
      ledgerRecords,
      summaries
    };
  },

  /**
   * Import snapshot into user device database (merge or replace)
   */
  async importSnapshot(snapshot, mode = 'merge') {
    if (!snapshot || typeof snapshot !== 'object') {
      throw new Error('Invalid snapshot format');
    }

    const incomingItems = Array.isArray(snapshot.memoryItems) ? snapshot.memoryItems : [];
    const incomingRecords = Array.isArray(snapshot.ledgerRecords) ? snapshot.ledgerRecords : [];
    const incomingSummaries = Array.isArray(snapshot.summaries) ? snapshot.summaries : [];

    if (mode === 'replace') {
      // Clear stores
      const db = await openDb();
      if (db) {
        const tx = db.transaction(['memory_items', 'ledger_records', 'chat_summaries'], 'readwrite');
        tx.objectStore('memory_items').clear();
        tx.objectStore('ledger_records').clear();
        tx.objectStore('chat_summaries').clear();
        await new Promise(r => { tx.oncomplete = r; });
      } else {
        setLocalFallback('memory_items', []);
        setLocalFallback('ledger_records', []);
        setLocalFallback('chat_summaries', []);
      }
    }

    for (const item of incomingItems) await this.putMemoryItem(item);
    for (const rec of incomingRecords) await this.putLedgerRecord(rec);
    for (const sum of incomingSummaries) await this.putSummary(sum);

    return {
      success: true,
      importedItems: incomingItems.length,
      importedRecords: incomingRecords.length,
      mode
    };
  }
};

if (typeof window !== 'undefined') {
  window.SovereignDeviceDB = SovereignDeviceDB;
}

export default SovereignDeviceDB;
