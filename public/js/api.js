/**
 * api.js — Backend communication, AI orchestration, and provider rotation.
 * FIXED v3.6
 *
 * AUDIT NOTES (the "stuck in chat" fix):
 *  - state.model was being sent as "llama" (alias key) → backend rejected it.
 *    Now resolves through resolveModelId() to get the full slug before fetch.
 *  - Removed every window.lock/unlock/showTyping/hideTyping/updTok/buildSys call —
 *    these were never assigned, causing TypeError on first send. Now imports
 *    the real functions directly from core.js and render.js.
 *  - Added explicit provider rotation: if the chosen model fails, automatically
 *    retries with the next available model in PROVIDER_FALLBACK before giving up.
 *  - Removed the orchestrateTask early-return that was triggering on EVERY
 *    message past msg #2, sending requests with `orchestrate:true` which the
 *    backend likely doesn't handle, causing silent failures.
 *  - send() now uses try/finally so the lock is always released, no matter what.
 */

import {
  state, scrollBot, MODELS, LEVELS, DEFAULT_MODEL,
  resolveModelId, lock, unlock, updTok, buildSys
} from './core.js';
import {
  mdHtml, xcard, msgActions, appendAiText, addUserMsg,
  appendToolRow, updateToolRow, showTyping, hideTyping
} from './render.js';
import { saveSession } from './store.js';
import { detectIntent, smartRouteMsg } from './router.js';

// FIX: Provider fallback chain — if active model fails, walk down this list.
// Order: free + reliable first, then premium-grade.
const PROVIDER_FALLBACK = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
  'deepseek/deepseek-chat-v3-0324:free',
  'meta-llama/llama-3.2-90b-vision-instruct:free',
];

/**
 * Main command dispatcher.
 * FIX: try/finally guarantees unlock(); no more stuck-locked state.
 */
export async function send() {
  const inp = document.getElementById('inp');
  if (!inp || !inp.value.trim() || state.busy) return;

  const raw = inp.value.trim();
  inp.value = '';
  inp.style.height = '48px';

  lock();
  try {
    state.msgs.push({ role: 'user', content: raw });
    addUserMsg(raw);

    // 1. Slash-command intent detection
    const intent = detectIntent(raw);
    if (intent) {
      if (intent.type === 'scrape') return await handleScrape(intent.url);
      if (intent.type === 'search') return await handleSearch(intent.query);
      // Other intents fall through to callAI with the raw command
    }

    // 2. Smart natural-language routing → enhance with skill framework
    const routing = smartRouteMsg(raw);
    if (routing) {
      state.msgs[state.msgs.length - 1].content = routing.enhanced;
      state.msgs[state.msgs.length - 1].skill = routing.skill;
    }

    // 3. Execute AI call
    await callAI();
  } catch (err) {
    console.error('send error:', err);
    appendAiText(`**Error:** ${err.message}`, null);
  } finally {
    unlock();
  }
}

/**
 * Core AI request with automatic provider rotation.
 * FIX: Removed the orchestrateTask early-return. That branch was firing on
 *      every message past #2 and sending an `orchestrate:true` flag the
 *      backend probably ignores, causing silent failures.
 * FIX: Walks PROVIDER_FALLBACK on error so a single dead provider doesn't
 *      brick the whole chat.
 */
export async function callAI(skipLock = false) {
  if (!skipLock) showTyping();

  let sys = '';
  try { sys = await buildSys(); } catch (e) { console.warn('buildSys failed, using empty:', e); }

  // Build the rotation list — start with the user's chosen model, then fall
  // through to the rest of the chain (de-duped).
  const startModel = resolveModelId(state.model || DEFAULT_MODEL);
  const tryOrder = [startModel, ...PROVIDER_FALLBACK.filter(m => m !== startModel)];

  let lastErr = null;
  for (const modelId of tryOrder) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (state.APP_TOKEN) headers['x-app-token'] = state.APP_TOKEN;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          system: sys,
          messages: state.msgs.slice(-15),
          model: modelId  // FIX: send the real slug, not the alias
        })
      });

      // Provider returned an error status — try next in chain
      if (!res.ok) {
        lastErr = new Error(`${modelId}: HTTP ${res.status}`);
        console.warn(`[provider rotation] ${modelId} returned ${res.status}, trying next`);
        continue;
      }

      // Streaming response
      if (res.headers.get('content-type')?.includes('text/event-stream')) {
        const ok = await streamResponse(res, modelId);
        if (ok) return; // success
        lastErr = new Error(`${modelId}: empty stream`);
        continue;
      }

      // JSON response
      const data = await res.json();
      hideTyping();

      if (data.error && !data.content) {
        lastErr = new Error(`${modelId}: ${data.error}`);
        console.warn(`[provider rotation] ${modelId} JSON error: ${data.error}`);
        continue;
      }

      const reply = data.content?.[0]?.text || data.reply || data.text || '';
      if (!reply.trim()) {
        lastErr = new Error(`${modelId}: empty response`);
        continue;
      }

      processAiResponse(reply, data.model || modelId);
      return; // success
    } catch (err) {
      lastErr = err;
      console.warn(`[provider rotation] ${modelId} threw:`, err.message);
      continue;
    }
  }

  // All providers failed
  hideTyping();
  appendAiText(
    `**All AI providers failed.** Tried: ${tryOrder.length} models.\n\n` +
    `Last error: \`${lastErr?.message || 'unknown'}\`\n\n` +
    `**Quick fixes:**\n` +
    `- Check that \`GROQ_KEY\` or \`OPENROUTER_KEY\` is set in Vercel → Settings → Environment Variables\n` +
    `- Verify your /api/chat endpoint is deployed and reachable`,
    null
  );
}

