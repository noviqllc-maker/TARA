// src/hooks/useCredits.tsx
// Ask Tara question credits (consumable). Fully SERVER-AUTHORITATIVE: this context
// only mirrors the server balance and routes actions through it. Independent of the
// premium subscription and the shop — no coupling.
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  CREDIT_PRODUCT_IDS, CREDIT_AMOUNTS, CreditProductId,
  getAppUserId, fetchBalance, decrementCredit, redeemPurchases,
} from '@/lib/credits';

type CreditsState = {
  balance: number | null;                    // server balance; null until first load / when unavailable
  loading: boolean;
  products: Record<string, any>;             // productId -> StoreProduct (priceString)
  refresh: () => Promise<void>;              // re-read the server balance
  authorize: () => Promise<boolean>;         // atomic server decrement; true = question allowed
  buy: (productId: CreditProductId) => Promise<boolean>; // purchase → server verify → credit
  amountFor: (productId: string) => number;
};

const Ctx = createContext<CreditsState>({} as CreditsState);

function getPurchases(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-purchases').default;
  } catch {
    return null;
  }
}

export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Record<string, any>>({});
  const appUserIdRef = useRef<string | null>(null);
  const productsFetchedRef = useRef(false);

  // Fetch consumable credit products once (priceString for the paywall).
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
        if (__DEV__) console.log('[Credits] products:', list.map((p: any) => p.identifier));
      }
    } catch (e: any) {
      if (__DEV__) console.warn('[Credits] getProducts failed:', e?.message ?? e);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = await getAppUserId();
      if (cancelled) return;
      appUserIdRef.current = id;
      if (id) {
        const b = await fetchBalance(id); // grants the 5-credit bonus once, server-side
        if (!cancelled && typeof b === 'number') setBalance(b);
      }
      await loadProducts();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [loadProducts]);

  const refresh = useCallback(async () => {
    const id = appUserIdRef.current ?? (await getAppUserId());
    appUserIdRef.current = id;
    if (!id) return;
    const b = await fetchBalance(id);
    if (typeof b === 'number') setBalance(b);
  }, []);

  // Atomic server decrement. Returns true only if the server authorized the question.
  const authorize = useCallback(async () => {
    const id = appUserIdRef.current ?? (await getAppUserId());
    appUserIdRef.current = id;
    if (!id) return false;
    const r = await decrementCredit(id);
    if (!r) return false;              // server/network error → not authorized
    setBalance(r.balance);
    return r.ok;
  }, []);

  // Buy a pack: RevenueCat/StoreKit finishes the consumable, THEN the server verifies
  // with RevenueCat and credits it. We never grant from client purchase state alone.
  const buy = useCallback(async (productId: CreditProductId) => {
    const Purchases = getPurchases();
    const id = appUserIdRef.current ?? (await getAppUserId());
    appUserIdRef.current = id;
    if (!Purchases || !id) return false;
    const product = products[productId];
    if (!product) return false;
    try {
      await Purchases.purchaseStoreProduct(product); // consumable; StoreKit finishes the txn
    } catch (e: any) {
      if (e?.userCancelled) return false;
      throw e;
    }
    const newBal = await redeemPurchases(id); // server-side verify + credit (idempotent)
    if (typeof newBal === 'number') setBalance(newBal);
    return true;
  }, [products]);

  const amountFor = useCallback((productId: string) => CREDIT_AMOUNTS[productId as CreditProductId] ?? 0, []);

  return (
    <Ctx.Provider value={{ balance, loading, products, refresh, authorize, buy, amountFor }}>
      {children}
    </Ctx.Provider>
  );
}

export const useCredits = () => useContext(Ctx);
