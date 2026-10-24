import { setCors, validateAppToken } from './_cors.js';

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!validateAppToken(req)) {
    return res.status(403).json({ error: 'Unauthorized: Session required' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { to, subject, body: emailBody, fromName = 'Bvmbino AI Agent' } = body || {};

    if (!to || !to.includes('@')) {
      return res.status(400).json({ error: 'Valid recipient email (to) is required.' });
    }

    const emailSubject = subject || 'Strategic Update from Bvmbino AI';
    const emailContent = emailBody || '';

    // Check for Resend API Key in environment variables
    const resendKey = process.env.RESEND_API_KEY;
    const senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';

    if (resendKey) {
      // Direct send via Resend API (Free Tier: 3,000 emails/mo)
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `${fromName} <${senderEmail}>`,
          to: [to],
          subject: emailSubject,
          text: emailContent,
          html: emailContent.replace(/\n/g, '<br>')
        })
      });

      const resendData = await resendRes.json();
      if (!resendRes.ok) {
        throw new Error(resendData.message || 'Email delivery service rejected dispatch.');
      }

      return res.status(200).json({
        ok: true,
        provider: 'resend',
        id: resendData.id,
        recipient: to,
        message: `Email successfully sent to ${to}!`
      });
    }

    // Fallback: If no RESEND_API_KEY is configured yet in Vercel settings,
    // generate mailto dispatch url so the user can send with 1 click in their mail client
    const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailContent)}`;

    return res.status(200).json({
      ok: true,
      provider: 'client_fallback',
      recipient: to,
      mailtoUrl,
      instructions: 'To enable full autonomous background sending without opening your email app, add RESEND_API_KEY to your Vercel Dashboard.'
    });

  } catch (err) {
    console.error('[Email Dispatch Error]:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
