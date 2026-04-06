module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { username, password } = body || {};
    if (username === 'LATAUPE95' && password === '021291') {
      // Secure HttpOnly cookie — 1 year expiry
      res.setHeader('Set-Cookie', 'bvmbino_auth=ok; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=31536000');
      res.status(200).json({ ok: true });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (e) {
    res.status(400).json({ error: 'Bad request' });
  }
};
