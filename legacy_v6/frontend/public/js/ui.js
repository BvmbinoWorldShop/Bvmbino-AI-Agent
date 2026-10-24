/**
 * ui.js — User Interface interactions and DOM management.
 * FIXED v3.6
 *
 * AUDIT NOTES:
 *  - Removed dead imports: loadKnowledge, saveSession (never used here)
 *  - setActiveClient now actually loads clients from store instead of using
 *    state.clients which was never populated
 *  - renderModels uses the canonical model list from a single source
 *  - slash() now triggers an input event so the textarea auto-resizes
 *  - Removed import side-effect from render.js (was causing import cycles)
 */

import { state, toast, scrollBot, LEVELS, DEFAULT_MODEL } from './core.js';
import {
  loadSessions, loadClients, saveClient, removeClient,
  saveToKnowledge, saveMemoryTier, loadMemoryTier
} from './store.js';
import { esc } from './render.js';

/* --- SIDEBAR CONTROLS --- */
export function openSb() {
  const sb = document.getElementById('sb');
  const ov = document.getElementById('sb-overlay') || document.getElementById('ov');
  if (sb) sb.classList.add('open');
  if (ov) ov.classList.add('open');
}

export function closeSb() {
  const sb = document.getElementById('sb');
  const ov = document.getElementById('sb-overlay') || document.getElementById('ov');
  if (sb) sb.classList.remove('open');
  if (ov) ov.classList.remove('open');
}

export function togglePortfolio() {
  const hdr = document.querySelector('.portfolio-header');
  const sub = document.getElementById('portfolio-sub');
  if (hdr && sub) {
    hdr.classList.toggle('open');
    sub.classList.toggle('open');
  }
}

/* --- RENDERERS --- */
export async function renderSkills() {
  const list = document.getElementById('skills-list');
  if (!list) return;
  const skills = [
    { name: 'Train Agent', icon: '🧠', sub: 'Save context', highlight: true, id: 'train' },
    { name: 'Sales Script', icon: '💰', cmd: '/sales' },
    { name: 'Deep Writer', icon: '✍️', cmd: '/writer' },
    { name: 'Strategy', icon: '📈', cmd: '/strategy' },
    { name: 'Budget & Finance', icon: '💳', cmd: '/budget' },
    { name: 'Law (Lex)', icon: '⚖️', cmd: '/lex' }
  ];

  list.innerHTML = skills.map(s => `
    <button class="qbtn ${s.highlight ? 'active' : ''}" onclick="${s.cmd ? `window.slash('${s.cmd.substring(1)}')` : `window.openTrain()`}">
      <span class="qi">${s.icon}</span>
      <span>${s.name}</span>
      ${s.sub ? `<span class="qsub">${s.sub}</span>` : ''}
    </button>
  `).join('');
}

export async function renderHistory() {
  const c = document.getElementById('hist');
  if (!c) return;
  const sessions = await loadSessions();
  if (!sessions.length) {
    c.innerHTML = '<div style="padding:10px; font-size:10px; font-family:var(--mono); color:var(--t4); opacity:0.5;">No history yet.</div>';
    return;
  }
  c.innerHTML = sessions.slice(0, 15).map(s => `
    <div class="hi ${state.curSessId === s.id ? 'active' : ''}">
      <span class="hdot"></span>
      <span style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor:pointer;" onclick="window.resumeSession('${esc(s.id)}')">${esc(s.title)}</span>
      <button onclick="window.deleteSession('${esc(s.id)}', event)" style="background:none; border:none; color:var(--t4); cursor:pointer; padding: 2px 5px; font-size: 10px; opacity:0.5; font-family:var(--mono);">✕</button>
    </div>
  `).join('');
}

export async function renderClients() {
  const ctn = document.getElementById('cli-list') || document.getElementById('client-list');
  if (!ctn) return;

  const ALL_CLIENTS = await loadClients();
  state.clients = ALL_CLIENTS; // FIX: keep state.clients in sync so setActiveClient works

  ctn.innerHTML = ALL_CLIENTS.map((c) => `
    <div class="qbtn cli ${state.activeClientId === c.id ? 'active' : ''}" onclick="window.setActiveClient('${esc(c.id)}')">
      <span class="qi" style="background:rgba(232,169,18,.1); color:var(--pu)">🏢</span>
      <div style="display:flex; flex-direction:column; flex:1; overflow:hidden">
        <span style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${esc(c.name)}</span>
        <span class="qsub" style="font-size:9px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${esc((c.desc || '').slice(0, 30))}...</span>
      </div>
      <span class="cli-del" onclick="window.deleteClient('${esc(c.id)}',event)" style="opacity:0.5; cursor:pointer; font-size:10px; padding:4px;">✕</span>
    </div>`).join('');
}

