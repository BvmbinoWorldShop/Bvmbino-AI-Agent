export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { username, password } = body || {};
    
    const u = (username || '').trim().toUpperCase();
    const p = (password || '').trim();

    // Check credentials (case-insensitive for username)
    const validUser = u === 'LATAUPE95';
    const validPass = p === 'Tyanna225' || p === '021291';

    if (validUser && validPass) {
      // Set secure auth cookie with 30-day persistence
      res.setHeader('Set-Cookie', 'bvmbino_auth=ok; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000');
      res.status(200).json({ ok: true, username: 'Lataupe95' });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (e) {
    res.status(400).json({ error: 'Bad request' });
  }
}
