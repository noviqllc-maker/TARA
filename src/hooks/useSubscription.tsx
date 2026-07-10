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

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';

// Non-consumable, one-time, restorable shop products.
export const SHOP_PRODUCT_IDS = [
  'shop_year_ahead',
  'shop_birth_blueprint',
  'shop_dosha_remedies',
] as const;
export type ShopProductId = (typeof SHOP_PRODUCT_IDS)[number];

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
  const [owned, setOwned] = useState<Set<string>>(new Set());

  // Single place that maps a RevenueCat CustomerInfo → app state. Used by the initial
  // fetch, purchases, restore, and the live update listener, so premium + ownership
  // stay consistent everywhere and update instantly.
  const applyCustomerInfo = useCallback((info: any) => {
    setIsPremium(!!info?.entitlements?.active?.['premium']);
    setOwned(ownedFromInfo(info));
  }, []);

  // Fetch offerings + shop products. Wrapped in try/catch so a transient App Store
  // error (common in sandbox) is retryable via the paywall's "try again" — never a crash.
  const loadCatalog = useCallback(async (Purchases: any): Promise<boolean> => {
    try {
      const offerings = await Purchases.getOfferings();
      setPackages(offerings.current?.availablePackages ?? []);

      // getProducts defaults to SUBSCRIPTION; request NON_SUBSCRIPTION or shop items won't return.
      const category = Purchases.PRODUCT_CATEGORY?.NON_SUBSCRIPTION ?? 'NON_SUBSCRIPTION';
      const products = await Purchases.getProducts([...SHOP_PRODUCT_IDS], category);
      const map: Record<string, any> = {};
      for (const p of products) map[p.identifier] = p;
      setShopProducts(map);

      if (__DEV__) {
        const pkgIds = (offerings.current?.availablePackages ?? []).map((p: any) => p.product?.identifier);
        console.log('[RC] offering products:', pkgIds, '· shop products:', products.map((p: any) => p.identifier));
      }
      return true;
    } catch (e: any) {
      if (__DEV__) console.warn('[RC] catalog fetch failed (retryable):', e?.message ?? e);
      return false;
    }
  }, []);

  useEffect(() => {
    const Purchases = getPurchases();
    const apiKey = apiKeyFor();

    if (!Purchases || !apiKey) {
      // Expo Go or missing key — everything stays locked, app still works.
      setAvailable(false);
      setLoading(false);
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
          if (__DEV__) console.warn('[RC] not configured after wait — is EXPO_PUBLIC_REVENUECAT_IOS_KEY set?');
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

        await loadCatalog(Purchases);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      try { Purchases.removeCustomerInfoUpdateListener(listener); } catch {}
    };
  }, [applyCustomerInfo, loadCatalog]);

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

  // Re-fetch customer info + full catalog (offerings AND shop products) for the paywall/
  // shop "try again" after a transient failure. Gated on configuration.
  const refresh = useCallback(async () => {
    const Purchases = getPurchases();
    if (!Purchases || !(await ensureConfigured(Purchases))) return;
    try {
      const info = await Purchases.getCustomerInfo();
      applyCustomerInfo(info);
    } catch {
      // leave existing state
    }
    await loadCatalog(Purchases);
  }, [applyCustomerInfo, loadCatalog]);

  return (
    <Ctx.Provider
      value={{
        isPremium, loading, packages, purchase, restore, refresh, available,
        shopProducts, owns, purchaseShop,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useSubscription = () => useContext(Ctx);
