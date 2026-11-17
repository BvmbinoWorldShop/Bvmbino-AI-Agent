import { validateAppToken } from './_cors.js';

export default function handler(req, res) {
  // Public health check returns minimal non-sensitive status
  const isAuth = validateAppToken(req);

  if (!isAuth) {
    return res.status(200).json({
      status: 'healthy',
      ok: true,
      timestamp: Date.now()
    });
  }

  // Authenticated diagnostics for administrative observability
  return res.status(200).json({
    status: 'healthy',
    ok: true,
    timestamp: Date.now(),
    uptime: Math.floor(process.uptime()),
    authenticated: true,
    platform: 'sovereign-serverless',
    services: {
      auth: 'operational',
      memory: 'operational',
      ledger: 'operational',
      chat: 'operational'
    }
  });
}