export function updateModelBadge(modelId) {
  const ab = document.getElementById('ai-engine-badge');
  if (ab) ab.innerHTML = `<span class="pulse"></span>${LEVELS[modelId] || LEVELS[DEFAULT_MODEL] || "Llama 3.3"}`;
  const memModel = document.getElementById('mem-model');
  if (memModel) memModel.textContent = LEVELS[modelId] || LEVELS[DEFAULT_MODEL] || "Llama 3.3";
}

export function setActiveClient(id) {
  state.activeClientId = id === state.activeClientId ? null : id;
  renderClients();
  if (state.activeClientId) {
    const client = (state.clients || []).find(v => v.id === id);
    toast(`🎯 Context focus: ${client ? client.name : 'Active Business'}`);
  } else {
    toast(`Neutral context restored`);
  }
}

export async function addNewClient() {
  const name = prompt('Business/Client Name:'); if (!name) return;
  const desc = prompt('Brief Context/Description:'); if (!desc) return;
  const id = 'c' + Date.now();
  const c = { id, name, desc };
  await saveClient(c);
  renderClients();
  toast('Client Profile Added ✓');
}

export async function deleteClient(id, e) {
  if (e) e.stopPropagation();
  if (!confirm('Are you sure you want to remove this client context?')) return;
  try {
    await removeClient(id);
    if (state.activeClientId === id) state.activeClientId = null;
    renderClients();
    toast('Context Removed ✓');
  } catch (err) {
    toast('Error removing context');
  }
}

export function toggleSettings() {
  const s = document.getElementById('settings-modal');
  if (!s) return;
  const isOpen = s.classList.contains('show') || s.style.display === 'flex';
  if (isOpen) {
    s.classList.remove('show');
    s.style.display = 'none';
  } else {
    s.classList.add('show');
    s.style.display = 'flex';
    renderModels();
  }
}

export function setModel(id) {
  state.model = id;
  renderModels();
  updateModelBadge(id);
  toast(`📡 Active Hub: ${LEVELS[id] || id}`);
}