/**
 * Tool: Scrape
 */
async function handleScrape(url) {
  const id = 'scrape-' + Date.now();
  appendToolRow(id, '🔍', 'info', `Scraping: ${url}...`);
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (state.APP_TOKEN) headers['x-app-token'] = state.APP_TOKEN;

    const res = await fetch('/api/scrape', {
      method: 'POST',
      headers,
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    updateToolRow(id, '✅', 'success', `Scraped ${data.chars || 0} characters from ${url}.`);
    state.msgs.push({ role: 'user', content: `[SCRAPED CONTENT FROM ${url}]\n\n${data.content}` });
    await callAI(true);
  } catch (err) {
    updateToolRow(id, '❌', 'error', `Scrape failed: ${err.message}`, true);
  }
}

/**
 * Tool: Search
 */
async function handleSearch(query) {
  const id = 'search-' + Date.now();
  appendToolRow(id, '🌐', 'info', `Searching: ${query}...`);
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (state.APP_TOKEN) headers['x-app-token'] = state.APP_TOKEN;

    // Search uses chat endpoint with a search-prefixed prompt
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages: [{ role: 'user', content: `/search ${query}` }],
        model: 'google/gemini-2.0-flash-exp:free'
      })
    });
    if (!res.ok) throw new Error(`Search HTTP ${res.status}`);
    if (res.headers.get('content-type')?.includes('text/event-stream')) {
      await streamResponse(res, 'google/gemini-2.0-flash-exp:free');
    } else {
      const data = await res.json();
      const reply = data.content?.[0]?.text || data.reply || '';
      if (reply) processAiResponse(reply, 'google/gemini-2.0-flash-exp:free');
      else throw new Error(data.error || 'Empty search response');
    }
    updateToolRow(id, '✅', 'success', `Search complete: "${query}"`);
  } catch (err) {
    updateToolRow(id, '❌', 'error', `Search failed: ${err.message}`, true);
  }
}

/**
 * Streaming response handler.
 * FIX: Returns boolean (true = got content, false = empty) so the caller can
 *      decide whether to fall through to the next provider in rotation.
 */
async function streamResponse(res, modelId) {
  const streamModel = res.headers.get('x-specialist') || LEVELS[modelId] || LEVELS[DEFAULT_MODEL] || 'AI';
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let full = '', buf = '';

  hideTyping();
  const ci = document.getElementById('ci');
  if (!ci) return false;

  const stId = 'st-' + Date.now();
  const row = document.createElement('div');
  row.className = 'mrow ai';
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

  let scrollTimer = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Handle both `data: ...` SSE and bare JSON chunks
        const payload = trimmed.startsWith('data: ') ? trimmed.slice(6).trim() : trimmed;
        if (payload === '[DONE]') continue;

        try {
          const p = JSON.parse(payload);
          const chunk = p.choices?.[0]?.delta?.content
            || (p.type === 'content_block_delta' ? p.delta?.text : '')
            || '';
          if (chunk) {
            full += chunk;
            rawNode.textContent += chunk;
            const now = Date.now();
            if (now - scrollTimer > 150) { scrollBot(); scrollTimer = now; }
          }
        } catch { /* not JSON, skip */ }
      }
    }
  } catch (err) {
    console.error('Stream read error:', err);
  }

  if (!full.trim()) {
    // Empty stream — remove the empty bubble and signal failure to caller
    row.remove();
    return false;
  }

  const processed = finalizeResponse(full);
  streamEl.innerHTML = processed.html;
  const mid = 'm' + Date.now();
  state.msgStore[mid] = { text: processed.clean, xtype: processed.xtype };
  streamEl.closest('.mwrap').appendChild(msgActions(mid));

  state.msgs.push({ role: 'assistant', content: processed.clean });
  saveSession(document.getElementById('tbtitle')?.textContent || 'Conversation');
  updTok(processed.clean.length / 3.5);
  return true;
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
  saveSession(document.getElementById('tbtitle')?.textContent || 'Conversation');
  updTok(processed.clean.length / 3.5);
}

// Expose for inline handlers / main.js bridges
if (typeof window !== 'undefined') {
  window.send = send;
  window.callAI = callAI;
}
