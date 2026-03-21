"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProvider = getProvider;
exports.stripeClient = stripeClient;
const stripe_1 = require("stripe");
function getProvider() {
    const envProvider = (process.env.PAYMENT_PROVIDER ?? '').toLowerCase();
    if (envProvider === 'iyzico')
        return 'iyzico';
    if (envProvider === 'paytr')
        return 'paytr';
    if (envProvider === 'demo')
        return 'demo';
    if (process.env.STRIPE_SECRET)
        return 'stripe';
    return 'demo';
}
function stripeClient() {
    if (!process.env.STRIPE_SECRET)
        return null;
    return new stripe_1.default(process.env.STRIPE_SECRET, { apiVersion: '2026-01-28.clover' });
}
//# sourceMappingURL=payment.providers.js.map