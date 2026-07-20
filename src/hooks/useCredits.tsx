// src/hooks/useCredits.tsx
// Ask Tara question credits (consumable), SERVER-AUTHORITATIVE and auth-scoped.
// Balance + decrement are RLS-protected Supabase RPCs that key on auth.uid(); the
// device cannot touch another user's balance. Redeem runs in an edge function (needs
// the RevenueCat secret). Independent of the premium subscription and the shop.
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { CREDIT_PRODUCT_IDS, CREDIT_AMOUNTS, CreditProductId } from '@/lib/credits';

type CreditsState = {
  balance: number | null;                    // server balance; null when signed out / unknown
  loading: boolean;
  products: Record<string, any>;             // productId -> StoreProduct (priceString)
  refresh: () => Promise<number | null>;     // re-read the server balance; returns it
  authorize: () => Promise<boolean>;         // atomic server decrement; true = question allowed
  buy: (productId: CreditProductId) => Promise<boolean>; // purchase → server verify → credit
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
    if (!error && typeof data === 'number') { setBalance(data); return data; }
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
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
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

  // Buy a pack: StoreKit finishes the consumable, THEN the server verifies with
  // RevenueCat and credits it (idempotent). Never grants from client state alone.
  const buy = useCallback(async (productId: CreditProductId) => {
    const Purchases = getPurchases();
    if (!Purchases) return false;
    const product = products[productId];
    if (!product) return false;
    try {
      await Purchases.purchaseStoreProduct(product); // consumable; StoreKit finishes the txn
    } catch (e: any) {
      if (e?.userCancelled) return false;
      throw e;
    }
    // Redeem edge function (Supabase attaches the user's JWT); server verifies + credits.
    try {
      const { data } = await supabase.functions.invoke('credits', { body: {} });
      if (data && typeof data.balance === 'number') setBalance(data.balance);
      else await loadBalance();
    } catch {
      await loadBalance();
    }
    return true;
  }, [products, loadBalance]);

  const amountFor = useCallback((productId: string) => CREDIT_AMOUNTS[productId as CreditProductId] ?? 0, []);

  return (
    <Ctx.Provider value={{ balance, loading, products, refresh, authorize, buy, amountFor }}>
      {children}
    </Ctx.Provider>
  );
}

export const useCredits = () => useContext(Ctx);
