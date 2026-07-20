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

// Outcome of a credit-pack purchase:
//  'success'   – charged AND the server balance increased within the wait window
//  'cancelled' – user backed out of the StoreKit sheet (silent)
//  'error'     – StoreKit / purchase error (nothing charged)
//  'pending'   – charged but the async grant (webhook) hadn't landed in time
export type BuyResult = 'success' | 'cancelled' | 'error' | 'pending';

// Outcome of authorizing one Ask Tara question:
//  'ok'         – authorized (free: a credit was spent; premium: monthly counter incremented,
//                 or a credit spent as overflow past the monthly cap)
//  'no-credits' – free user with a 0 balance → show the buy-credits screen
//  'fair-use'   – premium user who hit the 100/month cap AND has no credits → fair-use screen
//  'error'      – server/network error (not authorized; nothing spent)
export type AuthResult = 'ok' | 'no-credits' | 'fair-use' | 'error';
