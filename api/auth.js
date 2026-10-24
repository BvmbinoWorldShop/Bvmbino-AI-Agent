export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { username, password } = body || {};
    
    // Auth check against hardcoded keys
    if (username === 'LATAUPE95' && password === '021291') {
      res.setHeader('Set-Cookie', 'bvmbino_auth=ok; Path=/; HttpOnly; Secure; SameSite=Strict');
      res.status(200).json({ ok: true });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (e) {
    res.status(400).json({ error: 'Bad request' });
  }
}
