import dns from 'dns/promises';
import http from 'http';
import https from 'https';
import tls from 'tls';
import { isIPv4, isIPv6 } from 'net';

/**
 * Checks if an IPv4 address is in a private, loopback, link-local, multicast, or reserved range.
 */
export function isPrivateIPv4(ip) {
  if (!isIPv4(ip)) return true;
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => isNaN(n) || n < 0 || n > 255)) return true;

  const [a, b, c, d] = parts;
  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;
  // 10.0.0.0/8 (Private network)
  if (a === 10) return true;
  // 100.64.0.0/10 (Shared address / CGNAT)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 169.254.0.0/16 (Link-local & cloud metadata)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12 (Private network)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.0.0.0/24 (IETF protocol assignments)
  if (a === 192 && b === 0 && c === 0) return true;
  // 192.0.2.0/24 (TEST-NET-1)
  if (a === 192 && b === 0 && c === 2) return true;
  // 192.88.99.0/24 (6to4 relay anycast)
  if (a === 192 && b === 88 && c === 99) return true;
  // 192.168.0.0/16 (Private network)
  if (a === 192 && b === 168) return true;
  // 198.18.0.0/15 (Network benchmark tests)
  if (a === 198 && (b === 18 || b === 19)) return true;
  // 198.51.100.0/24 (TEST-NET-2)
  if (a === 198 && b === 51 && c === 100) return true;
  // 203.0.113.0/24 (TEST-NET-3)
  if (a === 203 && b === 0 && c === 113) return true;
  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true;
  // 240.0.0.0/4 (Reserved)
  if (a >= 240) return true;
  // 255.255.255.255 (Broadcast)
  if (a === 255 && b === 255 && c === 255 && d === 255) return true;

  return false;
}

/**
 * Checks if an IPv6 address is in a private, loopback, link-local, multicast, or reserved range.
 */
export function isPrivateIPv6(ip) {
  const norm = ip.toLowerCase().trim();
  // Loopback ::1
  if (norm === '::1' || norm === '0:0:0:0:0:0:0:1') return true;
  // Unspecified ::
  if (norm === '::' || norm === '0:0:0:0:0:0:0:0') return true;
  // IPv4-mapped IPv6 (::ffff:192.168.1.1 or ::ffff:7f00:1)
  if (norm.startsWith('::ffff:')) {
    const v4Part = norm.slice(7);
    if (isIPv4(v4Part)) return isPrivateIPv4(v4Part);
    return true;
  }
  // Unique Local Address (fc00::/7 -> fc00 to fdff)
  if (/^f[cd][0-9a-f]{2}:/i.test(norm) || norm.startsWith('fc') || norm.startsWith('fd')) return true;
  // Link-Local (fe80::/10 -> fe80 to febf)
  if (/^fe[89ab][0-9a-f]:/i.test(norm) || norm.startsWith('fe80')) return true;
  // Multicast (ff00::/8)
  if (norm.startsWith('ff')) return true;
  // Discard / benchmark prefixes
  if (norm.startsWith('100::') || norm.startsWith('2001:db8:')) return true;

  return false;
}

/**
 * Check if any IP (v4 or v6) is private or reserved
 */
export function isPrivateIp(ip) {
  if (!ip || typeof ip !== 'string') return true;
  const clean = ip.trim().replace(/^\[|\]$/g, '');
  if (isIPv4(clean)) return isPrivateIPv4(clean);
  if (isIPv6(clean)) return isPrivateIPv6(clean);
  return true;
}

/**
 * Validates that a raw URL uses a permitted protocol and does not resolve to private/internal IPs
 */
