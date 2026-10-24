/**
 * api.js - Backend communication and Orchestrator interface for Bvmbino AI.
 */

import { store, toast, scrollBot } from './core.js';
import { rmWelcome, showTyping, hideTyping } from './render.js';
import { smartRouteMsg } from './router.js';
import { saveSession } from './store.js';
import { memory } from './memory.js';
import { offline } from './offline.js';
import { createThinkingView, runParallel, aggregate } from './orchestrator.js';

// --- Request Manager ---
let requestController = null;
export const requests = {
  run(task) {
    requestController = new AbortController();
    return task(requestController.signal);
  },
  cancel() {
    requestController?.abort();
  },
  getSignal() {
    return requestController?.signal;
  }
};

// --- Streaming UI Polish ---
function shouldScroll(el) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
}

async function streamToDOM(signal, responseReader) {
  const ci = document.getElementById('ci');
  if (!ci) return "";

  hideTyping();

  const row = document.createElement('div');
  row.className = 'mrow ai';
  row.style.animation = 'fadeIn 0.2s ease';
  
  const wrap = document.createElement('div');
  wrap.className = 'mwrap';
  
  const meta = document.createElement('div');
  meta.className = 'mmeta ai-meta';
  meta.innerHTML = `Bvmbino Agent <span class="mmtag">${store.get().model}</span>`;
  
  const bubble = document.createElement('div');
  bubble.className = 'bubble b-ai';
  
  wrap.appendChild(meta);
  wrap.appendChild(bubble);
  row.innerHTML = '<div class="av av-ai">B</div>';
  row.appendChild(wrap);
  ci.appendChild(row);

  const dec = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let lastFlush = 0;

  try {
    while (true) {
      if (signal.aborted) break;
      const { done, value } = await responseReader.read();
      if (done) break;

      const chunkStr = dec.decode(value, { stream: true });
      const lines = chunkStr.split('\n');
      
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const d = line.slice(6).trim(); 
        if (d === '[DONE]') continue;
        try {
          const p = JSON.parse(d);
          const chunk = (p.choices && p.choices[0] && p.choices[0].delta && p.choices[0].delta.content) || '';
          if (chunk) {
            buffer += chunk;
            fullText += chunk;
          }
        } catch(e) { }
      }

      const now = performance.now();
      if (now - lastFlush > 30) {
        bubble.textContent += buffer;
        buffer = '';
        lastFlush = now;
        
        const chatEl = document.getElementById('chat');
        if (chatEl && shouldScroll(chatEl)) {
          chatEl.scrollTop = chatEl.scrollHeight;
        }
      }
    }
    
    if (buffer) {
      bubble.textContent += buffer;
      const chatEl = document.getElementById('chat');
      if (chatEl && shouldScroll(chatEl)) {
        chatEl.scrollTop = chatEl.scrollHeight;
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      bubble.textContent += '\n\n[⏹️ Cancelled]';
    } else {
      bubble.textContent += '\n\n[⚠️ Stream interrupted]';
    }
  }

  row.remove();
  return fullText;
}

/**
 * send() - Primary message handler with Offline & Memory integration
 */
