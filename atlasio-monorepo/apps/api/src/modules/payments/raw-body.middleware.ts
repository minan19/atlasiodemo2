import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Raw body middleware for webhook signature verification (Stripe-like providers).
 */
@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  use(req: Request & { rawBody?: Buffer }, res: Response, next: () => void) {
    if (req.originalUrl.startsWith('/payments/webhook')) {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        req.rawBody = Buffer.concat(chunks);
        next();
      });
    } else {
      next();
    }
  }
}
