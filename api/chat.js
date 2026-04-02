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
  const mistralKey    = process.env.MISTRAL_KEY;

  const providersLoaded = [groqKey?'groq':'', cerebrasKey?'cerebras':'', openrouterKey?'openrouter':'', mistralKey?'mistral':''].filter(Boolean).join(',');
  res.setHeader('x-providers', providersLoaded);

  if (!groqKey && !cerebrasKey && !openrouterKey && !mistralKey) {
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

    const allMessages = [
      { role: 'system', content: fullSystem },
      ...(messages || []).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    ];

    // ── REFLEX SYSTEM: auto-switch provider chain ──────────────────────────
    // Builds a flat list of all available models across all providers.
    // Smart context sizing: large models get full context, small models get truncated.
    // On 429/401/403: skip ALL remaining models for that provider instantly.
    // On 400: retry once with minimal context (system + last 2 messages).

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

    // Build flat provider chain — order = priority
    const chain = [];

    if (groqKey) {
      const base = { provider: 'groq', url: 'https://api.groq.com/openai/v1/chat/completions', key: groqKey, headers: {} };
      chain.push({ ...base, model: 'llama-3.3-70b-versatile', label: 'Groq - Llama 3.3 70B', maxOut: 8000, ctx: 'large' });
      chain.push({ ...base, model: 'llama3-70b-8192',          label: 'Groq - Llama 3 70B',   maxOut: 8000, ctx: 'medium' });
      chain.push({ ...base, model: 'llama-3.1-8b-instant',     label: 'Groq - Llama 3.1 8B',  maxOut: 8000, ctx: 'small' });
      chain.push({ ...base, model: 'gemma2-9b-it',             label: 'Groq - Gemma 2 9B',    maxOut: 8000, ctx: 'small' });
    }

    if (cerebrasKey) {
      const base = { provider: 'cerebras', url: 'https://api.cerebras.ai/v1/chat/completions', key: cerebrasKey, headers: {} };
      chain.push({ ...base, model: 'llama-3.3-70b', label: 'Cerebras - Llama 3.3 70B', maxOut: 8192, ctx: 'large' });
      chain.push({ ...base, model: 'llama3.1-8b',   label: 'Cerebras - Llama 3.1 8B',  maxOut: 8192, ctx: 'small' });
    }

    if (openrouterKey) {
      const base = { provider: 'openrouter', url: 'https://openrouter.ai/api/v1/chat/completions', key: openrouterKey, headers: { 'HTTP-Referer': 'https://bvmbino-ai-agent.vercel.app', 'X-Title': 'Bvmbino AI Agent' } };
      chain.push({ ...base, model: 'google/gemini-2.0-flash-exp:free',               label: 'OR - Gemini 2.0 Flash',  maxOut: 4096, ctx: 'large' });
      chain.push({ ...base, model: 'deepseek/deepseek-chat-v3-0324:free',            label: 'OR - DeepSeek V3',        maxOut: 4096, ctx: 'large' });
      chain.push({ ...base, model: 'meta-llama/llama-3.3-70b-instruct:free',         label: 'OR - Llama 3.3 70B',     maxOut: 4096, ctx: 'large' });
      chain.push({ ...base, model: 'mistralai/mistral-small-3.1-24b-instruct:free',  label: 'OR - Mistral Small 3.1',  maxOut: 4096, ctx: 'medium' });
      chain.push({ ...base, model: 'qwen/qwen3-235b-a22b:free',                      label: 'OR - Qwen3 235B',        maxOut: 4096, ctx: 'large' });
    }

    if (mistralKey) {
      const base = { provider: 'mistral', url: 'https://api.mistral.ai/v1/chat/completions', key: mistralKey, headers: {} };
      chain.push({ ...base, model: 'mistral-small-latest', label: 'Mistral - Small Latest', maxOut: 4096, ctx: 'medium' });
      chain.push({ ...base, model: 'open-mistral-7b',      label: 'Mistral - 7B',           maxOut: 4096, ctx: 'small' });
    }

    // Context sizing: small models get truncated messages to avoid 400 errors
    function sizeMessages(ctxSize) {
      if (ctxSize === 'large') return allMessages;
      if (ctxSize === 'medium') return [allMessages[0], ...allMessages.slice(-10)]; // system + last 10
      // small: system + last 4 messages (prevents context overflow on 8B models)
      return [allMessages[0], ...allMessages.slice(-4)];
    }

    // Minimal context for 400-retry (system + last 2 messages)
    function miniMessages() {
      return [allMessages[0], ...allMessages.slice(-2)];
    }

    let lastError = null;
    const skipProviders = new Set();

    for (const att of chain) {
      // Skip provider if we already know it's dead (quota/auth)
      if (skipProviders.has(att.provider)) continue;

      const msgs = sizeMessages(att.ctx);

      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 55000);

      try {
        const r = await fetch(att.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${att.key}`, ...att.headers },
          body: JSON.stringify({ model: att.model, messages: msgs, max_tokens: Math.min(maxTok, att.maxOut), temperature: temp, stream: true }),
          signal: ctrl.signal,
        });

        if (r.ok) { await pipeStream(r, att.label, tid); return; }
        clearTimeout(tid);

        // 429: quota exhausted → skip ALL models for this provider
        if (r.status === 429) {
          skipProviders.add(att.provider);
          lastError = `${att.provider}: quota exhausted`;
          continue;
        }

        // 401/403: bad key → skip ALL models for this provider
        if (r.status === 401 || r.status === 403) {
          skipProviders.add(att.provider);
          lastError = `${att.provider}: invalid/expired key`;
          continue;
        }

        // 400: likely context too long → retry once with minimal context
        if (r.status === 400 && msgs.length > 3) {
          const ctrl2 = new AbortController();
          const tid2 = setTimeout(() => ctrl2.abort(), 55000);
          try {
            const r2 = await fetch(att.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${att.key}`, ...att.headers },
              body: JSON.stringify({ model: att.model, messages: miniMessages(), max_tokens: Math.min(maxTok, att.maxOut), temperature: temp, stream: true }),
              signal: ctrl2.signal,
            });
            if (r2.ok) { await pipeStream(r2, att.label + ' (trimmed)', tid2); return; }
            clearTimeout(tid2);
          } catch (e2) { clearTimeout(tid2); }
        }

        lastError = `${att.label} error (${r.status})`;

      } catch (e) {
        clearTimeout(tid);
        lastError = `${att.provider}: ${e.message}`;
        // Network error on provider → skip remaining models for it
        if (e.name === 'TypeError' || e.message.includes('fetch')) {
          skipProviders.add(att.provider);
        }
      }
    }

    const isQuotaErr = lastError && (lastError.includes('quota') || lastError.includes('429'));
    return res.status(500).json({
      error: isQuotaErr
        ? `Quota exhausted on all providers. Last: ${lastError}`
        : lastError || 'All AI providers failed.',
      quota_exhausted: isQuotaErr,
      providers_skipped: [...skipProviders].join(','),
      hint: 'Free keys: GROQ_KEY -> groq.com | CEREBRAS_KEY -> cloud.cerebras.ai | OPENROUTER_KEY -> openrouter.ai | MISTRAL_KEY -> console.mistral.ai',
    });
  } catch (err) {
    console.error('Proxy error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Proxy error', detail: err.message });
  }
}
