// app/auth.tsx
// Account gate at the end of onboarding (and the returning-user entry). Native Sign
// in with Apple only — no skip; an account is required (the credits system depends
// on it). On success, data is migrated/restored (in useAuth) and we route onward.
import React, { useEffect, useState } from 'react';
import { View, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as AppleAuthentication from 'expo-apple-authentication';
import CosmicBackground from '@/components/CosmicBackground';
import { Text } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { colors, spacing } from '@/theme';

export default function Auth() {
  const insets = useSafeAreaInsets();
  const { signInWithApple } = useAuth();
  const { reload } = useProfile();
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAvailable).catch(() => setAvailable(false));
  }, []);

  const onSignIn = async () => {
    setBusy(true);
    const res = await signInWithApple();
    setBusy(false);
    if (res.canceled) return;
    if (!res.ok) { Alert.alert('Could not sign in', res.error ?? 'Please try again.'); return; }
    // Data was migrated/restored in useAuth — reload it, then route by whether we have a chart.
    const p = await reload();
    if (p.birthDate && p.birthTime) router.replace('/loading');
    else router.replace('/(onboarding)/name');
  };

  return (
    <View style={{ flex: 1 }}>
      <CosmicBackground intense />
      <View style={[styles.root, { paddingTop: insets.top + 90, paddingBottom: insets.bottom + 24 }]}>
        <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 34, color: colors.gold }}>✦</Text>
          <Text variant="h1" style={{ textAlign: 'center', marginTop: 18 }}>Save your cosmic journey</Text>
          <Text variant="tiny" color={colors.muted} style={{ textAlign: 'center', marginTop: 14, lineHeight: 21, paddingHorizontal: 8 }}>
            Create your account to keep your chart everywhere and claim 5 free Ask Tara questions.
          </Text>
        </Animated.View>

        <View style={{ width: '100%' }}>
          {busy ? (
            <View style={{ alignItems: 'center', paddingVertical: 10 }}>
              <ActivityIndicator color={colors.gold} />
              <Text variant="tiny" color={colors.muted} style={{ marginTop: 10 }}>Signing you in…</Text>
            </View>
          ) : available ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={14}
              style={{ height: 54, width: '100%' }}
              onPress={onSignIn}
            />
          ) : (
            <Text variant="tiny" color={colors.muted} style={{ textAlign: 'center' }}>
              Sign in with Apple requires an iPhone running iOS 13 or later.
            </Text>
          )}
          <Text variant="tiny" color={colors.mutedDim} style={{ textAlign: 'center', marginTop: 16, fontSize: 10.5, lineHeight: 15 }}>
            We use your Apple ID only to secure your account and sync your chart across devices.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'space-between', alignItems: 'center' },
});
