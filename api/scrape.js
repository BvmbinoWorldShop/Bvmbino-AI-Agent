import { setCors, isRateLimited, validateAppToken, trackAbuse } from './_cors.js';
import { validateSafeUrl, safePinnedFetch } from './_lib/ssrf.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  // Rate Limit check (20 req/min)
  if (isRateLimited(req, 20, res, 'scrape')) {
    return res.status(429).json({ error: 'Rate limit exceeded (20 req/min)' });
  }

  // Mandatory App Token Authentication
  if (!validateAppToken(req)) {
    return res.status(403).json({ error: 'Unauthorized: Valid Bvmbino session required' });
  }

  // Global Abuse Protection
  if (await trackAbuse(req)) {
    return res.status(429).json({ error: 'System busy — too many requests from your IP' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { url } = body || {};
    if (!url) return res.status(400).json({ error: 'url is required' });

    // ── SSRF DEFENSE: Pre-validate domain and DNS to block private/internal addresses ──
    const safeTarget = await validateSafeUrl(url);

    let content = '';
    let usedMethod = 'jina-markdown';

    // Primary: Jina AI Reader for clean markdown formatting
    try {
      const jinaUrl = `https://r.jina.ai/${safeTarget.url}`;
      const jinaRes = await safePinnedFetch(jinaUrl, { timeoutMs: 14000 });
      if (jinaRes.ok) {
        content = jinaRes.text();
      }
    } catch (jinaErr) {
      console.warn('[Scrape] Jina reader failed, using direct DNS-pinned fetch:', jinaErr.message);
    }

    // Fallback: Direct DNS-Pinned Fetch (immune to TOCTOU DNS Rebinding)
    if (!content) {
      usedMethod = 'direct-dns-pinned';
      const directRes = await safePinnedFetch(safeTarget.url, { timeoutMs: 14000 });
      if (!directRes.ok) {
        throw new Error(`Target returned HTTP status ${directRes.status}`);
      }
      content = directRes.text();
    }

    // Trim content to 12,000 characters
    const trimmed = (content || '').slice(0, 12000).trim();
    return res.status(200).json({
      content: trimmed,
      url: safeTarget.url,
      chars: trimmed.length,
      method: usedMethod,
      pinnedIp: safeTarget.ip
    });
  } catch (err) {
    console.error('[Scrape Error]:', err.message);
    const isSsrfError = err.message.includes('SSRF Protection') || err.message.includes('Forbidden protocol');
    return res.status(isSsrfError ? 403 : 500).json({ error: err.message });
  }
}
