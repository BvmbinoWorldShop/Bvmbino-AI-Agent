export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    node: process.version,
    env: process.env.NODE_ENV,
    hasJwtSecret: !!process.env.JWT_SECRET,
    jwtSecretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
    hasAdminUser: !!process.env.ADMIN_USER,
    hasAdminPass: !!(process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORDS),
    vercel: !!process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV || 'unknown'
  });
}
