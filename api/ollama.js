import { setCors, validateAppToken, isRateLimited } from './_cors.js';
import { executeOllama } from './_lib/adapters/ollama.js';
import { validateSafeUrl, safePinnedFetch } from './_lib/ssrf.js';

export const maxDuration = 60;

/**
 * Ollama Relay API (SSRF-Hardened)
 * Defends against Server-Side Request Forgery, DNS rebinding, and metadata exposure.
 */
export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Rate Limiting (60 req/min)
  if (isRateLimited(req, 60, res, 'ollama')) {
    return res.status(429).json({ error: 'Rate limit exceeded (60 req/min)' });
  }

  // Mandatory App Token Authentication
  if (!validateAppToken(req)) {
    return res.status(403).json({ error: 'Unauthorized: Valid Bvmbino session required' });
  }

  // Extract host from query, body, or environment
  const rawHost = req.query?.host || req.body?.host;
  let host = '';
  let isCustomHost = false;

  if (rawHost && typeof rawHost === 'string') {
    isCustomHost = true;
    try {
      // 🛡️ SSRF DEFENSE: Strictly validate protocol, hostname, DNS resolution, and IP range
      const safeTarget = await validateSafeUrl(rawHost.trim());
      host = safeTarget.url.replace(/\/+$/, '');
    } catch (ssrfErr) {
      return res.status(403).json({
        ok: false,
        error: `SSRF Protection: Access to requested host is forbidden (${ssrfErr.message})`
      });
    }
  } else {
    // System-configured default (only trusted env or local fallback)
    host = (process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/+$/, '');
  }

  // 1. Discovery / Model Tags Action
  if (req.method === 'GET' || req.query?.action === 'tags' || req.body?.action === 'tags') {
    try {
      let tagRes;
      if (isCustomHost) {
        // Use DNS-pinned safe fetch to defeat DNS rebinding TOCTOU attacks
        tagRes = await safePinnedFetch(`${host}/api/tags`, { timeoutMs: 5000 });
      } else {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 4000);
        tagRes = await fetch(`${host}/api/tags`, { signal: ctrl.signal });
        clearTimeout(tid);
      }

      if (tagRes.ok) {
        const data = typeof tagRes.text === 'function' ? JSON.parse(await tagRes.text()) : await tagRes.json();
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
        hint: 'Ensure Ollama is running (`ollama serve`) or configure OLLAMA_HOST in environment variables'
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
        host,
        isCustomHost
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
