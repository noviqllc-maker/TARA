// src/hooks/useSubscription.tsx
// Premium subscription + one-time Shop unlocks via RevenueCat. RevenueCat handles
// Apple/Google billing, receipt validation, and restore — one configure() call
// covers subscriptions AND non-consumables.
//
// Setup (see PREMIUM-SETUP.md):
//  1. RevenueCat account → add your app → entitlement "premium" + the subscription
//     products in an Offering, and the three Non-Consumable shop products.
//  2. Put your public API keys in app.json -> expo.extra.revenueCat.{ios,android}.
//  3. Runs in a DEV/production build (not Expo Go) — native module. In Expo Go it
//     safely no-ops (Premium locked, nothing owned, prices unavailable).

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

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

function keys() {
  const extra = (Constants.expoConfig?.extra ?? {}) as any;
  return extra.revenueCat ?? {};
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

  useEffect(() => {
    const Purchases = getPurchases();
    const k = keys();
    const apiKey = Platform.OS === 'ios' ? k.ios : k.android;

    if (!Purchases || !apiKey) {
      // Expo Go or not configured yet — everything stays locked, app still works.
      setAvailable(false);
      setLoading(false);
      return;
    }

    // Keep premium/ownership LIVE across the app — fires on upgrade, restore, expiry,
    // promo, family sharing, etc. — so nudges react immediately, no restart needed.
    const listener = (info: any) => applyCustomerInfo(info);
    try { Purchases.addCustomerInfoUpdateListener(listener); } catch {}

    (async () => {
      try {
        // configure() runs once at startup in app/_layout.tsx — here we just use it.
        setAvailable(true);

        const info = await Purchases.getCustomerInfo();
        applyCustomerInfo(info); // restores premium + non-consumables across restarts

        const offerings = await Purchases.getOfferings();
        setPackages(offerings.current?.availablePackages ?? []);

        // Non-consumables: getProducts defaults to SUBSCRIPTION, so request the
        // NON_SUBSCRIPTION category explicitly or the shop products won't come back.
        const category = Purchases.PRODUCT_CATEGORY?.NON_SUBSCRIPTION ?? 'NON_SUBSCRIPTION';
        const products = await Purchases.getProducts([...SHOP_PRODUCT_IDS], category);
        const map: Record<string, any> = {};
        for (const p of products) map[p.identifier] = p;
        setShopProducts(map);
      } catch {
        setAvailable(false);
      } finally {
        setLoading(false);
      }
    })();

    return () => { try { Purchases.removeCustomerInfoUpdateListener(listener); } catch {} };
  }, [applyCustomerInfo]);

  const purchase = useCallback(async (pkg: any) => {
    const Purchases = getPurchases();
    if (!Purchases) return false;
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      applyCustomerInfo(customerInfo); // premium flips on instantly → nudges turn off
      return !!customerInfo.entitlements.active['premium'];
    } catch {
      return false;
    }
  }, [applyCustomerInfo]);

  const purchaseShop = useCallback(async (productId: string) => {
    const Purchases = getPurchases();
    if (!Purchases) return false;
    const product = shopProducts[productId];
    if (!product) return false;
    try {
      const { customerInfo } = await Purchases.purchaseStoreProduct(product);
      applyCustomerInfo(customerInfo);
      return ownedFromInfo(customerInfo).has(productId);
    } catch {
      return false;
    }
  }, [shopProducts, applyCustomerInfo]);

  // Restores everything RevenueCat knows about — subscription AND non-consumables.
  const restore = useCallback(async () => {
    const Purchases = getPurchases();
    if (!Purchases) return false;
    try {
      const info = await Purchases.restorePurchases();
      applyCustomerInfo(info);
      return !!info.entitlements.active['premium'] || ownedFromInfo(info).size > 0;
    } catch {
      return false;
    }
  }, [applyCustomerInfo]);

  const owns = useCallback((productId: string) => owned.has(productId), [owned]);

  // Re-fetch offerings + customer info (for a paywall "try again" after a failure).
  const refresh = useCallback(async () => {
    const Purchases = getPurchases();
    if (!Purchases) return;
    try {
      const offerings = await Purchases.getOfferings();
      setPackages(offerings.current?.availablePackages ?? []);
      const info = await Purchases.getCustomerInfo();
      applyCustomerInfo(info);
    } catch {
      // leave existing state; the UI shows its fallback
    }
  }, [applyCustomerInfo]);

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
