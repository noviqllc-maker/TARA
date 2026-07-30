// app/practice/evening.tsx
// Evening Ritual (free, deterministic, no AI) — a gentle 4-step wind-down, one step per
// screen-state: (a) day reflection (optional one line, saved), (b) a single tomorrow-preview
// line, (c) a 60-second breath moment (skippable), (d) the day's mantra with an optional
// 11-tap mini-japa. Completion records the day + streak (local + server).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, cancelAnimation } from 'react-native-reanimated';
import Screen from '@/components/Screen';
import SubHeader from '@/components/SubHeader';
import { Text, Card, GoldButton } from '@/components/ui';
import { useChart } from '@/hooks/useChart';
import { checkinDate } from '@/lib/checkin';
import { dayMantra } from '@/lib/mantras';
import { eveningPrompt, tomorrowPreview } from '@/lib/eveningRitual';
import { recordEvening, loadEvening, EveningState } from '@/lib/practice';
import { tick, completion } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme';

const STEPS = 4;
const MINI = 11;

export default function Evening() {
  const chart = useChart();
  const now = useMemo(() => new Date(), []);
  const seed = useMemo(() => `${chart?.ascendant.signIndex ?? 0}:${checkinDate(now)}`, [chart, now]);
  const prompt = useMemo(() => eveningPrompt(seed), [seed]);
  const tomorrow = useMemo(() => tomorrowPreview(chart, now), [chart, now]);
  const mantra = useMemo(() => dayMantra(now), [now]);

  const [step, setStep] = useState(0);
  const [note, setNote] = useState('');
  const [mini, setMini] = useState(0);
  const [done, setDone] = useState(false);
  const [eve, setEve] = useState<EveningState | null>(null);

  const next = () => setStep((s) => Math.min(s + 1, STEPS - 1));

  const closeDay = () => {
    completion();
    setDone(true);
    recordEvening(note).then(setEve);
  };

  return (
    <Screen scroll={false} contentStyle={{ flex: 1 }}>
      <SubHeader eyebrow="Practice · Evening" title="Evening Reflection" />

      {!done ? (
        <>
          {/* progress dots */}
          <View style={styles.dots}>
            {Array.from({ length: STEPS }).map((_, i) => (
              <View key={i} style={[styles.dot, i <= step && styles.dotOn]} />
            ))}
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              {step === 0 && <Reflect key="s0" prompt={prompt} note={note} setNote={setNote} onNext={next} />}
              {step === 1 && <Tomorrow key="s1" line={tomorrow} onNext={next} />}
              {step === 2 && <Breath key="s2" onNext={next} />}
              {step === 3 && <MantraStep key="s3" mantra={mantra} mini={mini} setMini={setMini} onClose={closeDay} />}
            </View>
          </KeyboardAvoidingView>
        </>
      ) : (
        <Animated.View entering={FadeIn.duration(500)} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 40, color: colors.goldSoft }}>✦</Text>
          <Text variant="serif" style={{ fontSize: 28, marginTop: 10 }}>Day closed</Text>
          <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, textAlign: 'center' }}>
            Rest well. Tomorrow will keep.
          </Text>
          {eve && eve.streak > 0 ? (
            <Text variant="tiny" color={colors.saffron} style={{ marginTop: 16, fontSize: 12.5 }}>✦ {eve.streak}-day evening streak</Text>
          ) : null}
          <View style={{ alignSelf: 'stretch', paddingHorizontal: spacing.xl, marginTop: 28 }}>
            <GoldButton label="Done" onPress={() => router.replace('/practice' as any)} />
          </View>
        </Animated.View>
      )}
    </Screen>
  );
}

// (a) Day reflection
function Reflect({ prompt, note, setNote, onNext }: { prompt: string; note: string; setNote: (s: string) => void; onNext: () => void }) {
  return (
    <Animated.View entering={FadeInDown.duration(420)}>
      <Text variant="eyebrow" color={colors.gold}>Reflect on today</Text>
      <Text variant="serif" style={{ fontSize: 23, lineHeight: 32, marginTop: 12 }}>{prompt}</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="A line, if you'd like (optional)"
        placeholderTextColor={colors.mutedDim}
        style={styles.input}
        multiline
        maxLength={280}
      />
      <View style={{ marginTop: 22 }}>
        <GoldButton label={note.trim() ? 'Save & continue' : 'Continue'} onPress={onNext} />
      </View>
    </Animated.View>
  );
}

