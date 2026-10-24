/**
 * ui.js - User Interface interactions and DOM management.
 */

import { state, toast, scrollBot, LEVELS } from './core.js';
import { loadSessions, loadClients, loadKnowledge } from './store.js';
import { esc } from './render.js';

export function openSb() { 
  document.getElementById('sb').classList.add('open'); 
  document.getElementById('ov').classList.add('open'); 
}

export function closeSb() { 
  document.getElementById('sb').classList.remove('open'); 
  document.getElementById('ov').classList.remove('open'); 
}

export function toggleTools() {
  const p = document.getElementById('toolsPanel');
  const a = document.getElementById('tools-arrow');
  if (!p) return;
  const isOpen = p.style.maxHeight !== '0px';
  p.style.maxHeight = isOpen ? '0px' : '2000px';
  if (a) a.style.transform = isOpen ? 'rotate(-90deg)' : 'rotate(0deg)';
  localStorage.setItem('tools_open', isOpen ? '0' : '1');
}

export function toggleHistory() {
  const h = document.getElementById('hist');
  const a = document.getElementById('hist-arrow');
  if (!h) return;
  const isOpen = h.style.maxHeight !== '0px';
  h.style.maxHeight = isOpen ? '0px' : '2000px';
  if (a) a.style.transform = isOpen ? 'rotate(-90deg)' : 'rotate(0deg)';
  localStorage.setItem('hist_open', isOpen ? '0' : '1');
}

export async function renderHistory() {
  const hist = document.getElementById('hist');
  if (!hist) return;
  const sessions = await loadSessions();
  if (!sessions.length) {
    hist.innerHTML = '<div style="padding:8px 10px 4px;font-size:10px;font-family:var(--mono);color:var(--t4)">No saved conversations</div>';
    return;
  }
  hist.innerHTML = sessions.map(s => `
    <div class="hi" style="display:flex;align-items:center;gap:6px;position:relative" id="hi-${s.id}">
      <span class="hdot"></span>
      <span class="hi-title" onclick="resumeSession(${s.id})" title="Click to resume" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer">${esc(s.title)}</span>
      <button onclick="deleteSession(${s.id},event)" title="Delete" style="opacity:0;font-size:10px;background:none;border:none;color:var(--t3);cursor:pointer;padding:2px 5px;flex-shrink:0;transition:opacity .1s" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0">✕</button>
    </div>
  `).join('');
}

export async function renderClients() {
  const ctn = document.getElementById('client-list');
  if (!ctn) return;
  const list = await loadClients();
  
  const svgs = [
    `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>`,
    `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>`,
    `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>`
  ];

  ctn.innerHTML = list.map((c, i) => `
    <div class="qbtn cli ${state.activeClientId === c.id ? 'active' : ''}" id="cli-${c.id}" onclick="setActiveClient('${c.id}')">
      <span class="qi" style="background:rgba(232,169,18,.1);color:var(--pu)">${svgs[i % svgs.length]}</span>
      <div style="display:flex;flex-direction:column;flex:1;overflow:hidden">
        <span style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.name)}</span>
        <span class="qsub" style="font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.desc.slice(0, 30))}...</span>
      </div>
      <span class="cli-del" onclick="deleteClient('${c.id}',event)">✕</span>
    </div>`).join('');
}

export function updateModelBadge(modelId) {
  const mb = document.getElementById('mbadge');
  const ab = document.getElementById('ai-engine-badge');
  if (mb) mb.textContent = LEVELS[modelId] || "Llama 3.3";
  if (ab) ab.innerHTML = `<span class="pulse"></span>${LEVELS[modelId] || "Llama 3.3"}`;
}

export function setActiveClient(id) {
  state.activeClientId = id === state.activeClientId ? null : id;
  document.querySelectorAll('.cli').forEach(el => el.classList.toggle('active', el.id === 'cli-' + id));
  const cname = state.activeClientId ? "Selected Client" : 'None';
  toast(state.activeClientId ? `🎯 Active Context Updated` : `Context Cleared`);
}

export async function addNewClient() {
  const name = prompt('Business/Client Name:'); if (!name) return;
  const desc = prompt('Brief Context/Description:'); if (!desc) return;
  const id = 'c' + Date.now();
  const c = { id, name, desc };
  const { saveClient } = await import('./store.js');
  await saveClient(c);
  renderClients();
  toast('Client Profile Added ✓');
}

