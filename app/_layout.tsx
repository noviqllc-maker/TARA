// app/_layout.tsx
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';
import { ProfileProvider } from '@/hooks/useProfile';
import { SubscriptionProvider } from '@/hooks/useSubscription';
import { HealthProvider } from '@/hooks/useHealth';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  // Load fonts BUNDLED in the app (assets/fonts), not over the network.
  const [loaded, error] = useFonts({
    Fraunces: require('../assets/fonts/Fraunces-Regular.ttf'),
    'Fraunces-Medium': require('../assets/fonts/Fraunces-Medium.ttf'),
    Outfit: require('../assets/fonts/Outfit-Regular.ttf'),
    'Outfit-Medium': require('../assets/fonts/Outfit-Medium.ttf'),
    'Outfit-SemiBold': require('../assets/fonts/Outfit-SemiBold.ttf'),
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
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