export async function send() {
    const inp = document.getElementById('inp');
    const state = store.get();
    
    if (!inp || state.busy) return;
    
    const text = inp.value.trim();
    if (!text && !state.attachedFiles.length) return;

    inp.value = '';
    inp.style.height = 'auto';
    rmWelcome();
    
    const msg = { role: 'user', content: text };
    if (state.attachedFiles.length) {
        msg.files = [...state.attachedFiles];
        store.set({ attachedFiles: [] });
        const strip = document.getElementById('file-strip');
        if (strip) { strip.innerHTML = ''; strip.style.display = 'none'; }
    }
    
    store.set({ 
      msgs: [...store.get().msgs, msg],
      busy: true 
    });

    const routed = smartRouteMsg(text);

    // 1. Check Offline Cache first
    if (offline.has(text)) {
        const cachedRes = offline.get(text);
        store.set({
          msgs: [...store.get().msgs, { role: 'assistant', content: cachedRes }],
          busy: false
        });
        toast("Loaded from cache ⚡");
        return;
    }

    showTyping();

    try {
        // 2. Retrieve Semantic Memory
        const relevantMemories = memory.search(text);
        const memContext = relevantMemories.length > 0 
            ? `\n\nPast Memory Context:\n${relevantMemories.map(m => `- ${m.text}`).join('\n')}` 
            : '';

        const ctx = { memoryContext: memContext, selectedAgent: routed?.skill !== 'billy' ? routed?.skill : null };
        let systemPrompt = (routed?.enhanced || "") + memContext;
        
        const isComplex = text.length > 120 || text.toLowerCase().includes("plan") || text.toLowerCase().includes("compare");

        const res = await requests.run(async (signal) => {
            let reply = "";

            if (!ctx.selectedAgent && isComplex) {
                // MULTI-AGENT BRAIN (Billy Orchestrator)
                hideTyping();
                const chatEl = document.getElementById('chat');
                const ci = document.getElementById('ci');
                const thinkingView = createThinkingView(ci);
                
                toast("Billy Orchestrator: Running parallel synthesis ⚡");
                const outputs = await runParallel(text, ctx, thinkingView, signal);
                
                // Aggregate
                const response = await aggregate(text, outputs, signal);
                if (!response.ok) throw new Error('API offline');
                
                if (response.headers.get('content-type')?.includes('text/event-stream')) {
                    reply = await streamToDOM(signal, response.body.getReader());
                } else {
                    const data = await response.json();
                    reply = data.choices?.[0]?.message?.content || data.content?.[0]?.text || "No response";
                }
                
                // Keep the thinking view visible as requested by "VISIBLE THINKING"
                
            } else {
                // SINGLE AGENT
                if (routed && routed.skill !== 'billy') {
                    toast(`Specialist Active: /${routed.skill} ⚡`);
                }
                
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal,
                    body: JSON.stringify({
                        model: store.get().model,
                        messages: store.get().msgs,
                        temperature: store.get().config.temp || 0.7,
                        system: systemPrompt,
                        stream: store.get().config.stream
                    })
                });

                if (!response.ok) throw new Error('API offline');

                if (response.headers.get('content-type')?.includes('text/event-stream')) {
                    reply = await streamToDOM(signal, response.body.getReader());
                } else {
                    const data = await response.json();
                    reply = data.choices?.[0]?.message?.content || data.content?.[0]?.text || "No response";
                    hideTyping();
                }
            }
            return reply;
        });
        
        // 3. Save to Store, Cache, and Memory
        store.set({
          msgs: [...store.get().msgs, { role: 'assistant', content: res }],
          busy: false
        });

        offline.set(text, res);
        memory.add(text);
        
        saveSession(store.get().msgs[0]?.content?.slice(0, 30));
        
    } catch (err) {
        console.error("Chat error:", err);
        hideTyping();
        
        let errorMsg = '⚠️ Failed request';
        
        // Fallback to cache if offline
        if (err.message === 'API offline' || err.message === 'Failed to fetch') {
            if (offline.has(text)) {
                errorMsg = offline.get(text) + '\n\n*(Loaded from offline cache)*';
            } else {
                errorMsg = '⚠️ Offline mode — no cached data available.';
            }
        } else if (err.name === 'AbortError') {
            errorMsg = '⏹️ Cancelled';
            toast("Request cancelled");
        } else {
            toast("Connection error. Check console.");
        }

        store.set({
          msgs: [...store.get().msgs, { role: 'assistant', content: errorMsg }],
          busy: false
        });
    }
}

export async function slash(id) {
    const inp = document.getElementById('inp');
    if (inp) {
        inp.value = `/${id} `;
        inp.focus();
    }
}

export async function regenLast() {
    const state = store.get();
    if (state.busy || state.msgs.length < 2) return;
    
    // Find last user message
    let lastUserIdx = -1;
    for (let i = state.msgs.length - 1; i >= 0; i--) {
        if (state.msgs[i].role === 'user') { lastUserIdx = i; break; }
    }
    if (lastUserIdx === -1) return;
    
    // Update store to remove everything after last user msg
    const newMsgs = state.msgs.slice(0, lastUserIdx + 1);
    
    // Remove last AI bubbles from UI manually for now 
    // since our reactive sync is append-only
    const rows = document.querySelectorAll('.mrow.ai');
    if (rows.length) rows[rows.length - 1].remove();
    
    store.set({ msgs: newMsgs });
    
    // Resend
    // Wait, send() grabs from input. We need a way to resend without input.
    // Actually, send() pushes a new user msg. If we just want to regen, 
    // we should extract the core fetch logic. 
    // For now, we'll just put the text back in the input and click send.
    const lastText = state.msgs[lastUserIdx].content;
    const inp = document.getElementById('inp');
    if (inp) {
        inp.value = lastText;
        // Pop the user message so send() can push it again
        store.set({ msgs: state.msgs.slice(0, lastUserIdx) });
        send();
    }
}

// Attach cancel to window
window.cancelGeneration = () => requests.cancel();
