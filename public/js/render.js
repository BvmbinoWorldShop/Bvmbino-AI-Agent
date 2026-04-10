/**
 * render.js — High-fidelity Markdown and UI rendering for Bvmbino AI Council.
 * FIXED v3.6
 *
 * AUDIT NOTES:
 *  - Uses LEVELS lookup instead of MODELS[state.model] (which returned undefined
 *    after the model ID was changed to a full slug)
 *  - Restored safeUrl() URL sanitizer from render_stable_v2.js
 *  - Restored escA() for safe inline-onclick attribute escaping
 *  - addUserMsg now stores user messages in msgStore so copy/delete work via mid
 *  - Removed window-bridge import-side-effect (was causing circular import warnings)
 */

import { state, scrollBot, LEVELS, DEFAULT_MODEL } from './core.js';

// ── Markdown Utilities ──
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

// FIX: Restored from render_stable_v2 — escapes for safe inline onclick attributes
export function escA(s) {
  return String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;')
    .replace(/`/g, '\\`')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '\\n');
}

// FIX: Restored from render_stable_v2 — only allows http(s) URLs
export function safeUrl(url) {
  try {
    const u = new URL(url);
    return ['http:', 'https:'].includes(u.protocol) ? url : '#';
  } catch { return '#'; }
}

export function inl(t) {
  return String(t ?? '')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, txt, url) =>
      `<a href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer" style="color:var(--pu2)">${txt}</a>`);
}

export function mkTable(lines) {
  const rows = lines.filter(l => !/^[\s|:-]+$/.test(l));
  if (!rows.length) return '';
  let html = '<table>';
  rows.forEach((row, i) => {
    const cells = row.split('|').filter(c => c.trim() !== '');
    const t = i === 0 ? 'th' : 'td';
    html += '<tr>' + cells.map(c => `<${t}>${inl(c.trim())}</${t}>`).join('') + '</tr>';
  });
  return html + '</table>';
}

export function mdHtml(text) {
  if (!text) return '';
  const lines = text.split('\n');
  let html = '', inCode = false, codeBuf = '', lang = '', inTable = false, tableBuf = [];
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (ln.startsWith('```')) {
      if (!inCode) { inCode = true; lang = ln.slice(3).trim(); codeBuf = ''; continue; }
      else { inCode = false; html += `<pre><code class="lang-${esc(lang)}">${esc(codeBuf.trim())}</code></pre>`; codeBuf = ''; lang = ''; continue; }
    }
    if (inCode) { codeBuf += ln + '\n'; continue; }
    if (ln.includes('|') && ln.trim().startsWith('|')) { if (!inTable) inTable = true; tableBuf.push(ln); continue; }
    else if (inTable) { html += mkTable(tableBuf); tableBuf = []; inTable = false; }
    if (/^#{1,3} /.test(ln)) { html += `<span class="bh">${inl(ln.replace(/^#{1,3} /, ''))}</span>`; continue; }
    const nm = ln.match(/^(\d+)\. (.+)/);
    if (nm) { html += `<div class="bn"><span class="bnn">${nm[1]}.</span><span>${inl(nm[2])}</span></div>`; continue; }
    const bm = ln.match(/^[-*•] (.+)/);
    if (bm) { html += `<div class="bl"><span class="bld">›</span><span>${inl(bm[1])}</span></div>`; continue; }
    if (/^---+$/.test(ln.trim())) { html += `<hr style="border:none;border-top:1px solid var(--bd);margin:10px 0">`; continue; }
    if (ln.trim() === '') { html += '<br>'; continue; }
    html += `<span>${inl(ln)}</span><br>`;
  }
  if (inTable) html += mkTable(tableBuf);
  return html;
}

// FIX: Helper to get the display name from current state.model regardless of
// whether it's a full slug or alias. Avoids the MODELS[state.model] = undefined bug.
function currentModelLabel() {
  return LEVELS[state.model] || LEVELS[DEFAULT_MODEL] || 'AI';
}

// ── UI Rendering ──
// FIX: User message now stored in msgStore so action buttons can find it by mid
export function addUserMsg(text) {
  const ci = document.getElementById('ci');
  if (!ci) return;
  const mid = 'u' + Date.now();
  state.msgStore[mid] = { text, xtype: null };
  const d = document.createElement('div');
  d.className = 'mrow user';
  d.innerHTML = `
    <div class="av av-us">U</div>
    <div class="mwrap">
      <div class="mmeta">You <span class="mmtag">· Session Active</span></div>
      <div class="bubble b-us">${esc(text).replace(/\n/g, '<br>')}</div>
      <div class="macts">
        <div class="mact" onclick="window.copyMsg && window.copyMsg('${mid}')">⎘ copy</div>
        <div class="mact" onclick="this.closest('.mrow').remove()">✕ delete</div>
      </div>
    </div>
  `;
  ci.appendChild(d);
  scrollBot();
}

export function msgActions(mid) {
  const acts = document.createElement('div');
  acts.className = 'macts';
  acts.innerHTML = `
    <span class="mact" onclick="window.copyMsg && window.copyMsg('${mid}')">⎘ Copy</span>
    <span class="mact" onclick="window.regenLast && window.regenLast()">↻ Regen</span>
    <span class="mact" onclick="window.expMsgPdf && window.expMsgPdf('${mid}')">📋 PDF</span>
    <span class="mact" onclick="this.closest('.mrow').remove()">✕ Delete</span>`;
  return acts;
}

