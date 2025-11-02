import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

export const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    priceId: '',
    features: [
      '10 API requests per month',
      'Basic support',
      'Community access',
    ],
  },
  PRO: {
    name: 'Pro',
    price: 29,
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    features: [
      '1,000 API requests per month',
      'Priority support',
      'Advanced analytics',
      'Custom integrations',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 99,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
    features: [
      'Unlimited API requests',
      '24/7 dedicated support',
      'Custom deployment',
      'SLA guarantee',
      'White-label options',
    ],
  },
} as const;

export type PlanType = keyof typeof PLANS;
