// app/index.tsx
import React from 'react';
import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/theme';

export default function Index() {
  const { profile, ready: profileReady } = useProfile();
  const { session, ready: authReady } = useAuth();

  if (!profileReady || !authReady) return <View style={{ flex: 1, backgroundColor: colors.black }} />;

  // Signed in → home. Onboarded but signed out → the account gate. Otherwise intro.
  if (session) return <Redirect href="/(tabs)/home" />;
  if (profile.onboarded) return <Redirect href={'/auth' as any} />;
  return <Redirect href="/intro" />;
}
