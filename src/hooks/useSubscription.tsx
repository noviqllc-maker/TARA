// src/hooks/useSubscription.tsx
// Premium subscription state via RevenueCat. RevenueCat handles Apple/Google
// billing, receipt validation, and restore — the right tool for in-app purchases.
//
// Setup (see PREMIUM-SETUP.md):
//  1. Create a RevenueCat account, add your app, create an entitlement "premium"
//     and a $9.99/mo product, group them in an Offering.
//  2. Put your public API keys in app.json -> expo.extra.revenueCat.{ios,android}.
//  3. This must run in a DEV BUILD or production build (not Expo Go) because it uses
//     a native module. In Expo Go it safely no-ops (Premium locked).

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

type SubState = {
  isPremium: boolean;
  loading: boolean;
  packages: any[];
  purchase: (pkg: any) => Promise<boolean>;
  restore: () => Promise<boolean>;
  available: boolean; // is the billing module usable in this build?
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

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<any[]>([]);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const Purchases = getPurchases();
    const k = keys();
    const apiKey = Platform.OS === 'ios' ? k.ios : k.android;

    if (!Purchases || !apiKey) {
      // Expo Go or not configured yet — Premium stays locked, app still works.
      setAvailable(false);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        Purchases.configure({ apiKey });
        setAvailable(true);
        const info = await Purchases.getCustomerInfo();
        setIsPremium(!!info.entitlements.active['premium']);
        const offerings = await Purchases.getOfferings();
        setPackages(offerings.current?.availablePackages ?? []);
      } catch {
        setAvailable(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const purchase = useCallback(async (pkg: any) => {
    const Purchases = getPurchases();
    if (!Purchases) return false;
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const ok = !!customerInfo.entitlements.active['premium'];
      setIsPremium(ok);
      return ok;
    } catch {
      return false;
    }
  }, []);

  const restore = useCallback(async () => {
    const Purchases = getPurchases();
    if (!Purchases) return false;
    try {
      const info = await Purchases.restorePurchases();
      const ok = !!info.entitlements.active['premium'];
      setIsPremium(ok);
      return ok;
    } catch {
      return false;
    }
  }, []);

  return (
    <Ctx.Provider value={{ isPremium, loading, packages, purchase, restore, available }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSubscription = () => useContext(Ctx);
