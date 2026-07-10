// app/_layout.tsx
import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Fraunces_400Regular, Fraunces_500Medium, Fraunces_600SemiBold, Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  Outfit_300Light, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold,
} from '@expo-google-fonts/outfit';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { View, Platform } from 'react-native';
import { ProfileProvider } from '@/hooks/useProfile';
import { SubscriptionProvider } from '@/hooks/useSubscription';
import { HealthProvider } from '@/hooks/useHealth';
import { routeFromResponse } from '@/lib/notifications';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Configure RevenueCat ONCE at startup, before any purchase logic (the subscription
// provider then reads customer info / offerings). Key comes from .env via
// process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY — never hardcoded. Guarded for iOS and
// read safely so a missing key or the native module being unavailable (e.g. Expo Go)
// never crashes the app.
const rcApiKey = Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY : undefined;
if (Platform.OS === 'ios') {
  if (rcApiKey) {
    try {
      // Lazy-require so Expo Go (no native module) doesn't throw at import time.
      require('react-native-purchases').default.configure({ apiKey: rcApiKey });
      if (__DEV__) console.log(`[RC] configured (key ${rcApiKey.slice(0, 8)}…)`);
    } catch (e: any) {
      if (__DEV__) console.warn('[RC] configure() threw:', e?.message ?? e);
    }
  } else if (__DEV__) {
    console.warn(
      '[RC] EXPO_PUBLIC_REVENUECAT_IOS_KEY is undefined — set it in .env and restart Metro ' +
      '(npx expo start -c). Purchases are disabled until then.',
    );
  }
}

export default function RootLayout() {
  // Brand fonts — Fraunces (serif headings) + Outfit (sans body). Bundled via
  // @expo-google-fonts, so they embed in native/EAS builds, not just Expo Go.
  const [loaded, error] = useFonts({
    Fraunces_400Regular, Fraunces_500Medium, Fraunces_600SemiBold, Fraunces_700Bold,
    Outfit_300Light, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  // Notification tap → deep link. Registered once the root <Stack> is mounted
  // (gated on fonts loaded) so router navigation is ready.
  useEffect(() => {
    if (!loaded && !error) return;

    const go = (route: string | null) => {
      if (route) router.push(route as any);
    };

    // COLD START: the app was launched by tapping a notification while it was
    // fully killed. The response listener can't catch this — the tap happened
    // before the JS runtime existed — so we ask the OS for the launch response.
    // Deferred a tick so expo-router's navigator is fully mounted before we push.
    Notifications.getLastNotificationResponseAsync()
      .then((response) => { setTimeout(() => go(routeFromResponse(response)), 0); })
      .catch(() => {});

    // WARM: tap while the app is running (foreground or background).
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      go(routeFromResponse(response));
    });
    return () => sub.remove();
  }, [loaded, error]);

  if (!loaded && !error) {
    return <View style={{ flex: 1, backgroundColor: colors.black }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.black }}>
      <SafeAreaProvider>
        <ProfileProvider>
          <SubscriptionProvider>
            <HealthProvider>
              <StatusBar style="light" />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.black }, animation: 'fade' }} />
            </HealthProvider>
          </SubscriptionProvider>
        </ProfileProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
