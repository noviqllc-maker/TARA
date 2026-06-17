// src/components/ui.tsx
import React from 'react';
import {
  Text as RNText, View, Pressable, StyleSheet, TextProps, ViewProps, ViewStyle,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, radius, spacing, shadow } from '@/theme';

/* ---------- Text ---------- */
type TVariant = 'h1' | 'h2' | 'h3' | 'body' | 'tiny' | 'eyebrow' | 'serif';
export function Text({
  variant = 'body', color, style, children, ...rest
}: TextProps & { variant?: TVariant; color?: string }) {
  return (
    <RNText style={[styles[variant], color ? { color } : null, style]} {...rest}>
      {children}
    </RNText>
  );
}

/* ---------- Card ---------- */
export function Card({
  solid, glow, style, children, ...rest
}: ViewProps & { solid?: boolean; glow?: boolean }) {
  return (
    <View
      style={[
        styles.card,
        solid && styles.cardSolid,
        glow && shadow.glow,
        style as ViewStyle,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

/* ---------- Eyebrow ---------- */
export function Eyebrow({ children, color = colors.gold }: { children: React.ReactNode; color?: string }) {
  return <Text variant="eyebrow" color={color}>{children}</Text>;
}

/* ---------- Buttons ---------- */
export function GoldButton({
  label, onPress, disabled, style,
}: { label: React.ReactNode; onPress?: () => void; disabled?: boolean; style?: ViewStyle }) {
  const s = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={[aStyle, style]}>
      <Pressable
        onPressIn={() => (s.value = withSpring(0.96))}
        onPressOut={() => (s.value = withSpring(1))}
        onPress={onPress}
        disabled={disabled}
      >
        <LinearGradient
          colors={[colors.goldSoft, colors.terra]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.goldBtn, shadow.gold, disabled && { opacity: 0.5 }]}
        >
          {typeof label === 'string'
            ? <Text variant="body" color="#1a1018" style={{ fontFamily: fonts.sansSemi }}>{label}</Text>
            : label}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

export function GhostButton({
  label, onPress, style,
}: { label: string; onPress?: () => void; style?: ViewStyle }) {
  return (
    <Pressable onPress={onPress} style={[styles.ghostBtn, style]}>
      <Text variant="body" color={colors.cream}>{label}</Text>
    </Pressable>
  );
}

/* ---------- Chip ---------- */
export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.chip}>
      <Text variant="tiny" color={colors.goldSoft}>{children}</Text>
    </View>
  );
}

/* ---------- Divider ---------- */
export const Divider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  h1: { fontFamily: fonts.serif, fontSize: 30, color: colors.cream, lineHeight: 35 },
  h2: { fontFamily: fonts.serif, fontSize: 22, color: colors.cream },
  h3: { fontFamily: fonts.serif, fontSize: 18, color: colors.cream },
  serif: { fontFamily: fonts.serif, fontSize: 16, color: colors.cream, lineHeight: 23 },
  body: { fontFamily: fonts.sans, fontSize: 14.5, color: colors.cream, lineHeight: 21 },
  tiny: { fontFamily: fonts.sans, fontSize: 11.5, color: colors.muted, lineHeight: 17 },
  eyebrow: {
    fontFamily: fonts.sansMed, fontSize: 10.5, letterSpacing: 2.4,
    textTransform: 'uppercase', color: colors.gold,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg + 2,
  },
  cardSolid: { backgroundColor: colors.cardSolid },
  goldBtn: {
    borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 22,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
  },
  ghostBtn: {
    borderRadius: radius.md, paddingVertical: 13, paddingHorizontal: 20,
    alignItems: 'center', borderWidth: 1, borderColor: colors.line,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(205,163,73,0.1)', borderColor: colors.line, borderWidth: 1,
    borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12,
  },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: spacing.lg },
});