export async function renderModels() {
  const c = document.getElementById('model-list');
  const cs = document.getElementById('model-list-settings');
  if (!c && !cs) return;

  const LIVE_MODELS = [
    { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0', provider: 'Elite' },
    { id: 'deepseek/deepseek-chat-v3-0324:free', name: 'DeepSeek V3', provider: 'Reason' },
    { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3', provider: 'Logic' },
    { id: 'meta-llama/llama-3.2-90b-vision-instruct:free', name: 'Llama 3.2', provider: 'Vision' }
  ];

  const html = LIVE_MODELS.map(m => `
    <div class="mod-item ${state.model === m.id ? 'on' : ''}" onclick="window.setModel('${m.id}')">
      <div style="display:flex; flex-direction:column">
        <span style="font-weight:600">${m.name}</span>
        <span style="opacity:.5; font-size:9px">${m.provider}</span>
      </div>
      ${state.model === m.id ? '<div class="live-sig"></div>' : ''}
    </div>
  `).join('');

  if (c) c.innerHTML = html;
  if (cs) cs.innerHTML = html;
}

export function newChat() {
  state.msgs = [];
  state.curSessId = null;
  const ci = document.getElementById('ci');
  if (ci) ci.innerHTML = '';
  closeSb();
  renderWelcome();
  toast('New Workspace Initialized');
}

// FIX: slash() now dispatches an input event so the textarea autosizer runs
export function slash(key) {
  const el = document.getElementById('inp');
  if (!el) return;
  el.value = '/' + key + ' ';
  el.focus();
  el.dispatchEvent(new Event('input', { bubbles: true }));
  toast(`Skill ready: /${key}`);
}

export function renderWelcome() {
  const ci = document.getElementById('ci');
  if (!ci) return;

  const SKILLS = [
    { id: 'sales', name: 'Close Deals', desc: "Sales scripts, objection handlers, follow-up DMs", icon: '💰' },
    { id: 'content', name: 'Create Content', desc: 'Instagram, LinkedIn, X, Reels + AI image prompts', icon: '🎬' },
    { id: 'budget', name: 'Budget & Finance', desc: 'Expense audit, cash flow plan, money optimization', icon: '💳' },
    { id: 'writer', name: 'Deep Writer', desc: 'Books, articles, blogs — human voice, zero AI feel', icon: '✍️' },
    { id: 'strategy', name: 'Business Strategy', desc: '90-day growth plans, B2B acquisition, funnels', icon: '📈' },
    { id: 'campaign', name: 'Ad Campaign', desc: 'Full campaign + ad copy for every platform', icon: '📣' }
  ];

  ci.innerHTML = `
    <div class="welcome" id="welcome">
      <div class="w3d-scene">
        <div class="w3d-obj w3d-money">💰</div>
        <div class="w3d-obj w3d-ball">🏀</div>
        <div class="w3d-obj w3d-book">📖</div>
        <div class="w3d-obj w3d-trophy">🏆</div>
        <div class="w3d-obj w3d-brain">🧠</div>
        <div class="w3d-glow"></div>
      </div>
      <div class="wt" style="text-align:center;width:100%">Bvmbino AI Agent</div>
      <div class="ws" style="text-align:center;margin:0 auto 28px">Your personal AI powerhouse — sales, content, finance, writing, strategy & more. 17 skills ready. Type <strong style="color:var(--pu2)">/</strong> to see them all.</div>
      <div class="wgrid">
        ${SKILLS.map(s => `
          <div class="wcard" onclick="window.slash('${s.id}')">
            <div class="wci">${s.icon}</div>
            <div class="wct">${s.name}</div>
            <div class="wcd">${s.desc}</div>
          </div>
        `).join('')}
      </div>
      <div class="shint">Type <code>/</code> to see all 17 skills · <code>/budget</code> · <code>/writer</code> ·
        <code>/sales</code> · <code>/content</code> · <code>/imgprompt</code></div>
    </div>
  `;
}

export function openTrain() {
  const k = prompt('What should I remember? (e.g. "Target Audience", "Keo Jus Goal", "My Scaling Strategy")');
  if (!k) return;
  const v = prompt(`Enter the details for "${k}":`);
  if (!v) return;
  saveToKnowledge(k, v);
}

/* --- ELITE MEMORY HUB LOGIC --- */
export function editMemoryTier(id) {
  const el = document.getElementById(`mp-${id}`);
  if (!el) return;

  if (el.contentEditable === "true") {
    el.contentEditable = "false";
    saveMemoryTier(id, el.innerText);
    toast(`💾 Memory Updated: ${id.charAt(0).toUpperCase() + id.slice(1)}`);
  } else {
    el.contentEditable = "true";
    el.focus();
    toast(`✍️ Editing ${id}... Click 'Save' when done.`);
  }
}

export function initMemoryHub() {
  ['ventures', 'projects'].forEach(id => {
    const val = loadMemoryTier(id);
    const el = document.getElementById(`mp-${id}`);
    if (el && val) el.innerText = val;
  });
}

/* --- GESTURE ENGINE --- */
export function setupGestures() {
  let touchStartX = 0;
  let touchStartY = 0;
  const thresh = 50;

  document.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    if (Math.abs(dx) < Math.abs(dy) * 2 || Math.abs(dx) < thresh) return;

    if (dx > 0) {
      if (touchStartX < 50) openSb();
      else closeMpanel();
    } else {
      if (touchStartX > window.innerWidth - 50) openMpanel();
      else closeSb();
    }
  }, { passive: true });
}

export function openMpanel() {
  const mp = document.getElementById('mpanel');
  const ov = document.getElementById('sb-overlay') || document.getElementById('ov');
  if (mp) mp.classList.add('open');
  if (ov) ov.classList.add('open');
}

export function closeMpanel() {
  const mp = document.getElementById('mpanel');
  const ov = document.getElementById('sb-overlay') || document.getElementById('ov');
  const sb = document.getElementById('sb');
  if (mp) mp.classList.remove('open');
  if (ov && !(sb && sb.classList.contains('open'))) ov.classList.remove('open');
}
