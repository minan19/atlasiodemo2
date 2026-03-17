import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { stripeClient } from './payment.providers';

@Injectable()
export class PaymentWebhookGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: any = context.switchToHttp().getRequest();
    const sig = req.headers['stripe-signature'];
    if (!req.originalUrl.startsWith('/payments/webhook')) return true;
    const stripe = stripeClient();
    if (!stripe) return true; // demo modda guard etme
    if (!sig || !req.rawBody) throw new UnauthorizedException('Signature missing');
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new UnauthorizedException('Webhook secret missing');
    try {
      const event = stripe.webhooks.constructEvent(req.rawBody, sig, secret);
      req.stripeEvent = event;
      return true;
    } catch (e) {
      throw new UnauthorizedException('Invalid signature');
    }
  }
}
