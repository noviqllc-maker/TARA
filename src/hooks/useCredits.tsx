// src/hooks/useCredits.tsx
// Ask Tara question credits (consumable), SERVER-AUTHORITATIVE and auth-scoped.
// Balance + decrement are RLS-protected Supabase RPCs that key on auth.uid(); the
// device cannot touch another user's balance. Redeem runs in an edge function (needs
// the RevenueCat secret). Independent of the premium subscription and the shop.
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/lib/supabase';
import { CREDIT_PRODUCT_IDS, CREDIT_AMOUNTS, CreditProductId, BuyResult } from '@/lib/credits';

type CreditsState = {
  balance: number | null;                    // server balance; null when signed out / unknown
  loading: boolean;
  products: Record<string, any>;             // productId -> StoreProduct (priceString)
  refresh: () => Promise<number | null>;     // re-read the server balance; returns it
  authorize: () => Promise<boolean>;         // atomic server decrement; true = question allowed
  buy: (productId: CreditProductId) => Promise<BuyResult>; // purchase → wait for server grant
  amountFor: (productId: string) => number;
};

const Ctx = createContext<CreditsState>({} as CreditsState);

function getPurchases(): any | null {
  try { return require('react-native-purchases').default; } catch { return null; }
}

export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Record<string, any>>({});
  const productsFetchedRef = useRef(false);

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

  // Load the signed-in user's balance (server-authoritative). Returns it too.
  const loadBalance = useCallback(async (): Promise<number | null> => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { setBalance(null); return null; }
    const { data, error } = await supabase.rpc('ensure_user_credits'); // grants 5 once, returns balance
    if (!error && typeof data === 'number') {
      if (__DEV__) console.log('[Credits] server balance =', data); // TEMP: trace refreshes in Metro
      setBalance(data);
      return data;
    }
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
      else setBalance(null);
    });
    // Refetch on foreground: an async webhook grant may have landed while the app was
    // backgrounded (e.g. after a purchase's ~10s poll window returned 'pending'), so the
    // stale in-memory balance would otherwise keep questions locked until a full restart.
    const appSub = AppState.addEventListener('change', (s) => { if (s === 'active') loadBalance(); });
    return () => { cancelled = true; sub.subscription.unsubscribe(); appSub.remove(); };
  }, [loadBalance, loadProducts]);

  const refresh = useCallback(async (): Promise<number | null> => loadBalance(), [loadBalance]);

  // Atomic, RLS-scoped server decrement. Returns true only if the server authorized.
  const authorize = useCallback(async () => {
    const { data, error } = await supabase.rpc('decrement_credit');
    if (error || typeof data !== 'number') return false; // server/network error → not authorized
    if (data === -1) { setBalance(0); return false; }      // out of credits
    setBalance(data);
    return true;
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
    <Ctx.Provider value={{ balance, loading, products, refresh, authorize, buy, amountFor }}>
      {children}
    </Ctx.Provider>
  );
}

export const useCredits = () => useContext(Ctx);
