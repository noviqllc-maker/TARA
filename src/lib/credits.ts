// src/lib/credits.ts
// Client bridge to the server-authoritative credits function. The device holds NO
// authority over the balance — every call round-trips to Supabase. Balance is only
// ever what the server returns.
import Constants from 'expo-constants';

// Consumable credit packs. IDs must match App Store Connect / RevenueCat exactly.
export const CREDIT_PRODUCT_IDS = ['ask_credits_5', 'ask_credits_10', 'ask_credits_25'] as const;
export type CreditProductId = (typeof CREDIT_PRODUCT_IDS)[number];
export const CREDIT_AMOUNTS: Record<CreditProductId, number> = {
  ask_credits_5: 5,
  ask_credits_10: 10,
  ask_credits_25: 25,
};

// The credits function lives beside tara-ai on the same Supabase project.
function creditsEndpoint(): string | undefined {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
  const base = extra.taraAiUrl;
  return base ? base.replace(/\/tara-ai\/?$/, '/credits') : undefined;
}

async function callCredits(action: 'balance' | 'decrement' | 'redeem', appUserId: string) {
  const url = creditsEndpoint();
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, appUserId }),
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  } catch {
    return null; // network error
  }
}

// The RevenueCat app_user_id is the account key the server uses for all credit ops.
export async function getAppUserId(): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Purchases = require('react-native-purchases').default;
    const id = await Purchases.getAppUserID();
    return id ? String(id) : null;
  } catch {
    return null;
  }
}

// Server grants the one-time 5-credit bonus on first call, then returns the balance.
export async function fetchBalance(appUserId: string): Promise<number | null> {
  const r = await callCredits('balance', appUserId);
  return r && typeof r.data?.balance === 'number' ? r.data.balance : null;
}

export type DecrementResult = { ok: true; balance: number } | { ok: false; balance: 0 };
// Atomic server decrement — the ONLY authorization for a question. `null` = server/
// network error (caller must NOT authorize the question).
export async function decrementCredit(appUserId: string): Promise<DecrementResult | null> {
  const r = await callCredits('decrement', appUserId);
  if (!r) return null;
  if (r.status === 402 || r.data?.ok === false) return { ok: false, balance: 0 };
  if (r.data?.ok === true && typeof r.data.balance === 'number') return { ok: true, balance: r.data.balance };
  return null;
}

// After a purchase: the server re-verifies with RevenueCat and credits any uncredited
// transactions (idempotent). Returns the new balance.
export async function redeemPurchases(appUserId: string): Promise<number | null> {
  const r = await callCredits('redeem', appUserId);
  return r && typeof r.data?.balance === 'number' ? r.data.balance : null;
}
