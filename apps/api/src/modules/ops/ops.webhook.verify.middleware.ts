import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Ops webhook HMAC doğrulayıcı (tüketici tarafı). Gönderen: x-ops-timestamp + x-ops-signature
 * Mesaj: `${ts}.${rawBody}` formatında hmac sha256
 * Tolerans: 5 dk (configurable: OPS_WEBHOOK_TOLERANCE)
 */
@Injectable()
export class OpsWebhookVerifyMiddleware implements NestMiddleware {
  async use(req: Request & { rawBody?: Buffer }, res: Response, next: NextFunction) {
    const secret = process.env.OPS_WEBHOOK_SECRET;
    if (!secret) return next(); // fallback: doğrulamadan geçir

    const sig = req.headers['x-ops-signature']?.toString();
    const ts = req.headers['x-ops-timestamp']?.toString();
    if (!sig || !ts) throw new UnauthorizedException('signature missing');

    const tolerance = Number(process.env.OPS_WEBHOOK_TOLERANCE ?? 300);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - Number(ts)) > tolerance) throw new UnauthorizedException('timestamp out of range');

    const body = req.rawBody ?? Buffer.from('');
    const msg = `${ts}.${body.toString()}`;
    const hmac = createHmac('sha256', secret).update(msg).digest();
    const sigBuf = Buffer.from(sig, 'hex');
    if (hmac.length !== sigBuf.length || !timingSafeEqual(hmac, sigBuf)) {
      throw new UnauthorizedException('invalid signature');
    }
    return next();
  }
}
