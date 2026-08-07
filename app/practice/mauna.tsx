// app/practice/mauna.tsx
// Mauna — micro-silence (free, no AI). A minimal 10-minute silent timer over a dimmed
// starfield: soft countdown, no sound, exitable anytime. On completion it logs "Silence
// kept ✦" to practice_log (like the other practices). Invitation, never obligation — the
// hub only surfaces the entry on its days (Amāvasyā / Saturdays).
import React, { useEffect, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, cancelAnimation } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CosmicBackground from '@/components/CosmicBackground';
import { Text, GoldButton } from '@/components/ui';
import { recordMauna } from '@/lib/practice';
import { completion } from '@/lib/haptics';
import { colors, spacing } from '@/theme';

const TOTAL = 600; // 10 minutes

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function Mauna() {
  const insets = useSafeAreaInsets();
  const [left, setLeft] = useState(TOTAL);
  const [done, setDone] = useState(false);

  const scale = useSharedValue(1);
  useEffect(() => {
    // Slow, barely-there pulse to keep the screen alive without demanding attention.
    scale.value = withRepeat(withTiming(1.12, { duration: 6000, easing: Easing.inOut(Easing.ease) }), -1, true);
    const iv = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          clearInterval(iv);
          setDone(true);
          completion();
          recordMauna();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { cancelAnimation(scale); clearInterval(iv); };
  }, []);

  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={styles.root}>
      <CosmicBackground />
      {/* Dim the starfield for a quiet, low-light space. */}
      <View style={styles.dim} pointerEvents="none" />

      {/* Exit anytime (no logging on early exit — silence is only "kept" when completed). */}
      {!done ? (
        <Pressable onPress={() => router.back()} hitSlop={12} style={[styles.exit, { top: insets.top + 12 }]}>
          <Text variant="tiny" color={colors.muted}>✕ End</Text>
        </Pressable>
      ) : null}

      <View style={styles.center}>
        {done ? (
          <Animated.View entering={FadeIn.duration(600)} style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 40, color: colors.goldSoft }}>✦</Text>
            <Text variant="serif" style={{ fontSize: 28, marginTop: 12 }}>Silence kept</Text>
            <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, textAlign: 'center' }}>Carry a little of the quiet with you.</Text>
            <View style={{ alignSelf: 'stretch', paddingHorizontal: spacing.xxl, marginTop: 32 }}>
              <GoldButton label="Done" onPress={() => router.replace('/practice' as any)} />
            </View>
          </Animated.View>
        ) : (
          <>
            <Text variant="eyebrow" color={colors.gold} style={{ marginBottom: 28 }}>Mauna · kept silence</Text>
            <Animated.View style={[styles.ring, aStyle]} />
            <Text style={styles.clock}>{fmt(left)}</Text>
            <Text variant="tiny" color={colors.mutedDim} style={{ marginTop: 18, textAlign: 'center', lineHeight: 18 }}>
              Settle into stillness. No sound, nothing to do.{'\n'}Simply keep the silence until it completes.
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6,4,10,0.55)' },
  exit: { position: 'absolute', left: spacing.xl, zIndex: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  ring: { position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 1, borderColor: 'rgba(205,163,73,0.25)', backgroundColor: 'rgba(205,163,73,0.04)' },
  clock: { fontFamily: 'Fraunces_500Medium', fontSize: 56, color: colors.cream, letterSpacing: 1 },
});
