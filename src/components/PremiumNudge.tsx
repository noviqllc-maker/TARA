// src/components/PremiumNudge.tsx
// Consistent, on-brand premium nudges (deep indigo, gold, Fraunces/Outfit — calm,
// never pushy). Variants:
//   <PremiumNudge variant="card" />   — Home upsell card (dismissible)
//   <PremiumNudge variant="banner" /> — subtle in-session banner (dismissible)
//   <PremiumHint />                   — inline "go deeper" line under free content
//   <PremiumSheet />                  — soft-lock modal explaining a premium benefit
// Every one routes to the existing paywall.
import React from 'react';
import { View, Pressable, StyleSheet, Modal, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Text, Card, Eyebrow, GoldButton } from './ui';
import { colors, radius, spacing } from '@/theme';

const DEFAULT_BENEFITS = [
  'Unlimited Tara AI conversations',
  'Your full year-ahead forecast',
  'Deeper remedies & guidance',
];

const goPaywall = () => router.push('/paywall');

function Benefits({ items }: { items: string[] }) {
  return (
    <View style={{ marginTop: 10, gap: 7 }}>
      {items.slice(0, 3).map((b) => (
        <View key={b} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Text style={{ color: colors.gold, fontSize: 13 }}>✓</Text>
          <Text variant="tiny" color={colors.cream} style={{ fontSize: 12.5, flex: 1 }}>{b}</Text>
        </View>
      ))}
    </View>
  );
}

export function PremiumNudge({
  variant = 'card',
  title = 'Unlock your full journey',
  benefits = DEFAULT_BENEFITS,
  message,
  onDismiss,
  style,
}: {
  variant?: 'card' | 'banner';
  title?: string;
  benefits?: string[];
  message?: string;
  onDismiss?: () => void;
  style?: ViewStyle;
}) {
  if (variant === 'banner') {
    return (
      <Animated.View entering={FadeInUp.duration(300)} style={[styles.banner, style]}>
        <Pressable style={{ flex: 1 }} onPress={goPaywall}>
          <Text variant="tiny" color={colors.gold} style={{ fontWeight: '600' }}>✦ Explore Premium</Text>
          <Text variant="tiny" color={colors.muted} style={{ marginTop: 2 }}>
            {message ?? 'Unlock deeper guidance whenever you’re ready.'}
          </Text>
        </Pressable>
        {onDismiss && (
          <Pressable onPress={onDismiss} hitSlop={10} style={{ paddingLeft: 12 }}>
            <Text variant="body" color={colors.muted}>✕</Text>
          </Pressable>
        )}
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInUp.duration(350)} style={style}>
      <Card solid glow>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Eyebrow color={colors.gold}>✦ Premium</Eyebrow>
          {onDismiss && (
            <Pressable onPress={onDismiss} hitSlop={10}>
              <Text variant="tiny" color={colors.muted}>Dismiss</Text>
            </Pressable>
          )}
        </View>
        <Text variant="serif" style={{ fontSize: 18, marginTop: 8 }}>{title}</Text>
        <Benefits items={benefits} />
        <GoldButton label="Explore Premium" onPress={goPaywall} style={{ marginTop: 14 }} />
      </Card>
    </Animated.View>
  );
}

// Inline "go deeper" line under free content. Free feature stays fully visible above it.
export function PremiumHint({ message, onPress, style }: { message: string; onPress?: () => void; style?: ViewStyle }) {
  return (
    <Pressable onPress={onPress ?? goPaywall} style={[styles.hint, style]}>
      <Text variant="tiny" color={colors.gold} style={{ fontWeight: '600' }}>✦ Go deeper with Premium</Text>
      <Text variant="tiny" color={colors.muted} style={{ marginTop: 3, lineHeight: 17 }}>{message}</Text>
    </Pressable>
  );
}

// Soft-lock: a warm sheet explaining the benefit → paywall. Dismissible ("Maybe later").
export function PremiumSheet({
  visible, title, message, benefits = DEFAULT_BENEFITS, onClose,
}: {
  visible: boolean;
  title: string;
  message?: string;
  benefits?: string[];
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Eyebrow color={colors.gold}>✦ Premium</Eyebrow>
          <Text variant="serif" style={{ fontSize: 19, marginTop: 8 }}>{title}</Text>
          {message ? <Text variant="tiny" style={{ marginTop: 8, lineHeight: 18 }}>{message}</Text> : null}
          <Benefits items={benefits} />
          <GoldButton label="Explore Premium" onPress={() => { onClose(); goPaywall(); }} style={{ marginTop: 16 }} />
          <Pressable onPress={onClose} style={{ marginTop: 12 }}>
            <Text variant="tiny" color={colors.muted} style={{ textAlign: 'center' }}>Maybe later</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.cardSolid, borderColor: colors.line, borderWidth: 1,
    borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: 14,
  },
  hint: {
    borderColor: colors.line, borderWidth: 1, borderRadius: radius.md,
    backgroundColor: 'rgba(205,163,73,0.06)', padding: 14,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(8,6,12,0.72)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.indigo, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderColor: colors.line, borderWidth: 1, padding: spacing.xl, paddingBottom: 34,
  },
});