// (b) Tomorrow preview — a single line
function Tomorrow({ line, onNext }: { line: string; onNext: () => void }) {
  return (
    <Animated.View entering={FadeInDown.duration(420)} style={{ alignItems: 'center' }}>
      <Text variant="eyebrow" color={colors.gold}>A glance at tomorrow</Text>
      <Text variant="serif" style={{ fontSize: 22, lineHeight: 32, marginTop: 14, textAlign: 'center' }}>{line}</Text>
      <Text variant="tiny" color={colors.mutedDim} style={{ marginTop: 14, textAlign: 'center' }}>
        Just a glance — the full day unfolds tomorrow.
      </Text>
      <View style={{ alignSelf: 'stretch', paddingHorizontal: spacing.md, marginTop: 24 }}>
        <GoldButton label="Continue" onPress={onNext} />
      </View>
    </Animated.View>
  );
}

// (c) Breath moment — 60s, skippable
function Breath({ onNext }: { onNext: () => void }) {
  const scale = useSharedValue(1);
  const [left, setLeft] = useState(60);

  useEffect(() => {
    scale.value = withRepeat(withTiming(1.55, { duration: 4000, easing: Easing.inOut(Easing.ease) }), -1, true);
    const iv = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => { cancelAnimation(scale); clearInterval(iv); };
  }, []);

  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View entering={FadeIn.duration(420)} style={{ alignItems: 'center' }}>
      <Text variant="eyebrow" color={colors.gold}>Settle with the breath</Text>
      <View style={styles.breathWrap}>
        <Animated.View style={[styles.breathCircle, aStyle]} />
        <Text variant="tiny" color={colors.muted} style={{ position: 'absolute' }}>{left > 0 ? `${left}s` : 'ready'}</Text>
      </View>
      <Text variant="tiny" color={colors.mutedDim} style={{ textAlign: 'center', marginTop: 6 }}>
        Let the breath follow the circle — in as it grows, out as it settles.
      </Text>
      <View style={{ alignSelf: 'stretch', paddingHorizontal: spacing.md, marginTop: 24 }}>
        <GoldButton label={left > 0 ? 'Continue' : 'Continue'} onPress={onNext} />
      </View>
      <Pressable onPress={onNext} hitSlop={8} style={{ marginTop: 14 }}>
        <Text variant="tiny" color={colors.muted}>Skip</Text>
      </Pressable>
    </Animated.View>
  );
}

// (d) Mantra + optional 11-tap mini-japa
function MantraStep({ mantra, mini, setMini, onClose }: { mantra: ReturnType<typeof dayMantra>; mini: number; setMini: (n: number) => void; onClose: () => void }) {
  const full = mini >= MINI;
  const tap = () => {
    if (full) return;
    const n = mini + 1;
    setMini(n);
    if (n >= MINI) completion(); else tick();
  };
  return (
    <Animated.View entering={FadeInDown.duration(420)} style={{ alignItems: 'center' }}>
      <Text variant="eyebrow" color={colors.gold}>Close with the mantra</Text>
      <Text style={styles.devanagari}>{mantra.devanagari}</Text>
      <Text variant="serif" style={{ fontSize: 16, marginTop: 4 }}>{mantra.translit}</Text>
      <Text variant="tiny" color={colors.muted} style={{ marginTop: 6, textAlign: 'center' }}>{mantra.meaning}</Text>

      <Pressable onPress={tap} style={styles.miniRing} hitSlop={12}>
        {full ? (
          <Animated.View entering={FadeIn} style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 26, color: colors.goldSoft }}>✦</Text>
            <Text variant="tiny" color={colors.muted} style={{ marginTop: 4 }}>11 · complete</Text>
          </Animated.View>
        ) : (
          <>
            <Text style={styles.miniCount}>{mini}</Text>
            <Text variant="tiny" color={colors.mutedDim} style={{ fontSize: 10.5, marginTop: 2 }}>of {MINI} · tap</Text>
          </>
        )}
      </Pressable>
      <Text variant="tiny" color={colors.mutedDim} style={{ marginTop: 8 }}>An optional 11 — or simply close the day.</Text>

      <View style={{ alignSelf: 'stretch', paddingHorizontal: spacing.md, marginTop: 22 }}>
        <GoldButton label="Close the day ✦" onPress={onClose} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.line },
  dotOn: { backgroundColor: colors.gold },
  input: {
    marginTop: 18, minHeight: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 12, color: colors.cream,
    fontFamily: 'Outfit_400Regular', fontSize: 15,
  },
  breathWrap: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginVertical: 28 },
  breathCircle: { position: 'absolute', width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(205,163,73,0.14)', borderWidth: 1, borderColor: colors.gold },
  devanagari: { fontSize: 30, color: colors.cream, marginTop: 12, lineHeight: 42, textAlign: 'center' },
  miniRing: {
    width: 128, height: 128, borderRadius: 64, borderWidth: 1, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center', marginTop: 22, backgroundColor: colors.card,
  },
  miniCount: { fontFamily: 'Fraunces_600SemiBold', fontSize: 44, color: colors.cream, lineHeight: 50 },
});
