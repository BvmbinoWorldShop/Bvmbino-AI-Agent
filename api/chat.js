import { setCors, isRateLimited, validateMessages } from './_cors.js';
import { CORE, SKILLS, detectSkill, getMaxTokens } from './lib/prompts.js';

// Vercel Fluid Compute — extends timeout to 60s on free Hobby plan
export const maxDuration = 60;

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (isRateLimited(req)) return res.status(429).json({ error: 'Rate limit exceeded (30 req/min)' });

  const groqKey       = process.env.GROQ_KEY;
  const cerebrasKey   = process.env.CEREBRAS_KEY;
  const geminiKey1    = process.env.GEMINI_KEY;
  const geminiKey2    = process.env.GEMINI_KEY_2;
  const openrouterKey = process.env.OPENROUTER_KEY;

  const providersLoaded = [groqKey?'groq':'', cerebrasKey?'cerebras':'', geminiKey1?'gemini1':'', geminiKey2?'gemini2':'', openrouterKey?'openrouter':''].filter(Boolean).join(',');
  res.setHeader('x-providers', providersLoaded);

  if (!groqKey && !cerebrasKey && !geminiKey1 && !openrouterKey) {
    return res.status(500).json({
      error: 'No AI key configured.',
      hint: 'Add GROQ_KEY free at groq.com (14k req/day) or CEREBRAS_KEY at cloud.cerebras.ai (1M tokens/day)',
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { messages, system } = body;

    const validErr = validateMessages(messages);
    if (validErr) return res.status(400).json({ error: validErr });

    const skill = detectSkill(messages, system);
    const skillPrompt = skill ? `\n\n## ACTIVE SKILL: ${skill.toUpperCase()}\n${SKILLS[skill]}` : '';
    const fullSystem = CORE + skillPrompt + (system ? `\n\n${system}` : '');
    const maxTok = getMaxTokens(skill, body.max_tokens);
    const temp = body.temperature ?? 0.7;

    const oaiMessages = [
      { role: 'system', content: fullSystem },
      ...(messages || []).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    ];

    // Pipe OpenAI SSE stream directly to client
    async function pipeStream(upstream, modelName) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('x-model', modelName);
      try {
        const reader = upstream.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      } finally { res.end(); }
    }

    let lastError = null;

    // ── 1. GROQ — streaming, 14,400 req/day free (groq.com) ─────────────────
    if (groqKey) {
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 55000);
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
          body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: oaiMessages, max_tokens: Math.min(maxTok, 8000), temperature: temp, stream: true }),
          signal: ctrl.signal,
        });
        clearTimeout(tid);
        if (r.ok) { await pipeStream(r, 'Groq · Llama 3.3 70B'); return; }
        lastError = `Groq error (${r.status})`;
        if (r.status === 401 || r.status === 403) lastError = 'Groq: invalid key — add GROQ_KEY at groq.com (free)';
      } catch (e) { lastError = `Groq: ${e.message}`; }
    }

    // ── 2. CEREBRAS — streaming, 1M tokens/day free (cloud.cerebras.ai) ─────
    if (cerebrasKey) {
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 55000);
        const r = await fetch('https://api.cerebras.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cerebrasKey}` },
          body: JSON.stringify({ model: 'llama-3.3-70b', messages: oaiMessages, max_tokens: Math.min(maxTok, 8192), temperature: temp, stream: true }),
          signal: ctrl.signal,
        });
        clearTimeout(tid);
        if (r.ok) { await pipeStream(r, 'Cerebras · Llama 70B'); return; }
        lastError = `Cerebras error (${r.status})`;
      } catch (e) { lastError = `Cerebras: ${e.message}`; }
    }

    // ── 3. GEMINI — JSON fallback, 1,500 req/day per key ────────────────────
    const geminiAttempts = [];
    if (geminiKey1) {
      geminiAttempts.push({ key: geminiKey1, model: 'gemini-2.5-flash' });
      geminiAttempts.push({ key: geminiKey1, model: 'gemini-2.0-flash' });
    }
    if (geminiKey2) {
      geminiAttempts.push({ key: geminiKey2, model: 'gemini-2.5-flash' });
      geminiAttempts.push({ key: geminiKey2, model: 'gemini-2.0-flash' });
    }
    const geminiBody = {
      contents: (messages || []).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      systemInstruction: { parts: [{ text: fullSystem }] },
      generationConfig: { maxOutputTokens: maxTok, temperature: temp },
    };
    for (const { key, model } of geminiAttempts) {
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 9000);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const upstream = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiBody), signal: ctrl.signal });
        clearTimeout(tid);
        const data = await upstream.json();
        if (!upstream.ok) {
          lastError = data.error?.message || `Gemini ${model} error (${upstream.status})`;
          if (upstream.status === 401 || upstream.status === 403) break;
          continue;
        }
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return res.status(200).json({ id: 'gemini', content: [{ type: 'text', text }], model, role: 'assistant', skill: skill || 'general' });
      } catch (e) { lastError = `Gemini: ${e.message}`; continue; }
    }

    // ── 4. OPENROUTER — streaming, 50 free req/day (openrouter.ai) ──────────
    if (openrouterKey) {
      const orModels = [
        'google/gemini-2.0-flash-exp:free',
        'meta-llama/llama-3.3-70b-instruct:free',
        'deepseek/deepseek-chat-v3-0324:free',
        'mistralai/mistral-small-3.1-24b-instruct:free',
      ];
      for (const orModel of orModels) {
        try {
          const ctrl = new AbortController();
          const tid = setTimeout(() => ctrl.abort(), 55000);
          const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openrouterKey}`,
              'HTTP-Referer': 'https://bvmbino-ai-agent.vercel.app',
              'X-Title': 'Bvmbino AI Agent',
            },
            body: JSON.stringify({ model: orModel, messages: oaiMessages, max_tokens: Math.min(maxTok, 4096), temperature: temp, stream: true }),
            signal: ctrl.signal,
          });
          clearTimeout(tid);
          if (r.ok) {
            const short = orModel.split('/').pop().replace(':free', '');
            await pipeStream(r, short);
            return;
          }
          lastError = `OpenRouter ${orModel} error (${r.status})`;
        } catch (e) { lastError = `OpenRouter: ${e.message}`; }
      }
    }

    return res.status(500).json({
      error: lastError || 'All AI providers failed.',
      hint: 'Free keys: GROQ_KEY → groq.com | CEREBRAS_KEY → cloud.cerebras.ai | OPENROUTER_KEY → openrouter.ai',
    });
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy error', detail: err.message });
  }
}
