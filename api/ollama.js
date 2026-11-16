import { setCors, validateAppToken, isRateLimited } from './_cors.js';
import { executeOllama } from './_lib/adapters/ollama.js';

export const maxDuration = 60;

/**
 * Ollama Local Relay API
 * Enables secure browser-to-local Ollama connectivity without mixed-content or CORS blocks
 */
export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const host = (req.query?.host || req.body?.host || process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/+$/, '');

  // Rate Limiting (60 req/min)
  if (isRateLimited(req, 60, res, 'ollama')) {
    return res.status(429).json({ error: 'Rate limit exceeded (60 req/min)' });
  }

  // Mandatory App Token Authentication
  if (!validateAppToken(req)) {
    return res.status(403).json({ error: 'Unauthorized: Valid Bvmbino session required' });
  }

  // 1. Discovery / Model Tags Action
  if (req.method === 'GET' || req.query?.action === 'tags' || req.body?.action === 'tags') {
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 3000);
      const tagRes = await fetch(`${host}/api/tags`, { signal: ctrl.signal });
      clearTimeout(tid);

      if (tagRes.ok) {
        const data = await tagRes.json();
        const models = (data.models || []).map(m => ({
          name: m.name,
          size: m.size,
          modified: m.modified_at
        }));
        return res.status(200).json({ ok: true, host, models, count: models.length });
      } else {
        return res.status(502).json({ ok: false, error: `Ollama host returned ${tagRes.status}` });
      }
    } catch (e) {
      return res.status(503).json({
        ok: false,
        error: `Cannot connect to Ollama at ${host}: ${e.message}`,
        hint: 'Ensure Ollama is running (`ollama serve`) or run Ollama with OLLAMA_ORIGINS="*"'
      });
    }
  }

  // 2. Chat Execution Action
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { messages, model = 'llama3.2', system, temperature = 0.7, maxTokens = 2048 } = body || {};

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'messages array is required' });
      }

      const result = await executeOllama({
        model,
        messages,
        system,
        temperature,
        maxTokens,
        timeoutMs: 50000,
        host
      });

      return res.status(200).json({
        ok: true,
        reply: result.reply,
        model: result.model,
        provider: 'ollama'
      });
    } catch (err) {
      return res.status(500).json({ error: err.message, isLocalOffline: !!err.isLocalOffline });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
