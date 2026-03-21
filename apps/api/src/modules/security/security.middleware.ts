import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SecurityService } from './security.service';

/**
 * Global IP deny kontrolü (honeypot tetikleyenler) ve HMAC koruması.
 */
@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  constructor(private readonly security: SecurityService) {}

  async use(req: Request & { rawBody?: Buffer }, _res: Response, next: NextFunction) {
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || '';
    // Pasif gözlem: trafik metriği topla, eşik aşılırsa event/aksiyon önerisi üret.
    void this.security.observeRequest(ip, req.path);
    void this.security.detectPatterns(ip, req.originalUrl || req.url || '');
    if (await this.security.isDenied(ip)) {
      throw new UnauthorizedException('IP temporarily blocked');
    }
    next();
  }
}
