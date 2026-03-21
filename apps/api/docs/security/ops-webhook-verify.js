// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
// Basit ops webhook HMAC doğrulayıcı (Express middleware örneği)
const crypto = require('crypto');

function verifyOpsWebhook(req, res, next) {
  const secret = process.env.OPS_WEBHOOK_SECRET;
  if (!secret) return res.status(500).json({ error: 'secret missing' });
  const sig = req.get('x-ops-signature');
  const ts = req.get('x-ops-timestamp');
  if (!sig || !ts) return res.status(401).json({ error: 'signature missing' });
  // 5 dk tolerans
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(ts)) > 300) return res.status(401).json({ error: 'timestamp out of range' });

  const body = req.rawBody ?? '';
  const msg = `${ts}.${body}`;
  const hmac = crypto.createHmac('sha256', secret).update(msg).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(sig))) {
    return res.status(401).json({ error: 'bad signature' });
  }
  next();
}

module.exports = verifyOpsWebhook;
