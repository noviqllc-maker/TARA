// src/hooks/useCredits.tsx
// Ask Tara question credits (consumable), SERVER-AUTHORITATIVE and auth-scoped.
// Balance + decrement are RLS-protected Supabase RPCs that key on auth.uid(); the
// device cannot touch another user's balance. Redeem runs in an edge function (needs
// the RevenueCat secret). Independent of the premium subscription and the shop.
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useSubscription } from '@/hooks/useSubscription';
import { CREDIT_PRODUCT_IDS, CREDIT_AMOUNTS, CreditProductId, BuyResult, AuthResult } from '@/lib/credits';

type CreditsState = {
  balance: number | null;                    // free-user credit balance; null when premium / signed out / unknown
  premiumRemaining: number | null;           // premium fair-use questions left this month; null when not premium
  isPremium: boolean;
  loading: boolean;
  products: Record<string, any>;             // productId -> StoreProduct (priceString)
  refresh: () => Promise<number | null>;     // re-read the server balance / monthly remaining
  authorize: () => Promise<AuthResult>;      // atomic server gate (credit decrement OR premium increment)
  buy: (productId: CreditProductId) => Promise<BuyResult>; // purchase → wait for server grant
  amountFor: (productId: string) => number;
};

const Ctx = createContext<CreditsState>({} as CreditsState);

function getPurchases(): any | null {
  try { return require('react-native-purchases').default; } catch { return null; }
}

