/**
 * ui.js - User Interface interactions and DOM management.
 */

import { state, toast, scrollBot, MODELS } from './core.js';
import { loadSessions, getSession, loadClients, saveClient, removeClient, saveToKnowledge } from './store.js';
import { esc, mdHtml } from './render.js';

export function openSb() {
  document.getElementById('sb').classList.add('open');
  document.getElementById('ov').classList.add('open');
  localStorage.setItem('bvmbino_sb_left_collapsed', 'false');
}

export function closeSb() {
  document.getElementById('sb').classList.remove('open');
  document.getElementById('ov').classList.remove('open');
  localStorage.setItem('bvmbino_sb_left_collapsed', 'true');
}

export function toggleMpanel(force) {
  const mp = document.getElementById('mpanel');
  if (!mp) return;
  const isClosed = mp.classList.contains('collapsed');
  const target = force !== undefined ? !force : !isClosed;
  mp.classList.toggle('collapsed', target);
  localStorage.setItem('bvmbino_sb_right_collapsed', target ? 'true' : 'false');
}

export function openMpanel() { toggleMpanel(true); }
export function closeMpanel() { toggleMpanel(false); }

export function toggleLeftSidebar() {
  const sb = document.getElementById('sb');
  if (!sb) return;
  const isClosed = sb.classList.contains('collapsed');
  if (isClosed) openSb(); else closeSb();
}

export function toggleRightSidebar() {
  toggleMpanel();
}

export async function resumeSession(id) {
  const entry = await getSession(id);
  if (!entry) return;
  state.msgs = [...(entry.msgs || [])];
  state.curSessId = entry.id;

  const ci = document.getElementById('ci');
  if (ci) ci.innerHTML = '';
  const tb = document.getElementById('tbtitle');
  if (tb) tb.textContent = entry.title || 'Conversation';

  const { renderWelcome, addUserMsg } = await import('./render.js');
  renderWelcome(false);
  state.msgs.forEach(m => addUserMsg(m.content, m.role === 'user', true));
  scrollBot();
  toast('Session Resumed ⚡');
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
  const isClosed = h.style.maxHeight === '0px';
  const target = !isClosed;
  h.style.maxHeight = target ? '0px' : '2000px';
  if (a) a.style.transform = target ? 'rotate(-90deg)' : 'none';
  localStorage.setItem('bv_collapse_hist', target ? 'true' : 'false');
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
        <span class="qsub" style="font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc((c.desc || '').slice(0, 30))}...</span>
      </div>
      <span class="cli-del" onclick="deleteClient('${c.id}',event)">✕</span>
    </div>`).join('');
}

export function updateModelBadge(modelId) {
  const mb = document.getElementById('mbadge');
  const ab = document.getElementById('ai-engine-badge');
  const label = MODELS[modelId] || modelId;
  if (mb) mb.textContent = label;
  if (ab) ab.innerHTML = `<span class="pulse"></span>${label}`;
}

export function setActiveClient(id) {
  state.activeClientId = id === state.activeClientId ? null : id;
  document.querySelectorAll('.cli').forEach(el => el.classList.toggle('active', el.id === 'cli-' + id));
  toast(state.activeClientId ? `🎯 Active Context Updated` : `Context Cleared`);
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
  if (!confirm('Delete this client profile?')) return;
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
  localStorage.setItem('v3_model', id);
  renderModels();
  updateModelBadge(id);
  toast(`📡 Active Hub: ${MODELS[id] || id}`);
}

export async function renderModels() {
  const c = document.getElementById('model-list');
  if (!c) return;
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
  const isClosed = p.style.maxHeight === '0px';
  const target = !isClosed;
  p.style.maxHeight = target ? '0px' : '2000px';
  if (a) a.style.transform = target ? 'rotate(-90deg)' : 'none';
  localStorage.setItem('bv_collapse_client-panel', target ? 'true' : 'false');
}

export async function newChat() {
  const { saveSession } = await import('./store.js');
  const { renderWelcome } = await import('./render.js');
  if (state.msgs.length) saveSession(document.getElementById('tbtitle').textContent);
  state.msgs = [];
  state.tokens = 1840;
  state.curSessId = null;
  document.getElementById('tbtitle').textContent = 'New conversation';
  const ci = document.getElementById('ci');
  if (ci) ci.innerHTML = '';
  closeSb();
  toast('New conversation · Ctrl+K');
  renderWelcome();
}

export function toggleModal(id, force) {
  const mod = document.getElementById(id);
  if (!mod) return;
  const isClosed = !mod.classList.contains('open');
  const target = force !== undefined ? force : isClosed;
  mod.classList.toggle('open', target);
  if (target) {
    const input = mod.querySelector('input, textarea');
    if (input) input.focus();
  }
}

export function editMemoryTier(tier) {
  toast(`Editing ${tier} configuration`);
}

export function openTrain() {
  const k = prompt('What should I remember? (e.g. "Target Audience", "Keo Jus Goal")');
  if (!k) return;
  const v = prompt(`Enter the details for "${k}":`);
  if (!v) return;
  import('./store.js').then(m => m.saveToKnowledge(k, v));
}

export function slash(key) {
  const el = document.getElementById('inp');
  if (!el) return;
  el.value = '/' + key + ' '; el.focus();
  // window.onInp && window.onInp(); // Handled by event listener now
  toast(`Using Skill: /${key}`);
}

export function exportLastMd() {
  const last = state.msgs.filter(m => m.role === 'assistant').pop();
  if (!last) { toast('No content to export'); return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([last.content], { type: 'text/markdown' }));
  a.download = `bvmbino-${Date.now()}.md`;
  a.click();
  toast('Markdown downloaded ✓');
}

export function exportTranscript() {
  if (!state.msgs.length) { toast('No chat history to export'); return; }
  let md = `# BVMBINO AI · Strategic Transcript\n`;
  md += `*Generated: ${new Date().toLocaleString()}*\n`;
  md += `*Model: ${state.model}*\n\n---\n\n`;

  state.msgs.forEach(m => {
    const role = m.role === 'user' ? 'BOSS' : 'BILLY';
    md += `### [${role}]\n${m.content}\n\n`;
  });

  md += `---\n*End of Sovereign Transcript · v5.7*`;

  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
  a.download = `bvmbino-transcript-${Date.now()}.md`;
  a.click();
  toast('Full transcript exported ✓');
}

