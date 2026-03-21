"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentWebhookGuard = void 0;
const common_1 = require("@nestjs/common");
const payment_providers_1 = require("./payment.providers");
let PaymentWebhookGuard = class PaymentWebhookGuard {
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const sig = req.headers['stripe-signature'];
        if (!req.originalUrl.startsWith('/payments/webhook'))
            return true;
        const stripe = (0, payment_providers_1.stripeClient)();
        if (!stripe)
            return true;
        if (!sig || !req.rawBody)
            throw new common_1.UnauthorizedException('Signature missing');
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret)
            throw new common_1.UnauthorizedException('Webhook secret missing');
        try {
            const event = stripe.webhooks.constructEvent(req.rawBody, sig, secret);
            req.stripeEvent = event;
            return true;
        }
        catch (e) {
            throw new common_1.UnauthorizedException('Invalid signature');
        }
    }
};
exports.PaymentWebhookGuard = PaymentWebhookGuard;
exports.PaymentWebhookGuard = PaymentWebhookGuard = __decorate([
    (0, common_1.Injectable)()
], PaymentWebhookGuard);
//# sourceMappingURL=payment.webhook.guard.js.map