export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [premiumRemaining, setPremiumRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Record<string, any>>({});
  const productsFetchedRef = useRef(false);
  // Premium bypasses the credit decrement and uses a monthly fair-use counter instead.
  // Read via a ref so the loadBalance/authorize callbacks stay stable.
  const { isPremium } = useSubscription();
  const isPremiumRef = useRef(isPremium);

  const loadProducts = useCallback(async () => {
    if (productsFetchedRef.current) return;
    const Purchases = getPurchases();
    if (!Purchases) return;
    try {
      const category = Purchases.PRODUCT_CATEGORY?.NON_SUBSCRIPTION ?? 'NON_SUBSCRIPTION';
      const list = await Purchases.getProducts([...CREDIT_PRODUCT_IDS], category);
      if (Array.isArray(list) && list.length) {
        const map: Record<string, any> = {};
        for (const p of list) map[p.identifier] = p;
        setProducts(map);
        productsFetchedRef.current = true;
      }
    } catch (e: any) {
      if (__DEV__) console.warn('[Credits] getProducts failed:', e?.message ?? e);
    }
  }, []);

  // Load the signed-in user's balance (free) or monthly fair-use remaining (premium).
  const loadBalance = useCallback(async (): Promise<number | null> => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      setBalance(null); setPremiumRemaining(null);
      return null;
    }
    if (isPremiumRef.current) {
      // Premium: monthly fair-use remaining is the primary metric.
      const { data, error } = await supabase.rpc('premium_ask_status');
      if (__DEV__) console.log('[Credits] premium_ask_status', { data, error });
      if (!error && typeof data === 'number') setPremiumRemaining(data);
      // Also read the credit balance for DISPLAY (premium keeps any credits as overflow).
      // ensure_user_credits is the only working reader — user_credits RLS is definer-only.
      const { data: bal } = await supabase.rpc('ensure_user_credits');
      setBalance(typeof bal === 'number' ? bal : null);
      return typeof data === 'number' ? data : null;
    }
    const { data, error } = await supabase.rpc('ensure_user_credits'); // grants 5 once, returns balance
    if (!error && typeof data === 'number') { setBalance(data); setPremiumRemaining(null); return data; }
    // Do NOT silently coalesce an error to 0 — keep balance null (shows "—", not a false
    // "out of credits").
    if (__DEV__) console.warn('[Credits] ensure_user_credits failed — balance unknown, not 0:', error?.message ?? error);
    return null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadBalance();
      await loadProducts();
      if (!cancelled) setLoading(false);
    })();
    // React to sign-in / sign-out so the balance always reflects the current user.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) loadBalance();
      else { setBalance(null); setPremiumRemaining(null); }
    });
    // Refetch on foreground: an async webhook grant may have landed while the app was
    // backgrounded (e.g. after a purchase's ~10s poll window returned 'pending'), so the
    // stale in-memory balance would otherwise keep questions locked until a full restart.
    const appSub = AppState.addEventListener('change', (s) => { if (s === 'active') loadBalance(); });
    return () => { cancelled = true; sub.subscription.unsubscribe(); appSub.remove(); };
  }, [loadBalance, loadProducts]);

  // Keep the premium ref current and re-read the right counter when the tier flips
  // (RevenueCat resolves premium asynchronously after mount).
  useEffect(() => { isPremiumRef.current = isPremium; loadBalance(); }, [isPremium, loadBalance]);

  const refresh = useCallback(async (): Promise<number | null> => loadBalance(), [loadBalance]);

  // Atomic server gate for one question.
  //  - Premium: increment the monthly fair-use counter; if capped, fall back to a credit
  //    decrement so purchased packs work as overflow, else 'fair-use'.
  //  - Free: atomic credit decrement; -1 → 'no-credits'.
  const authorize = useCallback(async (): Promise<AuthResult> => {
    if (isPremiumRef.current) {
      const { data, error } = await supabase.rpc('increment_premium_ask');
      if (__DEV__) console.log('[Credits] increment_premium_ask', { data, error });
      if (error || typeof data !== 'number') return 'error';
      if (data !== -1) { setPremiumRemaining(data); return 'ok'; }
      setPremiumRemaining(0);
      // Monthly cap reached — allow a credit pack (if any) as overflow.
      const { data: dec, error: decErr } = await supabase.rpc('decrement_credit');
      if (!decErr && typeof dec === 'number' && dec !== -1) { setBalance(dec); return 'ok'; }
      return 'fair-use';
    }
    const { data, error } = await supabase.rpc('decrement_credit');
    if (__DEV__) console.log('[Credits] decrement_credit', { data, error });
    if (error || typeof data !== 'number') return 'error'; // server/network error → not authorized
    if (data === -1) { setBalance(0); return 'no-credits'; } // out of credits
    setBalance(data);
    return 'ok';
  }, []);

  // Buy a pack: StoreKit finishes the consumable, then we wait for the SERVER to grant
  // the credits (RevenueCat webhook is async; the credits edge function is also invoked
  // as an idempotent fast-path). Poll the balance up to ~10s and report the outcome.
  const buy = useCallback(async (productId: CreditProductId): Promise<BuyResult> => {
    const Purchases = getPurchases();
    const product = products[productId];
    if (!Purchases || !product) return 'error';

    const before = (await loadBalance()) ?? 0; // balance before the purchase
    try {
      await Purchases.purchaseStoreProduct(product); // consumable; StoreKit finishes the txn
    } catch (e: any) {
      if (e?.userCancelled) return 'cancelled';
      if (__DEV__) console.warn('[Credits] purchase failed:', e?.message ?? e);
      return 'error';
    }

    // Charged. Wait for the server-side grant to land (webhook async + fast-path redeem).
    for (let i = 0; i < 5; i++) {
      try { await supabase.functions.invoke('credits', { body: {} }); } catch {}
      const now = await loadBalance();
      if (typeof now === 'number' && now > before) return 'success';
      await new Promise((r) => setTimeout(r, 2000));
    }
    return 'pending'; // charged, credits arriving shortly — do NOT treat as an error
  }, [products, loadBalance]);

  const amountFor = useCallback((productId: string) => CREDIT_AMOUNTS[productId as CreditProductId] ?? 0, []);

  return (
    <Ctx.Provider value={{ balance, premiumRemaining, isPremium, loading, products, refresh, authorize, buy, amountFor }}>
      {children}
    </Ctx.Provider>
  );
}

export const useCredits = () => useContext(Ctx);
