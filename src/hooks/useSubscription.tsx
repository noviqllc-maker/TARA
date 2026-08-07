// src/hooks/useSubscription.tsx
// Premium subscription + one-time Shop unlocks via RevenueCat. RevenueCat handles
// Apple/Google billing, receipt validation, and restore — one configure() call
// covers subscriptions AND non-consumables.
//
// Setup (see PREMIUM-SETUP.md):
//  1. RevenueCat account → add your app → entitlement "premium" + the subscription
//     products in an Offering, and the three Non-Consumable shop products.
//  2. Put your public iOS key in .env as EXPO_PUBLIC_REVENUECAT_IOS_KEY (never hardcoded).
//  3. Runs in a DEV/production build (not Expo Go) — native module. In Expo Go it
//     safely no-ops (Premium locked, nothing owned, prices unavailable).

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';

// Non-consumable, one-time, restorable shop products. IDs live in one place.
import { SHOP_PRODUCT_IDS } from '@/lib/products';
export { SHOP_PRODUCT_IDS } from '@/lib/products';
export type { ShopProductId } from '@/lib/products';

// Shop-catalog fetch state, so the UI can show prices / a loading state / a single
// manual "retry" — and never spin in an auto-refetch loop on an empty result.
export type ShopStatus = 'loading' | 'ready' | 'empty';

type SubState = {
  isPremium: boolean;
  loading: boolean;
  packages: any[];
  purchase: (pkg: any) => Promise<boolean>;
  restore: () => Promise<boolean>;
  refresh: () => Promise<void>; // re-fetch offerings + customer info (retry)
  available: boolean; // is the billing module usable in this build?
  // ---- Shop (non-consumables) ----
  shopProducts: Record<string, any>;        // productId -> StoreProduct (carries priceString)
  shopStatus: ShopStatus;                    // 'loading' | 'ready' (non-empty) | 'empty'
  retryShop: () => Promise<void>;            // manual, one-shot re-fetch of shop products
  owns: (productId: string) => boolean;      // owned permanently (non-consumable)
  purchaseShop: (productId: string) => Promise<boolean>;
};

const Ctx = createContext<SubState>({} as SubState);

// RevenueCat iOS public key from .env (EXPO_PUBLIC_ vars are inlined at bundle time).
function apiKeyFor(): string | undefined {
  return Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY : undefined;
}

// Lazy-require so Expo Go (no native module) doesn't crash.
function getPurchases(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-purchases').default;
  } catch {
    return null;
  }
}

