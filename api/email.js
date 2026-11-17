import tls from 'tls';
import { setCors, isRateLimited, validateAppToken } from './_cors.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (isRateLimited(req, 20)) return res.status(429).json({ error: 'Rate limit exceeded (20 req/min)' });

  // Mandatory App Token Authentication
  if (!validateAppToken(req)) {
    return res.status(403).json({ error: 'Unauthorized: Valid Bvmbino session required' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { to, subject, body: emailBody, from: rawFrom, appPass: rawPass } = body || {};

    const user = (rawFrom || process.env.GMAIL_USER || '').trim();
    const pass = (rawPass || process.env.GMAIL_APP_PASS || process.env.GMAIL_PASS || '').replace(/\s+/g, '').trim();

    if (!user || !pass) {
      return res.status(400).json({
        error: 'Google Account credentials required. Enter your Gmail address and 16-character App Password in ⚙️ Settings (myaccount.google.com/apppasswords).'
      });
    }

    if (!to || !subject) {
      return res.status(400).json({ error: 'Recipient "to" and "subject" are required.' });
    }

    // Send email via native Gmail TLS SMTP (smtp.gmail.com:465)
    await sendGmailSmtp({
      user,
      pass,
      to,
      subject,
      content: emailBody || ''
    });

    return res.status(200).json({
      success: true,
      message: `Email dispatched successfully from ${user} to ${to}`,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('[api/email] Dispatch error:', err.message);
    return res.status(500).json({
      error: `Failed to send email: ${err.message}`,
      instructions: 'Ensure 2-Step Verification is enabled on your Google Account and generate an App Password at https://myaccount.google.com/apppasswords'
    });
  }
}

function sendGmailSmtp({ user, pass, to, subject, content }) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: 'smtp.gmail.com', port: 465, timeout: 15000 }, () => {
      // Connected
    });

    let step = 0;
    const authString = Buffer.from(`\0${user}\0${pass}`).toString('base64');
    const msgId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@bvmbino.ai>`;

    socket.on('data', (data) => {
      const resp = data.toString();
      const code = parseInt(resp.slice(0, 3), 10);

      if (code >= 400) {
        socket.destroy();
        return reject(new Error(`Gmail SMTP Error ${code}: ${resp.trim()}`));
      }

      if (step === 0 && code === 220) {
        // Banner received -> send EHLO
        socket.write(`EHLO bvmbino.ai\r\n`);
        step = 1;
      } else if (step === 1 && code === 250) {
        // EHLO ok -> send AUTH PLAIN
        socket.write(`AUTH PLAIN ${authString}\r\n`);
        step = 2;
      } else if (step === 2 && code === 235) {
        // Auth successful -> MAIL FROM
        socket.write(`MAIL FROM:<${user}>\r\n`);
        step = 3;
      } else if (step === 3 && code === 250) {
        // MAIL FROM ok -> RCPT TO
        socket.write(`RCPT TO:<${to}>\r\n`);
        step = 4;
      } else if (step === 4 && code === 250) {
        // RCPT TO ok -> DATA
        socket.write(`DATA\r\n`);
        step = 5;
      } else if (step === 5 && code === 354) {
        // Ready for content
        const rawMail = [
          `From: "Bvmbino Sovereign Agent" <${user}>`,
          `To: <${to}>`,
          `Subject: ${subject}`,
          `Message-ID: ${msgId}`,
          `Date: ${new Date().toUTCString()}`,
          `MIME-Version: 1.0`,
          `Content-Type: text/plain; charset=UTF-8`,
          `Content-Transfer-Encoding: 8bit`,
          ``,
          content,
          `\r\n.\r\n`
        ].join('\r\n');

        socket.write(rawMail);
        step = 6;
      } else if (step === 6 && code === 250) {
        // Message accepted -> QUIT
        socket.write(`QUIT\r\n`);
        step = 7;
        resolve();
      }
    });

    socket.on('error', (err) => {
      reject(err);
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Gmail SMTP connection timed out (15s)'));
    });
  });
}
