// app/index.tsx
import React from 'react';
import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useProfile } from '@/hooks/useProfile';
import { colors } from '@/theme';

export default function Index() {
  const { profile, ready } = useProfile();
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.black }} />;
  return <Redirect href={profile.onboarded ? '/(tabs)/home' : '/intro'} />;
}
