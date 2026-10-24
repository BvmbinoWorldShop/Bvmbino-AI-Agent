/**
 * store.js - IndexedDB and LocalStorage handlers for Bvmbino AI.
 */

import { state, toast } from './core.js';

const DB_NAME = 'BvmbinoDB';
const STORE_SESS = 'sessions';
const STORE_KNOW = 'knowledge';
const STORE_CLIS = 'clients';

export async function getDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 3);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_SESS)) db.createObjectStore(STORE_SESS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_KNOW)) db.createObjectStore(STORE_KNOW, { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains(STORE_CLIS)) db.createObjectStore(STORE_CLIS, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.target.result);
    req.onerror = () => reject(req.error);
  });
}

export const initDB = getDB;

// --- Sessions ---
export async function getSession(id) {
  const db = await getDB();
  return new Promise(res => {
    const tx = db.transaction(STORE_SESS, 'readonly');
    const req = tx.objectStore(STORE_SESS).get(id);
    req.onsuccess = () => res(req.result);
    req.onerror = () => res(null);
  });
}
export async function loadSessions() {
  const db = await getDB();
  return new Promise(res => {
    const tx = db.transaction(STORE_SESS, 'readonly');
    const req = tx.objectStore(STORE_SESS).getAll();
    req.onsuccess = () => res(req.result.sort((a,b) => b.updatedAt - a.updatedAt));
    req.onerror = () => res([]);
  });
}

export async function saveSession(title) {
  if (!state.msgs.length) return;
  const db = await getDB();
  const id = state.curSessId || Date.now();
  const session = { id, title: title || 'Untitled', msgs: state.msgs, updatedAt: Date.now() };
  const tx = db.transaction(STORE_SESS, 'readwrite');
  tx.objectStore(STORE_SESS).put(session);
  state.curSessId = id;
}

export async function deleteSession(id, e) {
  if (e) e.stopPropagation();
  if (!confirm('Delete this conversation?')) return;
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_SESS, 'readwrite');
    tx.objectStore(STORE_SESS).delete(id);
    tx.oncomplete = () => {
      if (state.curSessId === id) window.location.reload();
      else window.renderHistory(); 
    };
  } catch (e) { toast('Error deleting session'); }
}

// --- Knowledge ---
export async function loadKnowledge() {
  const db = await getDB();
  return new Promise(res => {
    const tx = db.transaction(STORE_KNOW, 'readonly');
    const req = tx.objectStore(STORE_KNOW).getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = () => res([]);
  });
}

export async function saveToKnowledge(key, val) {
  const db = await getDB();
  const tx = db.transaction(STORE_KNOW, 'readwrite');
  tx.objectStore(STORE_KNOW).add({ key, val, date: Date.now() });
}

// --- Clients ---
export async function loadClients() {
  try {
    const db = await getDB();
    return new Promise(res => {
      const tx = db.transaction(STORE_CLIS, 'readonly');
      const req = tx.objectStore(STORE_CLIS).getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => res([]);
    });
  } catch (e) { return []; }
}

export async function saveClient(client) {
  if (!client.id) return;
  const db = await getDB();
  const tx = db.transaction(STORE_CLIS, 'readwrite');
  tx.objectStore(STORE_CLIS).put(client);
}

export async function removeClient(id) {
  const db = await getDB();
  const tx = db.transaction(STORE_CLIS, 'readwrite');
  tx.objectStore(STORE_CLIS).delete(id);
}

export async function saveVaultKey() {
  const k = document.getElementById('vault-key-input')?.value.trim();
  if (!k) return;
  localStorage.setItem('bvmbino_vault_key', k);
  toast('Vault Key Secured 🔐');
}

export function updateParam(key, val) {
  if (key === 'temp') state.config.temp = parseFloat(val);
  localStorage.setItem('v4_' + key, val);
  const disp = document.getElementById('temp-val');
  if (disp) disp.textContent = val;
}

export function saveMemoryTier(tier, text) {
  localStorage.setItem('vctx_' + tier, text);
  toast(`Memory Hub: ${tier} updated`);
}
