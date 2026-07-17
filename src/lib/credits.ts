// src/lib/credits.ts
// Consumable credit-pack constants. All credit balance operations are performed
// through Supabase (auth-scoped RPCs + the redeem edge function) in useCredits —
// the device never holds authority over the balance.

// IDs must match App Store Connect / RevenueCat exactly.
export const CREDIT_PRODUCT_IDS = ['ask_credits_5', 'ask_credits_10', 'ask_credits_25'] as const;
export type CreditProductId = (typeof CREDIT_PRODUCT_IDS)[number];
export const CREDIT_AMOUNTS: Record<CreditProductId, number> = {
  ask_credits_5: 5,
  ask_credits_10: 10,
  ask_credits_25: 25,
};
