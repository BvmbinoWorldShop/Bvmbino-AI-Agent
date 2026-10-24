/**
 * orchestrator.js - Multi-Agent Brain (Billy as Chief of Staff)
 */

import { GRID_SKILLS } from './skills.js';
import { store } from './core.js';
import { memory } from './memory.js';

export function createThinkingView(chatEl) {
  const el = document.createElement('div');
  el.className = 'thinking';
  el.style.display = 'flex';
  el.style.gap = '10px';
  el.style.margin = '10px 0';
  el.style.flexWrap = 'wrap';

  function add(agentName) {
    const box = document.createElement('div');
    box.className = 'agent-box';
    box.style.flex = '1';
    box.style.minWidth = '200px';
    box.style.background = '#0c0c0c';
    box.style.border = '1px solid #222';
    box.style.borderRadius = '12px';
    box.style.padding = '12px';

    box.innerHTML = `
      <div class="agent-title" style="font-size:12px;color:var(--pu2);margin-bottom:8px;font-weight:600;text-transform:uppercase;">${agentName}</div>
      <div class="agent-output" style="font-size:11px;color:#aaa;line-height:1.4;">Thinking...</div>
    `;

    el.appendChild(box);
    return box.querySelector('.agent-output');
  }

  chatEl.appendChild(el);
  chatEl.scrollTop = chatEl.scrollHeight;
  
  return { el, add };
}

async function callAgent(agentId, input, ctx, signal) {
    const skillObj = GRID_SKILLS.find(s => s.id === agentId);
    let sysPrompt = skillObj ? skillObj.use : "You are a helpful AI assistant.";
    
    if (agentId === 'planner') {
        sysPrompt = "Break this request down into actionable, sequential steps. Be extremely concise.";
    } else if (agentId === 'critic') {
        sysPrompt = "Challenge this idea brutally. Point out flaws, assumptions, and risks in the user's input.";
    } else if (agentId === 'general') {
        sysPrompt = "Provide a comprehensive, general response to the user's input.";
    }

    if (ctx.memoryContext) {
        sysPrompt += `\n\nPast Memory Context:\n${ctx.memoryContext}`;
    }

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal,
            body: JSON.stringify({
                model: store.get().model,
                messages: [{ role: 'user', content: input }],
                temperature: 0.7,
                system: sysPrompt,
                stream: false
            })
        });

        if (!response.ok) throw new Error('API offline');
        const data = await response.json();
        return data.choices?.[0]?.message?.content || data.content?.[0]?.text || "No response";
    } catch (e) {
        if (e.name === 'AbortError') return "Cancelled";
        return "Offline/Failed";
    }
}

export async function runParallel(input, ctx, thinkingView, signal) {
  const selected = ["planner", "general", "critic"];
  const outputs = {};

  await Promise.all(selected.map(async (name) => {
    const panel = thinkingView.add(name);
    const res = await callAgent(name, input, ctx, signal);
    panel.textContent = res;
    outputs[name] = res;
  }));

  return outputs;
}

export async function aggregate(input, outputs, signal) {
    const sysPrompt = "You are Billy, the Chief of Staff. Review the following agent outputs and synthesize the ultimate, best response for the user. Be concise, decisive, and actionable.";
    
    const aggregatedInput = `
User Input:
${input}

Agent: Planner
${outputs.planner}

Agent: General
${outputs.general}

Agent: Critic
${outputs.critic}

Synthesize the final answer:`;

    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
            model: store.get().model,
            messages: [{ role: 'user', content: aggregatedInput }],
            temperature: 0.7,
            system: sysPrompt,
            stream: store.get().config.stream
        })
    });
    
    return response;
}
