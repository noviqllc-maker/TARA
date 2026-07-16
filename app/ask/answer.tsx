// app/ask/answer.tsx
// The Ask Tara answer experience: user's question → a short, factor-grounded answer.
// The Calculation Card shows the REAL transit factor from the Vedic engine (not
// decorative); the answer is grounded in it. On success the Q&A is appended to the
// existing chat history (respecting the "remember conversations" privacy setting),
// so premium persistence is unchanged.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Screen from '@/components/Screen';
import { Text, Card, Eyebrow, GoldButton } from '@/components/ui';
import AspectDiagram from '@/components/AspectDiagram';
import { useChart } from '@/hooks/useChart';
import { useProfile } from '@/hooks/useProfile';
import { useHealth } from '@/hooks/useHealth';
import { computeTransitFactor, TransitFactor } from '@/lib/vedic';
import { askTaraAnswer, ChatMessage } from '@/lib/ai';
import { getLanguage } from '@/lib/language';
import { getRememberChat } from '@/lib/privacy';
import { colors, fonts, spacing } from '@/theme';

const MEM_KEY = 'tara.chat.v1';       // shared with the Ask Tara screen
const STORE_CAP = 200;                // keep in sync with the Ask Tara screen
const FEEDBACK_KEY = 'tara.answer.feedback.v1';

type UIState = 'loading' | 'ready' | 'nochart';

export default function AnswerView() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const question = (q ?? '').trim();
  const chart = useChart();
  const { profile } = useProfile();
  const { metrics } = useHealth();

  const factor: TransitFactor | null = useMemo(() => (chart ? computeTransitFactor(chart) : null), [chart]);
  const [state, setState] = useState<UIState>('loading');
  const [answer, setAnswer] = useState('');
  const [rating, setRating] = useState<'up' | 'down' | null>(null);
  const ranRef = useRef(false); // generate + append exactly once

  useEffect(() => {
    if (ranRef.current) return;
    if (!question) { router.back(); return; }
    if (!chart || !factor) { setState('nochart'); return; }
    ranRef.current = true;
    (async () => {
      const language = await getLanguage();
      const res = await askTaraAnswer(question, factor.label, profile.name || 'friend', chart, metrics, language);
      setAnswer(res.answer);
      setState('ready');
      // Append Q&A to history (persistence unchanged) unless privacy opted out.
      if (await getRememberChat()) {
        try {
          const raw = await AsyncStorage.getItem(MEM_KEY);
          const prev: ChatMessage[] = raw ? JSON.parse(raw) : [];
          const next = [...prev, { role: 'user' as const, content: question }, { role: 'assistant' as const, content: res.answer }];
          await AsyncStorage.setItem(MEM_KEY, JSON.stringify(next.slice(-STORE_CAP)));
        } catch {}
      }
    })();
  }, [question, chart, factor, profile.name, metrics]);

  const rate = useCallback(async (r: 'up' | 'down') => {
    setRating(r);
    try {
      const raw = await AsyncStorage.getItem(FEEDBACK_KEY);
      const log = raw ? JSON.parse(raw) : [];
      log.push({ q: question, factor: factor?.label, rating: r, at: new Date().toISOString() });
      await AsyncStorage.setItem(FEEDBACK_KEY, JSON.stringify(log.slice(-200)));
    } catch {}
  }, [question, factor]);

  if (state === 'nochart') {
    return (
      <Screen scroll={false} contentStyle={{ flex: 1 }}>
        <View style={styles.center}>
          <Text variant="serif" style={{ fontSize: 22, textAlign: 'center' }}>Add your birth details</Text>
          <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, marginBottom: 22, textAlign: 'center' }}>
            Ask Tara reads the live sky against your birth chart. Add your date, time, and place of birth first.
          </Text>
          <View style={{ alignSelf: 'stretch', paddingHorizontal: spacing.xl }}>
            <GoldButton label="Go back" onPress={() => router.back()} />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginBottom: 18 }}>
        <Text variant="body" color={colors.muted}>✕ Close</Text>
      </Pressable>

      {/* a) YOU ASKED */}
      <Eyebrow>You Asked</Eyebrow>
      <Text variant="serif" style={styles.question}>“{question}”</Text>

      {/* b) CELESTIAL CALCULATION CARD */}
      <Card style={styles.calcCard}>
        {factor && <AspectDiagram factor={factor} size={116} />}
        <View style={{ flex: 1, paddingLeft: 14 }}>
          <Eyebrow color={colors.gold}>Celestial Calculation</Eyebrow>
          <Text style={styles.factor}>{factor?.label}</Text>
        </View>
      </Card>

      {/* c) THE ANSWER */}
      <Eyebrow>The Answer</Eyebrow>
      {state === 'loading' ? (
        <View style={styles.answerLoading}>
          <ActivityIndicator color={colors.gold} />
          <Text variant="tiny" color={colors.muted} style={{ marginTop: 10 }}>Tara is reading the sky…</Text>
        </View>
      ) : (
        <Text variant="serif" style={styles.answer}>{answer}</Text>
      )}

      {/* d) FEEDBACK */}
      {state === 'ready' && (
        <View style={{ marginTop: spacing.xl }}>
          <Eyebrow color={colors.muted}>How was this answer?</Eyebrow>
          {rating ? (
            <Text variant="tiny" color={colors.sage} style={{ marginTop: 10 }}>
              Thank you — Tara learns from this.
            </Text>
          ) : (
            <View style={styles.thumbs}>
              <Pressable onPress={() => rate('up')} style={styles.thumb} hitSlop={8}>
                <Text style={{ fontSize: 20 }}>👍</Text>
              </Pressable>
              <Pressable onPress={() => rate('down')} style={styles.thumb} hitSlop={8}>
                <Text style={{ fontSize: 20 }}>👎</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  question: { fontSize: 22, lineHeight: 30, marginTop: 8, marginBottom: spacing.xl, color: colors.cream },
  calcCard: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl },
  factor: { fontFamily: fonts.sansSemi, color: colors.gold, fontSize: 12.5, letterSpacing: 0.8, lineHeight: 18, marginTop: 8 },
  answerLoading: { alignItems: 'flex-start', paddingVertical: 20 },
  answer: { fontSize: 17, lineHeight: 27, marginTop: 10, color: colors.cream },
  thumbs: { flexDirection: 'row', gap: 14, marginTop: 12 },
  thumb: {
    width: 52, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card,
  },
});
