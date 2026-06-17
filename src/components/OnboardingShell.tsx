// src/components/OnboardingShell.tsx
import React from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
        {/* progress dots */}
        <View style={styles.dots}>
          {Array.from({ length: total }).map((_, i) => (
            <View key={i} style={[styles.dot, i < step && { backgroundColor: colors.gold, width: 22 }]} />
          ))}
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
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  dot: { width: 7, height: 7, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.15)' },
});
