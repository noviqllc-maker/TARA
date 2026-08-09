// app/ask/answer.tsx
// The Ask Tara answer experience: user's question → a short, factor-grounded answer.
// The Calculation Card shows the REAL transit factor from the Vedic engine (not
// decorative); the answer is grounded in it. On success the Q&A is appended to the
// existing chat history (respecting the "remember conversations" privacy setting),
// so premium persistence is unchanged.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, ActivityIndicator, StyleSheet, Keyboard } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Screen from '@/components/Screen';
import { Text, Card, Eyebrow, GoldButton } from '@/components/ui';
import AspectDiagram from '@/components/AspectDiagram';
import { useChart } from '@/hooks/useChart';
import { useProfile } from '@/hooks/useProfile';
import { useHealth } from '@/hooks/useHealth';
import { useCredits } from '@/hooks/useCredits';
import { computeTransitFactor, TransitFactor } from '@/lib/vedic';
import { classifyTopic } from '@/lib/topic';
import { askTaraAnswer, ChatMessage, TaraAnswer } from '@/lib/ai';
import { takeOverrideChart } from '@/lib/askOverrideChart';
import { getLanguage } from '@/lib/language';
import { getRememberChat } from '@/lib/privacy';
import { setAskDraft } from '@/lib/askDraft';
import { saveHistory, setHistoryFeedback } from '@/lib/history';
import { colors, fonts, radius, spacing } from '@/theme';

const MEM_KEY = 'tara.chat.v1';       // shared with the Ask Tara screen
const STORE_CAP = 200;                // keep in sync with the Ask Tara screen
const FEEDBACK_KEY = 'tara.answer.feedback.v1';

type UIState = 'loading' | 'ready' | 'nochart' | 'nocredits' | 'fairuse' | 'error';

// The known template lead-in labels (templates A–D). Matching against this whitelist —
// rather than any "Label — …" pattern — avoids styling the em dashes the translation rule
// puts INSIDE content ("Mercury retrograde in your 3rd — you'll rewrite that text thrice").
const LEAD_INS = new Set([
  'short answer', 'why', 'best timing', 'watch out', "tara's advice",
  'the pattern', 'why your chart says this', 'what helps now',
  'big picture', "what's changing", 'what to do',
  'your challenge', 'your strength', 'the opportunity',
]);

// Renders the answer body. A line that begins with a known template label followed by
// " — " gets a distinct gold lead-in; everything else is a serif paragraph. Template E
// (plain prose) has no lead-ins, so it renders as paragraphs.
// Safety net: strip any em-dash the model still slips into rendered prose (the system prompt
// forbids them, but this guarantees none reach the reader). The 'Label — content' lead-in
// delimiter is consumed by the split BEFORE this runs, so it is never affected.
const noEmDash = (s: string) => s.replace(/\s*—\s*/g, ', ');

function AnswerBody({ text }: { text: string }) {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  return (
    <View style={{ gap: 10, marginTop: 10 }}>
      {lines.map((line, i) => {
        const emIdx = line.indexOf(' — ');
        const sep = emIdx !== -1 ? emIdx : line.indexOf(' - '); // tolerate hyphen
        const label = sep > 0 ? line.slice(0, sep).trim() : '';
        if (label && LEAD_INS.has(label.toLowerCase())) {
          return (
            <Text key={i} variant="serif" style={styles.answer}>
              <Text style={styles.leadIn}>{label}: </Text>{noEmDash(line.slice(sep + 3).trim())}
            </Text>
          );
        }
        return <Text key={i} variant="serif" style={styles.answer}>{noEmDash(line)}</Text>;
      })}
    </View>
  );
}