export async function validateSafeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('Invalid URL: empty or not a string');
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error('Invalid URL format');
  }

  // Enforce HTTP / HTTPS protocols only
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Forbidden protocol: ${parsed.protocol}. Only HTTP and HTTPS are permitted.`);
  }

  const rawHost = parsed.hostname.toLowerCase().trim().replace(/^\[|\]$/g, '');

  // Block obvious localhost and cloud metadata hostnames
  const BLOCKED_HOSTS = [
    'localhost',
    'metadata.google.internal',
    'metadata',
    'instance-data',
    '169.254.169.254',
  ];
  if (BLOCKED_HOSTS.includes(rawHost) || rawHost.endsWith('.internal') || rawHost.endsWith('.local') || rawHost.endsWith('.localhost')) {
    throw new Error('SSRF Protection: Access to internal or metadata hostname is forbidden');
  }

  // If host is already an IP address, validate directly
  if (isIPv4(rawHost) || isIPv6(rawHost)) {
    if (isPrivateIp(rawHost)) {
      throw new Error(`SSRF Protection: Access to restricted private/internal IP address is forbidden: ${rawHost}`);
    }
    return { url: parsed.toString(), ip: rawHost, hostname: rawHost, parsed };
  }

  // Resolve hostname via DNS to prevent DNS rebinding attacks
  let addresses = [];
  try {
    addresses = await dns.lookup(rawHost, { all: true });
  } catch (err) {
    throw new Error(`DNS resolution failed for hostname "${rawHost}": ${err.message}`);
  }

  if (!addresses || addresses.length === 0) {
    throw new Error(`No IP addresses resolved for hostname "${rawHost}"`);
  }

  for (const addr of addresses) {
    const ip = addr.address;
    if (isPrivateIp(ip)) {
      throw new Error(`SSRF Protection: Hostname "${rawHost}" resolved to restricted private/internal IP: ${ip}`);
    }
  }

  return {
    url: parsed.toString(),
    ip: addresses[0].address,
    hostname: rawHost,
    allIps: addresses.map(a => a.address),
    parsed
  };
}

/**
 * DNS-Pinned SSRF-Safe Fetcher
 * Connects directly to the pre-validated IP address, preventing TOCTOU DNS rebinding,
 * while maintaining TLS SNI and Certificate Identity Verification.
 */
export async function safePinnedFetch(rawUrl, options = {}, hopCount = 0) {
  if (hopCount > 3) {
    throw new Error('SSRF Protection: Exceeded maximum redirect limit (3 hops)');
  }

  const { parsed, ip, hostname } = await validateSafeUrl(rawUrl);
  const isHttps = parsed.protocol === 'https:';
  const defaultPort = isHttps ? 443 : 80;
  const port = parsed.port ? parseInt(parsed.port, 10) : defaultPort;
  const timeoutMs = options.timeoutMs || 15000;
  const maxBytes = options.maxBytes || 5 * 1024 * 1024; // 5 MB

  return new Promise((resolve, reject) => {
    let timer = null;
    let req = null;

    const requestOptions = {
      host: ip, // Socket connects DIRECTLY to the pinned IP (defeats DNS rebinding)
      port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 BvmbinoBot/1.0',
        'Accept': 'text/html,application/xhtml+xml,text/plain;q=0.9',
        ...options.headers,
        'Host': parsed.host // Preserves virtual host routing
      }
    };

    if (isHttps) {
      requestOptions.servername = hostname; // SNI sends the domain name for TLS handshake
      requestOptions.rejectUnauthorized = true; // Enforces trusted certificate authority
      requestOptions.checkServerIdentity = (host, cert) => {
        // Strictly verify certificate matches the domain hostname, NOT the pinned IP
        return tls.checkServerIdentity(hostname, cert);
      };
    }

    const client = isHttps ? https : http;

    req = client.request(requestOptions, async (res) => {
      clearTimeout(timer);

      // Handle HTTP Redirects with strict re-validation & re-pinning
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        const location = res.headers['location'];
        if (!location) {
          return reject(new Error('Redirect returned without Location header'));
        }
        res.resume(); // Discard redirect body
        const nextUrl = new URL(location, parsed.toString()).toString();
        try {
          const redirectRes = await safePinnedFetch(nextUrl, options, hopCount + 1);
          return resolve(redirectRes);
        } catch (e) {
          return reject(e);
        }
      }

      const chunks = [];
      let totalBytes = 0;

      res.on('data', (chunk) => {
        totalBytes += chunk.length;
        if (totalBytes > maxBytes) {
          req.destroy(new Error(`Response body exceeded maximum allowed size (${maxBytes} bytes)`));
          return;
        }
        chunks.push(chunk);
      });

      res.on('end', () => {
        const bodyBuffer = Buffer.concat(chunks);
        resolve({
          status: res.statusCode,
          headers: res.headers,
          url: parsed.toString(),
          pinnedIp: ip,
          buffer: bodyBuffer,
          text: () => bodyBuffer.toString('utf8'),
          ok: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    timer = setTimeout(() => {
      req.destroy(new Error(`safePinnedFetch timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}
