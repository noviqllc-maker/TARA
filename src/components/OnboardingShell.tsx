// src/components/OnboardingShell.tsx
import React from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Animated, { FadeInDown } from 'react-native-reanimated';
import CosmicBackground from './CosmicBackground';
import { Text, GoldButton, Eyebrow } from './ui';
import { colors, spacing } from '@/theme';

export default function OnboardingShell({
  step, total, question, helper, children, onContinue, continueLabel = 'Continue', disabled,
}: {
  step: number; total: number; question: string; helper?: string;
  children?: React.ReactNode; onContinue: () => void; continueLabel?: string; disabled?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <CosmicBackground />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, paddingTop: insets.top + 30, paddingBottom: insets.bottom + 24, paddingHorizontal: spacing.xl }}
      >
        {/* back (steps 2–5 → previous step; step 1 → welcome) + progress dots */}
        <View style={styles.header}>
          <Pressable
            onPress={() => { if (router.canGoBack()) router.back(); }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.back}
          >
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path d="M15 18l-6-6 6-6" stroke={colors.cream} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
          <View style={styles.dots}>
            {Array.from({ length: total }).map((_, i) => (
              <View key={i} style={[styles.dot, i < step && { backgroundColor: colors.gold, width: 22 }]} />
            ))}
          </View>
        </View>

        <Animated.View entering={FadeInDown.duration(500)} style={{ flex: 1, justifyContent: 'center' }}>
          <Eyebrow>Step {step} of {total}</Eyebrow>
          <Text variant="h1" style={{ marginTop: 12, marginBottom: helper ? 6 : 24 }}>{question}</Text>
          {helper ? <Text variant="tiny" style={{ marginBottom: 24 }}>{helper}</Text> : null}
          {children}
        </Animated.View>

        <GoldButton label={continueLabel} onPress={onContinue} disabled={disabled} />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { justifyContent: 'center', alignItems: 'center', minHeight: 28 },
  back: { position: 'absolute', left: -6, top: 0, padding: 4 },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  dot: { width: 7, height: 7, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.15)' },
});