export default function AnswerView() {
  const { q, src } = useLocalSearchParams<{ q?: string; src?: string }>();
  const question = (q ?? '').trim();
  const userChart = useChart();
  // From the Vedic Calculator (src=calc): answer about the ENTERED chart instead of the
  // signed-in user's. Consume-once on mount so it never leaks into a later, unrelated ask.
  const [override] = useState(() => (src === 'calc' ? takeOverrideChart() : null));
  const chart = override?.chart ?? userChart;
  const { profile } = useProfile();
  const { metrics } = useHealth();
  const { authorize, refresh, refund } = useCredits();

  // Classify the question's theme so the factor leads with the relevant graha/house
  // (career → 10th/Saturn/Sun, love → Venus/7th, …) instead of always the Moon.
  const topic = useMemo(() => classifyTopic(question), [question]);
  const factor: TransitFactor | null = useMemo(
    () => (chart ? computeTransitFactor(chart, new Date(), topic) : null),
    [chart, topic],
  );
  const [state, setState] = useState<UIState>('loading');
  const [ans, setAns] = useState<TaraAnswer | null>(null);
  const [rating, setRating] = useState<'up' | 'down' | null>(null);
  const [refetching, setRefetching] = useState(false); // "Try again" balance refetch in progress
  const [refreshNote, setRefreshNote] = useState('');   // brief feedback after a refetch
  const startedRef = useRef(false);   // effect runs run() once
  const authorizedRef = useRef(false); // a credit was already spent for this question
  const historyIdRef = useRef<string | null>(null); // ask_history row id → attach 👍/👎

  // Return to Ask Tara; the pending question is restored there (draft set in run()).
  // Always drop the keyboard first so it can never linger back on the tab.
  const close = useCallback(() => { Keyboard.dismiss(); router.back(); }, []);

  // First day of next calendar month — when the premium fair-use allowance refreshes.
  const resetDate = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 1).toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  }, []);

  // The AUTHORITATIVE gate: a question is generated ONLY if the server decrement
  // succeeds. authorizedRef ensures we never double-spend on a retry.
  const run = useCallback(async () => {
    if (!question) { router.back(); return; }
    // Hold the question so any non-success exit (X, back-swipe, buy flow) restores it.
    setAskDraft(question);
    if (!chart || !factor) { setState('nochart'); return; }
    setState('loading');

    if (!authorizedRef.current) {
      const res = await authorize(); // server-side gate (free: credit; premium: monthly counter)
      if (res === 'fair-use') { setState('fairuse'); return; } // premium monthly cap reached
      if (res !== 'ok') { setState('nocredits'); return; }     // free: out of credits / error
      authorizedRef.current = true;
    }

    const language = await getLanguage();
    // For an entered (calculator) chart, don't send the signed-in user's health metrics.
    const res = await askTaraAnswer(question, factor.label, override?.name || profile.name || 'friend', chart, override ? null : metrics, language, topic);
    // Parse failure → the answer never came through. Refund the credit, keep the question,
    // and show the graceful error state (never the raw model text). A retry re-authorizes,
    // so the net cost stays one credit per delivered answer.
    if (res.error) {
      await refund();
      authorizedRef.current = false;
      setAskDraft(question);
      setState('error');
      return;
    }
    setAns(res);
    setAskDraft(''); // answered → don't restore the question to the input
    setState('ready');
    // Persist to server-side history (survives reinstall; queues if signed out). Keep the
    // row id so a thumbs rating can be written back to it.
    saveHistory(question, res.answer, factor.label).then((id) => { historyIdRef.current = id; });
    // Append Q&A to local chat history (persistence unchanged) unless privacy opted out.
    if (await getRememberChat()) {
      try {
        const raw = await AsyncStorage.getItem(MEM_KEY);
        const prev: ChatMessage[] = raw ? JSON.parse(raw) : [];
        const next = [...prev, { role: 'user' as const, content: question }, { role: 'assistant' as const, content: res.answer }];
        await AsyncStorage.setItem(MEM_KEY, JSON.stringify(next.slice(-STORE_CAP)));
      } catch {}
    }
  }, [question, chart, factor, profile.name, metrics, authorize, refund, topic]);

  // Error-state retry: re-run (authorizedRef was reset, so it re-authorizes cleanly).
  const onErrorRetry = useCallback(() => { run(); }, [run]);

  // Follow-up chip → PREFILL the Ask Tara input (never auto-send/spend). Mirrors the
  // Home/Insights bridge: stash the draft, then return to the tab which restores it.
  const askFollowup = useCallback((qn: string) => {
    Keyboard.dismiss();
    setAskDraft(qn);
    router.dismissTo('/(tabs)/tara' as any);
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    Keyboard.dismiss(); // the answer view has no input — ensure the tab's keyboard is down
    run();
  }, [run]);

  // "Try again": refetch the server balance (with a spinner). If credits are now
  // available, submit the pending question; otherwise stay with brief feedback —
  // never a silent re-render of the same 0-credit screen.
  const onTryAgain = useCallback(async () => {
    setRefreshNote('');
    setRefetching(true);
    const bal = await refresh();
    setRefetching(false);
    if (typeof bal === 'number' && bal > 0) {
      authorizedRef.current = false; // allow the atomic decrement to run for the pending question
      run();
    } else {
      setRefreshNote('Balance refreshed. Still 0 credits');
    }
  }, [refresh, run]);

  // One rating per answer, changeable. Writes to the ask_history row (server) and keeps a
  // local log as an offline fallback. Selected thumb is highlighted in the UI.
  const rate = useCallback(async (r: 'up' | 'down') => {
    setRating(r);
    if (historyIdRef.current) setHistoryFeedback(historyIdRef.current, r === 'up' ? 1 : -1);
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
        <Pressable onPress={close} hitSlop={8} style={styles.closeX}>
          <Text variant="body" color={colors.muted}>✕ Close</Text>
        </Pressable>
        <View style={styles.center}>
          <Text variant="serif" style={{ fontSize: 22, textAlign: 'center' }}>Add your birth details</Text>
          <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, marginBottom: 22, textAlign: 'center' }}>
            Ask Tara reads the live sky against your birth chart. Add your date, time, and place of birth first.
          </Text>
          <View style={{ alignSelf: 'stretch', paddingHorizontal: spacing.xl }}>
            <GoldButton label="Go back" onPress={close} />
          </View>
        </View>
      </Screen>
    );
  }

  if (state === 'nocredits') {
    return (
      <Screen scroll={false} contentStyle={{ flex: 1 }}>
        <Pressable onPress={close} hitSlop={8} style={styles.closeX}>
          <Text variant="body" color={colors.muted}>✕ Close</Text>
        </Pressable>
        <View style={styles.center}>
          <Text variant="eyebrow" color={colors.gold} style={{ marginBottom: 10 }}>✦ Out of Questions</Text>
          <Text variant="serif" style={{ fontSize: 22, textAlign: 'center' }}>You're out of credits</Text>
          <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, marginBottom: 22, textAlign: 'center' }}>
            Buy a credit pack to ask this question. Credits never expire.
          </Text>
          <View style={{ alignSelf: 'stretch', paddingHorizontal: spacing.xl }}>
            <GoldButton label="Get Credits" onPress={() => router.push('/credits')} />
          </View>
          {refetching ? (
            <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color={colors.gold} size="small" />
              <Text variant="tiny" color={colors.muted}>Checking your balance…</Text>
            </View>
          ) : (
            <Pressable onPress={onTryAgain} hitSlop={8} style={{ marginTop: 16 }}>
              <Text variant="tiny" color={colors.gold} style={{ fontWeight: '600' }}>Try again</Text>
            </Pressable>
          )}
          {refreshNote ? (
            <Text variant="tiny" color={colors.muted} style={{ marginTop: 12 }}>{refreshNote}</Text>
          ) : null}
        </View>
      </Screen>
    );
  }

  if (state === 'fairuse') {
    return (
      <Screen scroll={false} contentStyle={{ flex: 1 }}>
        <Pressable onPress={close} hitSlop={8} style={styles.closeX}>
          <Text variant="body" color={colors.muted}>✕ Close</Text>
        </Pressable>
        <View style={styles.center}>
          <Text variant="eyebrow" color={colors.gold} style={{ marginBottom: 10 }}>✦ Fair-use limit</Text>
          <Text variant="serif" style={{ fontSize: 22, textAlign: 'center' }}>You've reached this month's limit</Text>
          <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, marginBottom: 22, textAlign: 'center', lineHeight: 19 }}>
            You've asked 100 questions this month: the fair-use limit for Premium. Your questions refresh on {resetDate}.
          </Text>
          <View style={{ alignSelf: 'stretch', paddingHorizontal: spacing.xl }}>
            <GoldButton label="Done" onPress={close} />
          </View>
          {/* Overflow option — a credit pack works past the monthly cap (no trapped state). */}
          <Pressable onPress={() => router.push('/credits')} hitSlop={8} style={{ marginTop: 16 }}>
            <Text variant="tiny" color={colors.gold} style={{ fontWeight: '600' }}>Need more now? Get a credit pack →</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  if (state === 'error') {
    return (
      <Screen scroll={false} contentStyle={{ flex: 1 }}>
        <Pressable onPress={close} hitSlop={8} style={styles.closeX}>
          <Text variant="body" color={colors.muted}>✕ Close</Text>
        </Pressable>
        <View style={styles.center}>
          <Text variant="eyebrow" color={colors.gold} style={{ marginBottom: 10 }}>✦ Try once more</Text>
          <Text variant="serif" style={{ fontSize: 22, textAlign: 'center' }}>Tara's answer didn't come through cleanly</Text>
          <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, marginBottom: 22, textAlign: 'center', lineHeight: 19 }}>
            Ask again. This one won't use a credit.
          </Text>
          <View style={{ alignSelf: 'stretch', paddingHorizontal: spacing.xl }}>
            <GoldButton label="Ask again" onPress={onErrorRetry} />
          </View>
          <Pressable onPress={close} hitSlop={8} style={{ marginTop: 16 }}>
            <Text variant="tiny" color={colors.muted}>Close</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Pressable onPress={close} hitSlop={8} style={{ marginBottom: 18 }}>
        <Text variant="body" color={colors.muted}>✕ Close</Text>
      </Pressable>

      {/* a) YOU ASKED */}
      <Eyebrow>You Asked</Eyebrow>
      <Text variant="serif" style={styles.question}>“{question}”</Text>

      {/* b) CELESTIAL CALCULATION CARD — attribution reflects the factors the answer
             actually leaned on (from the model), falling back to the engine factor. */}
      <Card style={styles.calcCard}>
        {factor && <AspectDiagram factor={factor} size={116} />}
        <View style={{ flex: 1, paddingLeft: 14 }}>
          <Eyebrow color={colors.gold}>Celestial Calculation</Eyebrow>
          <Text style={styles.factor}>
            {ans?.factors?.length ? ans.factors.join('  ·  ') : factor?.label}
          </Text>
        </View>
      </Card>

      {/* c) THE ANSWER */}
      <Eyebrow>The Answer</Eyebrow>
      {state === 'loading' ? (
        <View style={styles.answerLoading}>
          <ActivityIndicator color={colors.gold} />
          <Text variant="tiny" color={colors.muted} style={{ marginTop: 10 }}>Tara is reading your chart…</Text>
        </View>
      ) : (
        <>
          <AnswerBody text={ans?.answer ?? ''} />

          {/* Takeaway — one memorable standalone line, styled distinctly. */}
          {ans?.takeaway ? (
            <View style={styles.takeawayBox}>
              <Text variant="eyebrow" color={colors.gold} style={{ marginBottom: 6 }}>Today's Takeaway</Text>
              <Text style={styles.takeawayLine}>{noEmDash(ans.takeaway)}</Text>
            </View>
          ) : null}

          {/* Follow-up suggestions — tap prefills the Ask Tara input (no auto-send). */}
          {ans?.followups?.length ? (
            <View style={{ marginTop: spacing.xl }}>
              <Eyebrow color={colors.muted}>You may also want to ask</Eyebrow>
              <View style={{ gap: 8, marginTop: 10 }}>
                {ans.followups.map((f) => (
                  <Pressable key={f} onPress={() => askFollowup(f)} style={styles.followChip}>
                    <Text variant="body" style={{ fontSize: 13.5, flex: 1 }}>{noEmDash(f)}</Text>
                    <Text style={{ color: colors.gold, fontSize: 15 }}>↑</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </>
      )}

      {/* d) FEEDBACK */}
      {state === 'ready' && (
        <View style={{ marginTop: spacing.xl }}>
          <Eyebrow color={colors.muted}>How was this answer?</Eyebrow>
          <View style={styles.thumbs}>
            <Pressable onPress={() => rate('up')} style={[styles.thumb, rating === 'up' && styles.thumbOn]} hitSlop={8}>
              <Text style={styles.thumbGlyph}>👍</Text>
            </Pressable>
            <Pressable onPress={() => rate('down')} style={[styles.thumb, rating === 'down' && styles.thumbOn]} hitSlop={8}>
              <Text style={styles.thumbGlyph}>👎</Text>
            </Pressable>
          </View>
          {rating ? (
            <Text variant="tiny" color={colors.sage} style={{ marginTop: 10 }}>
              Thank you. Tara learns from this. Tap again to change.
            </Text>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  closeX: { alignSelf: 'flex-start', marginBottom: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  question: { fontSize: 22, lineHeight: 30, marginTop: 8, marginBottom: spacing.xl, color: colors.cream },
  calcCard: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl },
  factor: { fontFamily: fonts.sansSemi, color: colors.gold, fontSize: 12.5, letterSpacing: 0.8, lineHeight: 18, marginTop: 8 },
  answerLoading: { alignItems: 'flex-start', paddingVertical: 20 },
  answer: { fontSize: 17, lineHeight: 27, color: colors.cream },
  leadIn: { fontFamily: fonts.sansSemi, color: colors.gold, fontSize: 13, letterSpacing: 0.3 },
  takeawayBox: {
    marginTop: spacing.xl, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 18,
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(205,163,73,0.35)', backgroundColor: 'rgba(205,163,73,0.07)',
  },
  takeawayLine: { fontWeight: '500', fontSize: 16, lineHeight: 24, color: colors.cream },
  followChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13,
    backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg,
  },
  thumbs: { flexDirection: 'row', gap: 14, marginTop: 12, marginBottom: 8 },
  thumb: {
    width: 56, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card,
  },
  thumbOn: { borderColor: colors.gold, backgroundColor: 'rgba(205,163,73,0.14)' },
  // Emoji glyphs clip without an explicit lineHeight (the box is shorter than the glyph);
  // includeFontPadding:false + centered text keeps 👍/👎 fully visible in the tap target.
  thumbGlyph: { fontSize: 22, lineHeight: 30, includeFontPadding: false, textAlign: 'center' },
});
