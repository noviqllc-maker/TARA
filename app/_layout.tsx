// app/_layout.tsx
import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Fraunces_400Regular, Fraunces_500Medium, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { View } from 'react-native';
import { ProfileProvider } from '@/hooks/useProfile';
import { SubscriptionProvider } from '@/hooks/useSubscription';
import { HealthProvider } from '@/hooks/useHealth';
import { routeFromResponse } from '@/lib/notifications';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  // Load fonts BUNDLED in the app (assets/fonts), not over the network.
  const [loaded, error] = useFonts({
    // Legacy bundled faces (still referenced by un-migrated screens).
    Fraunces: require('../assets/fonts/Fraunces-Regular.ttf'),
    'Fraunces-Medium': require('../assets/fonts/Fraunces-Medium.ttf'),
    Outfit: require('../assets/fonts/Outfit-Regular.ttf'),
    'Outfit-Medium': require('../assets/fonts/Outfit-Medium.ttf'),
    'Outfit-SemiBold': require('../assets/fonts/Outfit-SemiBold.ttf'),
    // Temple-material design system (v2).
    Fraunces_400Regular, Fraunces_500Medium, Fraunces_600SemiBold,
    Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
    IBMPlexMono_400Regular, IBMPlexMono_500Medium,
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
