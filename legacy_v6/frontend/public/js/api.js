/**
 * api.js - Backend communication and Orchestrator interface for Bvmbino AI.
 */

import { state, toast, scrollBot, MODELS } from './core.js';
import { mdHtml, xcard, msgActions, appendAiText } from './render.js';
import { saveSession } from './store.js';

export async function callAI(skipLock = false) {
  if (!skipLock) showTyping();
  else showTyping();

  const activeClient = state.activeClientId; 
  // We'll get these from central state in main.js
  const sys = window.buildSys ? window.buildSys() : "";

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        system: sys, 
        messages: state.msgs.slice(-15), // Expanded context for Auteur
        model: state.model 
      })
    });

    if (res.ok && res.headers.get('content-type')?.includes('text/event-stream')) {
      await streamResponse(res);
    } else {
      const data = await res.json();
      hideTyping();
      
      const reply = data.content?.[0]?.text || data.error || 'No response from AI';
      processAiResponse(reply, data.model);
    }
  } catch (err) {
    hideTyping();
    appendAiText(`**Connection failed** — \`${err.message}\``, null);
  } finally {
    window.unlock();
  }
}

async function streamResponse(res) {
  const streamModel = res.headers.get('x-model') || MODELS[state.model] || 'AI';
  const reader = res.body.getReader(), dec = new TextDecoder();
  let full = '', buf = '';
  
  hideTyping();
  const ci = document.getElementById('ci');
  const stId = 'st-' + Date.now();
  const row = document.createElement('div'); row.className = 'mrow ai';
  row.innerHTML = `<div class="av av-ai">B</div><div class="mwrap"><div class="mmeta">Bvmbino Agent <span class="mmtag">${streamModel}</span></div><div class="bubble b-ai" id="${stId}"></div></div>`;
  ci.appendChild(row);
  const streamEl = document.getElementById(stId);
  scrollBot();

  const rawNode = document.createElement('span');
  rawNode.style.cssText = 'white-space:pre-wrap;font-family:inherit;';
  const cursor = document.createElement('span');
  cursor.className = 'sc';
  streamEl.appendChild(rawNode);
  streamEl.appendChild(cursor);

  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n'); buf = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const d = line.slice(6).trim(); if (d === '[DONE]') continue;
        try {
          const p = JSON.parse(d);
          const chunk = p.choices?.[0]?.delta?.content || (p.type === 'content_block_delta' ? p.delta?.text : '');
          if (chunk) {
            full += chunk;
            rawNode.textContent += chunk;
            scrollBot();
          }
        } catch { }
      }
    }
  } finally {
    const processed = finalizeResponse(full);
    streamEl.innerHTML = processed.html;
    const mid = 'm' + Date.now();
    state.msgStore[mid] = { text: processed.clean, xtype: processed.xtype };
    streamEl.closest('.mwrap').appendChild(msgActions(mid));
    state.msgs.push({ role: 'assistant', content: processed.clean });
    saveSession(document.getElementById('tbtitle').textContent);
    window.updTok(processed.clean.length / 3.5);
    window.unlock();
  }
}

function finalizeResponse(text) {
  let xtype = null; 
  const m = text.match(/\[EXPORT:(\w+)\]/);
  let clean = text;
  if (m) { clean = text.replace(/\[EXPORT:\w+\]/, '').trim(); xtype = m[1]; }
  return { clean, xtype, html: mdHtml(clean) + (xtype ? xcard(xtype) : '') };
}

function processAiResponse(text, modelName) {
  const processed = finalizeResponse(text);
  state.msgs.push({ role: 'assistant', content: processed.clean });
  appendAiText(processed.clean, processed.xtype);
  window.updTok(processed.clean.length / 3.5);
}

// Global UI helpers needed by legacy index.html still
window.showTyping = () => {
    hideTyping();
    const ci = document.getElementById('ci');
    if (!ci) return;
    const d = document.createElement('div'); d.className = 'mrow ai'; d.id = 'typing';
    d.innerHTML = `<div class="av av-ai">B</div><div class="mwrap"><div class="mmeta">Bvmbino Agent <span class="mmtag">Orchestrating...</span></div><div class="tbub"><div class="td"></div><div class="td"></div><div class="td"></div></div></div>`;
    ci.appendChild(d); scrollBot();
};
window.hideTyping = () => { const t = document.getElementById('typing'); if (t) t.remove(); };
