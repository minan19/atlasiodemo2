import Stripe from 'stripe';

export type ProviderName = 'stripe' | 'iyzico' | 'paytr' | 'demo';

export function getProvider(): ProviderName {
  const envProvider = (process.env.PAYMENT_PROVIDER ?? '').toLowerCase();
  if (envProvider === 'iyzico') return 'iyzico';
  if (envProvider === 'paytr') return 'paytr';
  if (envProvider === 'demo') return 'demo';
  if (process.env.STRIPE_SECRET) return 'stripe';
  return 'demo';
}

export function stripeClient() {
  if (!process.env.STRIPE_SECRET) return null;
  return new Stripe(process.env.STRIPE_SECRET, { apiVersion: '2026-01-28.clover' as Stripe.LatestApiVersion });
}
