import { setCors, isRateLimited, validateAppToken, trackAbuse } from './_cors.js';
import { validateSafeUrl } from './_lib/ssrf.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  // Rate Limit check
  if (isRateLimited(req, 20)) return res.status(429).json({ error: 'Rate limit exceeded (20 req/min)' });

  // App Token Security
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

    // ── SSRF DEFENSE: Validate URL, DNS resolution, and IP range ───────────
    const safeTarget = await validateSafeUrl(url);

    // Fetch with manual redirect validation to prevent redirect-based SSRF & DNS rebinding
    let currentUrl = safeTarget.url;
    let redirectHops = 0;
    const maxRedirects = 3;

    // Use Jina AI Reader for clean markdown extraction if target is public and safe
    const jinaUrl = `https://r.jina.ai/${currentUrl}`;
    const jinaCtrl = new AbortController();
    const jinaTid = setTimeout(() => jinaCtrl.abort(), 16000);

    let content = '';
    try {
      const response = await fetch(jinaUrl, {
        headers: { 'Accept': 'text/plain', 'X-Return-Format': 'markdown', 'X-Timeout': '15' },
        signal: jinaCtrl.signal,
      });
      clearTimeout(jinaTid);

      if (response.ok) {
        content = await response.text();
      }
    } catch (jinaErr) {
      clearTimeout(jinaTid);
      console.warn('[Scrape] Jina fetch failed, attempting safe direct fetch:', jinaErr.message);
    }

    // Direct fetch fallback if Jina was unavailable
    if (!content) {
      while (redirectHops <= maxRedirects) {
        const fetchCtrl = new AbortController();
        const fetchTid = setTimeout(() => fetchCtrl.abort(), 12000);

        const resp = await fetch(currentUrl, {
          method: 'GET',
          redirect: 'manual', // Never auto-follow redirects blindly
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 BvmbinoBot/1.0',
            'Accept': 'text/html,application/xhtml+xml,text/plain;q=0.9'
          },
          signal: fetchCtrl.signal
        });
        clearTimeout(fetchTid);

        if ([301, 302, 303, 307, 308].includes(resp.status)) {
          const loc = resp.headers.get('location');
          if (!loc) throw new Error('Redirect returned without Location header');

          const nextUrlObj = new URL(loc, currentUrl);
          // Strictly validate redirect target before following!
          const validatedRedirect = await validateSafeUrl(nextUrlObj.toString());
          currentUrl = validatedRedirect.url;
          redirectHops++;
          continue;
        }

        if (!resp.ok) {
          throw new Error(`Target returned status ${resp.status}`);
        }

        content = await resp.text();
        break;
      }
    }

    // Trim content to 12,000 chars to avoid memory bloat
    const trimmed = (content || '').slice(0, 12000).trim();
    return res.status(200).json({
      content: trimmed,
      url: currentUrl,
      chars: trimmed.length,
      redirects: redirectHops
    });
  } catch (err) {
    console.error('[Scrape Error]:', err.message);
    const isSsrfError = err.message.includes('SSRF Protection') || err.message.includes('Forbidden protocol');
    return res.status(isSsrfError ? 403 : 500).json({ error: err.message });
  }
}
