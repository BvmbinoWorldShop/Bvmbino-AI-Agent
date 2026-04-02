import { setCors, isRateLimited, validateMessages } from './_cors.js';
import { CORE, SKILLS, detectSkill, getMaxTokens } from './lib/prompts.js';

// Vercel Fluid Compute — extends timeout to 60s on free Hobby plan
export const maxDuration = 60;

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (isRateLimited(req)) return res.status(429).json({ error: 'Rate limit exceeded (30 req/min)' });

  // ── FREE API KEYS (add to Vercel env vars) ───────────────────────────────
  const groqKey       = process.env.GROQ_KEY;         // groq.com — 14,400 req/day FREE FOREVER
  const cerebrasKey   = process.env.CEREBRAS_KEY;     // cloud.cerebras.ai — 1M tokens/day FREE FOREVER
  const geminiKey1    = process.env.GEMINI_KEY;        // aistudio.google.com — 1,500 req/day FREE FOREVER
  const geminiKey2    = process.env.GEMINI_KEY_2;      // second Gemini key — +1,500/day FREE FOREVER
  const openrouterKey = process.env.OPENROUTER_KEY;   // openrouter.ai — 50 free req/day, 28+ free models

  // Debug: tell the frontend which keys are loaded (safe — no key values exposed)
  res.setHeader('x-providers', [groqKey?'groq':'',cerebrasKey?'cerebras':'',geminiKey1?'gemini1':'',geminiKey2?'gemini2':'',openrouterKey?'openrouter':''].filter(Boolean).join(','));

  if (!groqKey && !cerebrasKey && !geminiKey1 && !openrouterKey) {
    return res.status(500).json({
      error: 'No AI key configured.',
      hint: 'Add GROQ_KEY free at groq.com (fastest, 14k req/day) or CEREBRAS_KEY at cloud.cerebras.ai (1M tokens/day) to Vercel env vars.',
    });
  }

  // Per-request timeout — prevents Vercel cold-start cascade failures
  function fetchWithTimeout(url, options, ms = 9000) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(id));
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

    // OpenAI-compatible messages (shared by Groq, Cerebras, OpenRouter)
    const oaiMessages = [
      { role: 'system', content: fullSystem },
      ...(messages || []).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    ];

    let lastError = null;

    // ── 1. GROQ — fastest, 14,400 req/day free (groq.com) ───────────────────
    if (groqKey) {
      try {
        const r = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
          body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: oaiMessages, max_tokens: Math.min(maxTok, 8000), temperature: temp }),
        });
        const d = await r.json();
        if (r.ok) {
          const text = d.choices?.[0]?.message?.content || '';
          return res.status(200).json({ id: 'groq', content: [{ type: 'text', text }], model: 'Groq · Llama 3.3 70B', role: 'assistant', skill: skill || 'general' });
        }
        lastError = d.error?.message || `Groq error (${r.status})`;
        if (r.status === 401 || r.status === 403) lastError = 'Groq: invalid key — add GROQ_KEY at groq.com (free)';
      } catch (e) { lastError = `Groq timeout: ${e.message}`; }
    }

    // ── 2. CEREBRAS — 1M tokens/day free, ultra-fast (cloud.cerebras.ai) ────
    if (cerebrasKey) {
      try {
        const r = await fetchWithTimeout('https://api.cerebras.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cerebrasKey}` },
          body: JSON.stringify({ model: 'llama-3.3-70b', messages: oaiMessages, max_tokens: Math.min(maxTok, 8192), temperature: temp }),
        });
        const d = await r.json();
        if (r.ok) {
          const text = d.choices?.[0]?.message?.content || '';
          return res.status(200).json({ id: 'cerebras', content: [{ type: 'text', text }], model: 'Cerebras · Llama 70B', role: 'assistant', skill: skill || 'general' });
        }
        lastError = d.error?.message || `Cerebras error (${r.status})`;
      } catch (e) { lastError = `Cerebras timeout: ${e.message}`; }
    }

    // ── 3. GEMINI — 1,500 req/day per key (aistudio.google.com) ─────────────
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
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const upstream = await fetchWithTimeout(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiBody) });
        const data = await upstream.json();
        if (!upstream.ok) {
          lastError = data.error?.message || `Gemini ${model} error (${upstream.status})`;
          if (upstream.status === 401 || upstream.status === 403) break;
          continue;
        }
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return res.status(200).json({ id: 'gemini', content: [{ type: 'text', text }], model, role: 'assistant', skill: skill || 'general' });
      } catch (e) { lastError = `Gemini timeout: ${e.message}`; continue; }
    }

    // ── 4. OPENROUTER — 50 free req/day, 28+ free models (openrouter.ai) ────
    if (openrouterKey) {
      const orModels = [
        'google/gemini-2.0-flash-exp:free',
        'meta-llama/llama-3.3-70b-instruct:free',
        'deepseek/deepseek-chat-v3-0324:free',
        'mistralai/mistral-small-3.1-24b-instruct:free',
      ];
      for (const orModel of orModels) {
        try {
          const r = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openrouterKey}`,
              'HTTP-Referer': 'https://bvmbino-ai-agent.vercel.app',
              'X-Title': 'Bvmbino AI Agent',
            },
            body: JSON.stringify({ model: orModel, messages: oaiMessages, max_tokens: Math.min(maxTok, 4096), temperature: temp }),
          });
          const d = await r.json();
          if (r.ok) {
            const text = d.choices?.[0]?.message?.content || '';
            const short = orModel.split('/').pop().replace(':free', '');
            return res.status(200).json({ id: 'openrouter', content: [{ type: 'text', text }], model: short, role: 'assistant', skill: skill || 'general' });
          }
          lastError = d.error?.message || `OpenRouter ${orModel} error (${r.status})`;
        } catch (e) { lastError = `OpenRouter timeout: ${e.message}`; }
      }
    }

    // All providers exhausted
    return res.status(500).json({
      error: lastError || 'All AI providers failed.',
      hint: 'Free keys: GROQ_KEY → groq.com | CEREBRAS_KEY → cloud.cerebras.ai | OPENROUTER_KEY → openrouter.ai',
    });
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy error', detail: err.message });
  }
}
