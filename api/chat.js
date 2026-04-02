import { setCors, isRateLimited, validateMessages } from './_cors.js';
import { CORE, SKILLS, detectSkill, getMaxTokens } from './lib/prompts.js';

export const maxDuration = 60;

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (isRateLimited(req)) return res.status(429).json({ error: 'Rate limit exceeded (30 req/min)' });

  const groqKey       = process.env.GROQ_KEY;
  const cerebrasKey   = process.env.CEREBRAS_KEY;
  const openrouterKey = process.env.OPENROUTER_KEY;

  const providersLoaded = [groqKey?'groq':'', cerebrasKey?'cerebras':'', openrouterKey?'openrouter':''].filter(Boolean).join(',');
  res.setHeader('x-providers', providersLoaded);

  if (!groqKey && !cerebrasKey && !openrouterKey) {
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

    // Pipe OpenAI SSE stream to client.
    // FIX: timeoutId is passed in and cleared INSIDE finally — keeps abort active during entire stream.
    // FIX: modelName is sanitized to ASCII-only to prevent ERR_INVALID_CHAR in HTTP headers.
    async function pipeStream(upstream, modelName, timeoutId) {
      const safeModel = modelName.replace(/[^\x20-\x7E]/g, '-');
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('x-model', safeModel);
      try {
        const reader = upstream.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        res.end();
      }
    }

    let lastError = null;

    // ── 1. GROQ — streaming, 14,400 req/day free ────────────────────────────
    if (groqKey) {
      const groqModels = [
        { id: 'llama-3.3-70b-versatile', label: 'Groq - Llama 3.3 70B' },
        { id: 'llama-3.1-70b-versatile', label: 'Groq - Llama 3.1 70B' },
        { id: 'mixtral-8x7b-32768',      label: 'Groq - Mixtral 8x7B'  },
      ];
      for (const { id, label } of groqModels) {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 55000);
        try {
          const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
            body: JSON.stringify({ model: id, messages: oaiMessages, max_tokens: Math.min(maxTok, 8000), temperature: temp, stream: true }),
            signal: ctrl.signal,
          });
          if (r.ok) { await pipeStream(r, label, tid); return; }
          clearTimeout(tid);
          lastError = `Groq ${id} error (${r.status})`;
          if (r.status === 401 || r.status === 403) { lastError = 'Groq: invalid key'; break; }
        } catch (e) { clearTimeout(tid); lastError = `Groq: ${e.message}`; }
      }
    }

    // ── 2. CEREBRAS — streaming, 1M tokens/day free ─────────────────────────
    if (cerebrasKey) {
      const cerebrasModels = [
        { id: 'llama-3.3-70b', label: 'Cerebras - Llama 3.3 70B' },
        { id: 'llama3.1-70b',  label: 'Cerebras - Llama 3.1 70B' },
        { id: 'llama3.1-8b',   label: 'Cerebras - Llama 3.1 8B'  },
      ];
      for (const { id, label } of cerebrasModels) {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 55000);
        try {
          const r = await fetch('https://api.cerebras.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cerebrasKey}` },
            body: JSON.stringify({ model: id, messages: oaiMessages, max_tokens: Math.min(maxTok, 8192), temperature: temp, stream: true }),
            signal: ctrl.signal,
          });
          if (r.ok) { await pipeStream(r, label, tid); return; }
          clearTimeout(tid);
          lastError = `Cerebras ${id} error (${r.status})`;
          if (r.status === 401 || r.status === 403) break;
        } catch (e) { clearTimeout(tid); lastError = `Cerebras: ${e.message}`; }
      }
    }

    // ── 3. OPENROUTER — streaming, free models available ────────────────────
    if (openrouterKey) {
      const orModels = [
        'google/gemini-2.0-flash-exp:free',
        'deepseek/deepseek-r1:free',
        'deepseek/deepseek-chat-v3-0324:free',
        'meta-llama/llama-3.3-70b-instruct:free',
        'mistralai/mistral-small-3.1-24b-instruct:free',
        'qwen/qwen3-235b-a22b:free',
      ];
      for (const orModel of orModels) {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 55000);
        try {
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
          if (r.ok) {
            const short = 'OR - ' + orModel.split('/').pop().replace(':free', '');
            await pipeStream(r, short, tid);
            return;
          }
          clearTimeout(tid);
          lastError = `OpenRouter ${orModel} (${r.status})`;
        } catch (e) { clearTimeout(tid); lastError = `OpenRouter: ${e.message}`; }
      }
    }

    return res.status(500).json({
      error: lastError || 'All AI providers failed.',
      hint: 'Free keys: GROQ_KEY -> groq.com | CEREBRAS_KEY -> cloud.cerebras.ai | OPENROUTER_KEY -> openrouter.ai',
    });
  } catch (err) {
    console.error('Proxy error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Proxy error', detail: err.message });
  }
}