// Wait until configure() (called synchronously at app root in _layout) has taken
// effect on the native side before any getOfferings/getProducts/getCustomerInfo call —
// this is the fix for the throwIfNotConfigured race. Resolves true as soon as the SDK
// reports configured (usually the first check), polling briefly as a safety net.
async function ensureConfigured(Purchases: any): Promise<boolean> {
  if (typeof Purchases?.isConfigured !== 'function') return true; // older SDK: assume ok
  for (let i = 0; i < 10; i++) {
    try { if (await Purchases.isConfigured()) return true; } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

// Ownership for non-consumables comes from customerInfo.nonSubscriptionTransactions.
// Each transaction's productIdentifier means that one-time product is owned forever.
function ownedFromInfo(info: any): Set<string> {
  const owned = new Set<string>();
  const txns = info?.nonSubscriptionTransactions ?? [];
  for (const t of txns) {
    const pid = t?.productIdentifier;
    if (pid) owned.add(pid);
  }
  return owned;
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<any[]>([]);
  const [available, setAvailable] = useState(false);
  const [shopProducts, setShopProducts] = useState<Record<string, any>>({});
  const [shopStatus, setShopStatus] = useState<ShopStatus>('loading');
  const [owned, setOwned] = useState<Set<string>>(new Set());

  // Shop products are fetched ONCE and cached. shopFetchedRef flips true on the first
  // NON-EMPTY result; after that, automatic paths skip the fetch entirely (only an
  // explicit manual retry forces a re-fetch). shopAttemptRef numbers attempts so the
  // [RC] log fires once per fetch attempt, never per render.
  const shopFetchedRef = useRef(false);
  const shopAttemptRef = useRef(0);
  const shopInFlightRef = useRef(false);

  // Single place that maps a RevenueCat CustomerInfo → app state. Used by the initial
  // fetch, purchases, restore, and the live update listener, so premium + ownership
  // stay consistent everywhere and update instantly.
  const applyCustomerInfo = useCallback((info: any) => {
    setIsPremium(!!info?.entitlements?.active?.['premium']);
    setOwned(ownedFromInfo(info));
  }, []);

  // Load subscription offerings (for the paywall tiers). Cheap and idempotent.
  const loadOfferings = useCallback(async (Purchases: any): Promise<void> => {
    try {
      const offerings = await Purchases.getOfferings();
      setPackages(offerings.current?.availablePackages ?? []);
    } catch (e: any) {
      if (__DEV__) console.warn('[RC] getOfferings failed (retryable):', e?.message ?? e);
    }
  }, []);

  // Fetch the shop (non-consumable) products EXACTLY ONCE, then cache. Never loops on
  // an empty result — an empty/failed fetch parks in 'empty' until the user manually
  // retries (force=true). Logs once per attempt.
  const fetchShop = useCallback(async (Purchases: any, force = false): Promise<void> => {
    if (shopInFlightRef.current) return;                 // a fetch is already running
    if (shopFetchedRef.current && !force) return;        // already cached → don't refetch
    shopInFlightRef.current = true;
    const attempt = (shopAttemptRef.current += 1);
    setShopStatus('loading');
    try {
      // getProducts defaults to SUBSCRIPTION; request NON_SUBSCRIPTION or shop items won't return.
      const category = Purchases.PRODUCT_CATEGORY?.NON_SUBSCRIPTION ?? 'NON_SUBSCRIPTION';
      const products = await Purchases.getProducts([...SHOP_PRODUCT_IDS], category);
      if (__DEV__) {
        console.log(`[RC] shop getProducts attempt #${attempt} → ${products?.length ?? 0} product(s):`, (products ?? []).map((p: any) => p.identifier));
      }
      if (Array.isArray(products) && products.length > 0) {
        const map: Record<string, any> = {};
        for (const p of products) map[p.identifier] = p;
        setShopProducts(map);
        shopFetchedRef.current = true;                   // cache the successful result
        setShopStatus('ready');
      } else {
        // Apple returned an empty array — DO NOT retry automatically.
        setShopStatus('empty');
      }
    } catch (e: any) {
      if (__DEV__) console.warn(`[RC] shop getProducts attempt #${attempt} failed:`, e?.message ?? e);
      setShopStatus('empty');                            // manual retry only
    } finally {
      shopInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    const Purchases = getPurchases();
    const apiKey = apiKeyFor();

    if (!Purchases || !apiKey) {
      // Expo Go or missing key — everything stays locked, app still works.
      setAvailable(false);
      setLoading(false);
      setShopStatus('empty'); // no billing module → prices unavailable (no spinner forever)
      return;
    }

    let cancelled = false;
    const listener = (info: any) => applyCustomerInfo(info);

    (async () => {
      try {
        // Wait for configure() (root layout) to take effect BEFORE any RC call.
        const configured = await ensureConfigured(Purchases);
        if (cancelled) return;
        if (!configured) {
          if (__DEV__) console.warn('[RC] not configured after wait. Is EXPO_PUBLIC_REVENUECAT_IOS_KEY set?');
          setAvailable(false);
          return;
        }
        setAvailable(true);

        // Keep premium/ownership LIVE (upgrade, restore, expiry, promo…) — only after configured.
        try { Purchases.addCustomerInfoUpdateListener(listener); } catch {}

        try {
          const info = await Purchases.getCustomerInfo();
          if (!cancelled) applyCustomerInfo(info); // restores premium + non-consumables
        } catch (e: any) {
          if (__DEV__) console.warn('[RC] getCustomerInfo failed:', e?.message ?? e);
        }

        await loadOfferings(Purchases);
        await fetchShop(Purchases); // one-shot (guarded by shopFetchedRef)
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      try { Purchases.removeCustomerInfoUpdateListener(listener); } catch {}
    };
  }, [applyCustomerInfo, loadOfferings, fetchShop]);

  const purchase = useCallback(async (pkg: any) => {
    const Purchases = getPurchases();
    if (!Purchases || !(await ensureConfigured(Purchases))) return false;
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      applyCustomerInfo(customerInfo); // premium flips on instantly → nudges turn off
      return !!customerInfo.entitlements.active['premium'];
    } catch (e: any) {
      if (e?.userCancelled) return false; // user backed out → handle silently
      throw e;                            // real error → caller shows a friendly message
    }
  }, [applyCustomerInfo]);

  const purchaseShop = useCallback(async (productId: string) => {
    const Purchases = getPurchases();
    if (!Purchases || !(await ensureConfigured(Purchases))) return false;
    const product = shopProducts[productId];
    if (!product) return false;
    try {
      const { customerInfo } = await Purchases.purchaseStoreProduct(product);
      applyCustomerInfo(customerInfo);
      return ownedFromInfo(customerInfo).has(productId);
    } catch (e: any) {
      if (e?.userCancelled) return false; // silent
      throw e;
    }
  }, [shopProducts, applyCustomerInfo]);

  // Restores everything RevenueCat knows about — subscription AND non-consumables.
  const restore = useCallback(async () => {
    const Purchases = getPurchases();
    if (!Purchases || !(await ensureConfigured(Purchases))) return false;
    try {
      const info = await Purchases.restorePurchases();
      applyCustomerInfo(info);
      return !!info.entitlements.active['premium'] || ownedFromInfo(info).size > 0;
    } catch {
      return false;
    }
  }, [applyCustomerInfo]);

  const owns = useCallback((productId: string) => owned.has(productId), [owned]);

  // Re-fetch customer info + offerings + shop products for the paywall's "try again"
  // after a transient failure. Gated on configuration. Forces the shop re-fetch.
  const refresh = useCallback(async () => {
    const Purchases = getPurchases();
    if (!Purchases || !(await ensureConfigured(Purchases))) return;
    try {
      const info = await Purchases.getCustomerInfo();
      applyCustomerInfo(info);
    } catch {
      // leave existing state
    }
    await loadOfferings(Purchases);
    await fetchShop(Purchases, true);
  }, [applyCustomerInfo, loadOfferings, fetchShop]);

  // Manual, one-shot retry for the shop cards when prices are unavailable.
  // Forces a single fetch — never part of an automatic loop.
  const retryShop = useCallback(async () => {
    const Purchases = getPurchases();
    if (!Purchases || !(await ensureConfigured(Purchases))) { setShopStatus('empty'); return; }
    await fetchShop(Purchases, true);
  }, [fetchShop]);

  return (
    <Ctx.Provider
      value={{
        isPremium, loading, packages, purchase, restore, refresh, available,
        shopProducts, shopStatus, retryShop, owns, purchaseShop,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useSubscription = () => useContext(Ctx);