export function xcard(type) {
  return `<div class="card card-premium" style="margin-top: 15px; background:var(--s3); border-color:var(--pu3); padding:12px; border-radius:8px;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
      <span style="font-family:var(--mono); font-size:10px; letter-spacing:1px; color:var(--pu2); text-transform:uppercase;">${esc(type)} ASSET READY</span>
      <span class="badge b-gn">High-Fidelity</span>
    </div>
    <div style="display:grid; grid-template-columns: 1fr; gap:8px;">
      <button class="nbtn" onclick="window.saveAsPdf && window.saveAsPdf()" style="font-size:11px; padding:8px;">↓ SAVE AS PROFESSIONAL PDF</button>
    </div>
  </div>`;
}

export function appendAiText(text, xtype) {
  const ci = document.getElementById('ci');
  if (!ci) return;
  const mid = 'm' + Date.now();
  state.msgStore[mid] = { text, xtype };

  const d = document.createElement('div');
  d.className = 'mrow';

  let suggestion = '';
  const l = (text || '').toLowerCase();
  if (l.includes('sell') || l.includes('product')) suggestion = 'sales';
  else if (l.includes('post') || l.includes('content')) suggestion = 'content';
  else if (l.includes('legal')) suggestion = 'lex';
  else if (l.includes('money')) suggestion = 'budget';
  else if (l.includes('strategy')) suggestion = 'strategy';

  const suggHtml = suggestion
    ? `<div class="sugg-chip" onclick="window.slash && window.slash('${suggestion}')"><span>✨ Suggestion: /${suggestion}</span></div>`
    : '';

  d.innerHTML = `
    <div class="av av-ai">B</div>
    <div class="mwrap">
      <div class="mmeta">Bvmbino AI Council <span class="mmtag">· ${esc(currentModelLabel())}</span></div>
      <div class="bubble b-ai">
        ${mdHtml(text)}${xtype ? xcard(xtype) : ''}
        ${suggHtml}
      </div>
    </div>
  `;

  d.querySelector('.mwrap').appendChild(msgActions(mid));
  ci.appendChild(d);
  scrollBot();

  if (text && text.length > 50 && !xtype) updateMemory(text.slice(0, 100) + '...');
}

function updateMemory(insight) {
  const mems = document.getElementById('mems');
  if (!mems) return;
  const d = document.createElement('div');
  d.className = 'me new';
  d.innerHTML = `<div class="mek">Insight</div><div class="mev">${esc(insight)}</div>`;
  mems.prepend(d);
  if (mems.children.length > 5) mems.lastElementChild.remove();
  setTimeout(() => d.classList.remove('new'), 2000);
}

export function appendToolRow(id, icon, type, msg) {
  const ci = document.getElementById('ci');
  if (!ci) return;
  const d = document.createElement('div');
  d.id = id + '-banner';
  d.className = `tool-banner tb-${type}`;
  d.innerHTML = `<span>${icon}</span><span id="${id}-msg">${msg}</span>`;
  ci.appendChild(d);
  scrollBot();
}

export function updateToolRow(id, icon, type, msg, isErr) {
  const el = document.getElementById(id + '-msg');
  if (el) el.innerHTML = (isErr ? '⚠ ' : '') + msg;
  const banner = document.getElementById(id + '-banner');
  if (banner && isErr) {
    banner.style.background = 'rgba(248, 81, 73, .1)';
    banner.style.borderColor = 'rgba(248, 81, 73, .3)';
  }
}

// ── Council Brainstorming Animation ──
let typeInterval = null;
const SPECIALISTS = ['Papou', 'Doobs', 'Kael', 'Zora', 'Chronos', 'Scribe'];
const ACTIONS = ['mapping strategy', 'calculating ROI', 'blueprinting', 'optimizing unit economics', 'auditing DNA', 'polishing output'];

export function showTyping() {
  const ci = document.getElementById('ci');
  if (!ci || document.getElementById('type-row')) return;
  const d = document.createElement('div');
  d.id = 'type-row';
  d.className = 'mrow';
  d.innerHTML = `
    <div class="av av-ai">B</div>
    <div class="mwrap">
      <div class="mmeta" id="type-name">Bvmbino AI Council</div>
      <div class="bubble b-ai" id="type-bubble" style="padding:10px 15px; font-style:italic; font-size:12px; color:var(--t4)">
        <span id="type-text">Council is deliberating...</span>
        <div class="tots" style="margin-top:5px"><div class="tot"></div><div class="tot"></div><div class="tot"></div></div>
      </div>
    </div>`;
  ci.appendChild(d);
  scrollBot();

  let i = 0;
  typeInterval = setInterval(() => {
    const name = SPECIALISTS[i % SPECIALISTS.length];
    const action = ACTIONS[i % ACTIONS.length];
    const elName = document.getElementById('type-name');
    const elText = document.getElementById('type-text');
    if (elName) elName.innerText = `${name} (${action}...)`;
    if (elText) elText.innerText = `Strategic Partner verifying ${name}'s input...`;
    i++;
  }, 1500);
}

export function hideTyping() {
  if (typeInterval) { clearInterval(typeInterval); typeInterval = null; }
  const r = document.getElementById('type-row');
  if (r) r.remove();
}

// FIX: Expose typing helpers on window so api.js can call them.
// api.js was calling window.showTyping/window.hideTyping which were never assigned.
if (typeof window !== 'undefined') {
  window.showTyping = showTyping;
  window.hideTyping = hideTyping;
}