export async function deleteClient(id, e) {
  if (e) e.stopPropagation();
  if (!confirm('Delete this client profile?')) return;
  const { removeClient } = await import('./store.js');
  await removeClient(id);
  if (state.activeClientId === id) state.activeClientId = null;
  renderClients();
  toast('Deleted ✓');
}

export function toggleSettings() {
  const s = document.getElementById('settings-modal');
  if (!s) return;
  const isOpen = s.style.display === 'flex';
  s.style.display = isOpen ? 'none' : 'flex';
}

export function toggleTranslation() {
  state.translationOn = !state.translationOn;
  const btn = document.getElementById('top-trans');
  if (btn) btn.style.color = state.translationOn ? 'var(--pu2)' : 'var(--t3)';
  toast(`Instant Translation: ${state.translationOn ? 'ON' : 'OFF'}`);
}

export function setModel(id) {
  state.model = id;
  renderModels(); // Need to implement/migrate this too
  updateModelBadge(id);
  toast(`📡 Active Hub: ${LEVELS[id] || id}`);
}

export async function renderModels() {
  const c = document.getElementById('model-list');
  if (!c) return;
  // This was hardcoded in index.html, moving to config/core.js potentially, 
  // but for now let's use what we have.
  const LIVE_MODELS = [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', provider: 'Groq' },
    { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash', provider: 'OpenRouter' },
    { id: 'deepseek/deepseek-chat-v3-0324:free', name: 'DeepSeek V3', provider: 'OpenRouter' },
    { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B Pro', provider: 'OpenRouter' }
  ];
  
  c.innerHTML = LIVE_MODELS.map(m => `
    <div class="mod-item ${state.model === m.id ? 'on' : ''}" onclick="setModel('${m.id}')">
      <div style="display:flex;flex-direction:column">
        <span style="font-weight:600">${m.name}</span>
        <span style="opacity:.5;font-size:9px">${m.provider}</span>
      </div>
      ${state.model === m.id ? '<div class="live-sig"></div>' : ''}
    </div>
  `).join('');
}

export function toggleClients() {
  const p = document.getElementById('client-panel');
  const a = document.getElementById('client-arrow');
  if (!p) return;
  const isOpen = p.style.maxHeight !== '0px';
  p.style.maxHeight = isOpen ? '0px' : '2000px';
  if (a) a.style.transform = isOpen ? 'rotate(-90deg)' : 'none';
}

export function newChat() {
  const { saveSession } = import('./store.js');
  if (state.msgs.length) saveSession(document.getElementById('tbtitle').textContent);
  state.msgs = [];
  state.tokens = 1840;
  state.curSessId = null;
  document.getElementById('tbtitle').textContent = 'New conversation';
  document.getElementById('ci').innerHTML = '<!-- Welcome content added by main.js -->';
  closeSb();
  toast('New conversation · Ctrl+K');
  
  // Re-render welcome (this should really be a component function)
  window.renderWelcome && window.renderWelcome();
}

export function openTrain() {
  const k = prompt('What should I remember? (e.g. "Target Audience", "Keo Jus Goal")');
  if (!k) return;
  const v = prompt(`Enter the details for "${k}":`);
  if (!v) return;
  const { saveToKnowledge } = import('./store.js');
  saveToKnowledge(k, v);
}

export function slash(key) {
  const el = document.getElementById('inp');
  if (!el) return;
  el.value = '/' + key + ' '; el.focus();
  window.onInp && window.onInp();
  toast(`Using Skill: /${key}`);
}

// Global scope attachment for legacy compatibility during refactor
window.openSb = openSb;
window.closeSb = closeSb;
window.toggleTools = toggleTools;
window.toggleHistory = toggleHistory;
window.setActiveClient = setActiveClient;
window.addNewClient = addNewClient;
window.deleteClient = deleteClient;
window.toggleSettings = toggleSettings;
window.toggleTranslation = toggleTranslation;
window.setModel = setModel;
window.toggleClients = toggleClients;
window.newChat = newChat;
window.openTrain = openTrain;
window.slash = slash;
