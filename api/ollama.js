import { setCors, validateAppToken, isRateLimited } from './_cors.js';
import { validateSafeUrl, safePinnedFetch } from './_lib/ssrf.js';
import { executeOllama } from './_lib/adapters/ollama.js';

export const maxDuration = 60;

/**
 * Secure Ollama Relay API
 * Facilitates device-to-local and LAN Ollama connectivity with SSRF protection,
 * DNS pinning, and mandatory signed-token authentication.
 */
export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Mandatory App Token Authentication
  if (!validateAppToken(req)) {
    return res.status(403).json({ error: 'Unauthorized: Valid Bvmbino session required' });
  }

  // Distributed Rate Limiting (30 req/min)
  if (await isRateLimited(req, 30, res, 'ollama')) {
    return res.status(429).json({ error: 'Rate limit exceeded (30 req/min)' });
  }

  const host = req.query?.host || req.body?.host || process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
  const cleanHost = String(host).replace(/\/+$/, '');
  const isCustomHost = cleanHost !== 'http://127.0.0.1:11434' && cleanHost !== 'http://localhost:11434';

  if (isCustomHost) {
    try {
      await validateSafeUrl(cleanHost);
    } catch (e) {
      return res.status(403).json({ error: `SSRF Protection: ${e.message}` });
    }
  }

  // 1. GET: Fetch tags / available models
  if (req.method === 'GET') {
    try {
      const url = `${cleanHost}/api/tags`;
      let tagsData;

      if (isCustomHost) {
        const response = await safePinnedFetch(url, { method: 'GET', timeoutMs: 15000 });
        if (!response.ok) {
          return res.status(response.status).json({ error: `Ollama host returned status ${response.status}` });
        }
        tagsData = JSON.parse(response.text());
      } else {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 10000);
        try {
          const resp = await fetch(url, { signal: ctrl.signal });
          if (!resp.ok) return res.status(resp.status).json({ error: `Ollama status ${resp.status}` });
          tagsData = await resp.json();
        } finally {
          clearTimeout(tid);
        }
      }

      return res.status(200).json({ ok: true, models: tagsData?.models || [] });
    } catch (e) {
      return res.status(502).json({ error: `Failed to connect to Ollama host: ${e.message}` });
    }
  }

  // 2. POST: Execute local inference
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { model, messages, system, temperature, maxTokens } = body;

      const result = await executeOllama({
        model,
        messages,
        system,
        temperature,
        maxTokens,
        host: cleanHost,
        isCustomHost
      });

      return res.status(200).json({
        ok: true,
        reply: result.reply,
        model: result.model,
        provider: 'ollama'
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