export function handleFiles(files) {
  if (!files.length) return;
  const strip = document.getElementById('file-strip');
  if (strip) { strip.style.display = 'flex'; strip.classList.add('has-files'); }

  Array.from(files).forEach(f => {
    const reader = new FileReader();
    reader.onload = e => {
      const isImg = f.type.startsWith('image/');
      state.attachedFiles.push({ name: f.name, type: isImg ? 'image' : 'file', data: e.target.result });

      const item = document.createElement('div');
      item.className = 'file-pill';
      item.innerHTML = `<span>${isImg ? '🖼️' : '📄'} ${f.name}</span><span onclick="removeFile(${state.attachedFiles.length - 1})">✕</span>`;
      strip?.appendChild(item);
    };
    if (f.type.startsWith('image/')) reader.readAsDataURL(f);
    else reader.readAsText(f);
  });
}

export function removeFile(idx) {
  state.attachedFiles.splice(idx, 1);
  const strip = document.getElementById('file-strip');
  if (strip) {
    strip.innerHTML = '';
    state.attachedFiles.forEach((f, i) => {
      const item = document.createElement('div');
      item.className = 'file-pill';
      item.innerHTML = `<span>${f.type === 'image' ? '🖼️' : '📄'} ${f.name}</span><span onclick="removeFile(${i})">✕</span>`;
      strip.appendChild(item);
    });
    if (!state.attachedFiles.length) { strip.style.display = 'none'; strip.classList.remove('has-files'); }
  }
}

export function copyMsg(mid) {
  const m = state.msgStore[mid];
  if (!m) return;
  navigator.clipboard.writeText(m.text).then(() => toast('Copied ✓'));
}

export function copyLast() {
  const last = state.msgs.filter(m => m.role === 'assistant').pop();
  if (!last) return;
  navigator.clipboard.writeText(last.content).then(() => toast('Copied ✓'));
}

export function regenLast() {
  if (state.msgs.length < 2) return;
  if (state.msgs[state.msgs.length - 1].role === 'assistant') state.msgs.pop();
  window.callAI && window.callAI();
}

export function exportMsgPdf(mid) {
  const m = state.msgStore[mid];
  if (!m) return;
  const div = document.createElement('div');
  div.style.padding = '40px';
  div.innerHTML = `<h1>Bvmbino AI · Sovereign Transcript</h1><hr>${mdHtml(m.text)}`;
  window.html2pdf?.().from(div).save(`bvmbino-msg-${mid}.pdf`);
}

export function exportMsgHtml(mid) {
  const m = state.msgStore[mid];
  if (!m) return;
  const blob = new Blob([`<html><body style="font-family:sans-serif;padding:40px"><h1>Bvmbino AI</h1><hr>${mdHtml(m.text)}</body></html>`], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `bvmbino-msg-${mid}.html`;
  a.click();
}

export function exportLastPdf() {
  const last = state.msgs.filter(m => m.role === 'assistant').pop();
  if (!last) return;
  const div = document.createElement('div');
  div.style.padding = '40px';
  div.innerHTML = `<h1>Bvmbino AI · Sovereign Transcript</h1><hr>${mdHtml(last.content)}`;
  window.html2pdf?.().from(div).save(`bvmbino-last-${Date.now()}.pdf`);
}

export function saveAsPdf() {
  const div = document.createElement('div');
  div.style.padding = '40px';
  div.innerHTML = `<h1>Bvmbino AI · Full Transcript</h1><hr>`;
  state.msgs.forEach(m => {
    div.innerHTML += `<h3>${m.role.toUpperCase()}</h3><div>${mdHtml(m.content)}</div><br>`;
  });
  window.html2pdf?.().from(div).save(`bvmbino-full-${Date.now()}.pdf`);
}
