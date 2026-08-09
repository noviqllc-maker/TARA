// app/(tabs)/tara.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, ScrollView, Pressable, StyleSheet, KeyboardAvoidingView, Platform, TextInput, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInUp } from 'react-native-reanimated';
import CosmicBackground from '@/components/CosmicBackground';
import { Text, Eyebrow, Card, GoldButton } from '@/components/ui';
import { ChatMessage } from '@/lib/ai';
import { taraQuestions, QuestionCategory, chartTodayPrompts } from '@/data/taraQuestions';
import { useChart } from '@/hooks/useChart';
import { useProfile } from '@/hooks/useProfile';
import { useCredits } from '@/hooks/useCredits';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { getRememberChat } from '@/lib/privacy';
import { takeAskDraft } from '@/lib/askDraft';
import { colors, fonts, radius, spacing } from '@/theme';
import Markdown from 'react-native-markdown-display';

const MEM_KEY = 'tara.chat.v1';
const STORE_CAP = 200;       // most-recent messages persisted on-device (bounds storage)

// Maps each onboarding priority to the closest Ask Tara question theme, so a user's chosen
// areas surface first among the suggestion chips (a subtle seed, not a filter: all themes stay).
const PRIORITY_CATEGORY: Record<string, QuestionCategory['key']> = {
  career: 'Career', business: 'Career', money: 'Money',
  love: 'Love', family: 'Love', health: 'Mind', purpose: 'Destiny', learning: 'Mind',
};

export default function AskTara() {
  const insets = useSafeAreaInsets();
  const chart = useChart();
  const { profile } = useProfile();
  // Question credits are server-authoritative; the balance here just mirrors the server.
  // Premium users see monthly fair-use remaining instead of a credit count.
  const { balance, premiumRemaining, isPremium, refresh } = useCredits();
  const params = useLocalSearchParams<{ category?: string }>();
  // Per-day prompts from the user's active transits/dasha (deterministic within a day).
  const todayPrompts = useMemo(() => (chart ? chartTodayPrompts(chart) : []), [chart]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  // 'ForYou' = the per-day chart prompts, surfaced as the first suggestion chip.
  const [category, setCategory] = useState<'ForYou' | QuestionCategory['key']>('ForYou');
  const [rememberChat, setRememberChat] = useState(true);
  const [showFresh, setShowFresh] = useState(false); // view suggestions without clearing the thread
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  // Temporary controlled selection so a prefill lands the caret at the END; released
  // (set back to undefined) a tick later so the user can move the caret freely.
  const [sel, setSel] = useState<{ start: number; end: number } | undefined>(undefined);

  // Free users out of credits get the buy-credits fast-path. Premium users are never
  // blocked here — the monthly fair-use cap is handled (with a friendly screen) in the
  // answer view, so a capped premium user still gets there (and the credit-pack overflow).
  const outOfCredits = !isPremium && balance !== null && balance <= 0;

  // Every question suggestion routes through here: it PREFILLS the input and never sends.
  // Spending a credit requires the explicit send press.
  //  - focus:true  (direct chip tap on this tab) → focus + caret at end + raise keyboard.
  //  - focus:false (arriving from a Home/Insights bridge) → prefill ONLY, do NOT raise the
  //    keyboard. Auto-raising on a bridge arrival trapped users: the tara tab is a root tab
  //    with no back button, the keyboard covered the tab bar, and there was no dismiss
  //    affordance. Prefill-without-focus means the tab bar is visible on arrival.
  const prefill = useCallback((q: string, opts?: { focus?: boolean }) => {
    const t = q.trim();
    if (!t) return;
    setInput(t);
    if (opts?.focus === false) return;
    const end = t.length;
    setSel({ start: end, end });
    requestAnimationFrame(() => inputRef.current?.focus());
    setTimeout(() => setSel(undefined), 80);
  }, []);

  // Suggestion chips: "✦ For You" (chart-today prompts) first when a chart exists, then
  // the five life themes. Selecting a chip swaps the question list below — all rendered
  // the same way. Falls back to the first available chip if the selection isn't present
  // (e.g. 'ForYou' before the chart has loaded).
  // The five life-theme chips, reordered so the user's chosen priorities lead (all remain).
  const orderedQuestions = useMemo(() => {
    const prefs = profile.userPriorities ?? [];
    if (!prefs.length) return taraQuestions;
    const wanted: QuestionCategory['key'][] = [];
    for (const p of prefs) { const k = PRIORITY_CATEGORY[p]; if (k && !wanted.includes(k)) wanted.push(k); }
    const preferred = wanted.map((k) => taraQuestions.find((c) => c.key === k)).filter(Boolean) as QuestionCategory[];
    const rest = taraQuestions.filter((c) => !wanted.includes(c.key));
    return [...preferred, ...rest];
  }, [profile.userPriorities]);
  const chips = useMemo(
    () =>
      todayPrompts.length > 0
        ? [{ key: 'ForYou' as const, label: 'For You', icon: '✦', color: colors.gold, questions: todayPrompts }, ...orderedQuestions]
        : orderedQuestions,
    [todayPrompts, orderedQuestions],
  );
  const activeChip = chips.find((c) => c.key === category) ?? chips[0];

  // Load memory — only if the privacy "remember conversations" setting is on.
  useEffect(() => {
    (async () => {
      const remember = await getRememberChat();
      setRememberChat(remember);
      if (remember) {
        const v = await AsyncStorage.getItem(MEM_KEY);
        if (v) setMessages(JSON.parse(v));
      }
    })();
  }, []);
  // On focus: restore a question preserved by the answer view (out-of-credits /
  // interrupted), re-check the privacy toggle, AND reload history so a Q&A just added
  // by the answer view appears here (persistence is unchanged — same MEM_KEY).
  useFocusEffect(React.useCallback(() => {
    // A question prefilled from Home / Insights (or preserved from an interrupted answer)
    // lands in the input but does NOT raise the keyboard (see prefill) — the user taps the
    // field to edit/send. Never auto-sent.
    const restored = takeAskDraft();
    if (restored) prefill(restored, { focus: false });
    // Re-read the server balance on entry: credits bought on the paywall (or granted by a
    // late webhook) must unlock questions here without waiting for an app restart.
    refresh();
    (async () => {
      const remember = await getRememberChat();
      setRememberChat(remember);
      if (remember) {
        const v = await AsyncStorage.getItem(MEM_KEY);
        if (v) setMessages(JSON.parse(v));
      }
    })();
    // Blur handler: whenever this tab loses focus (to the answer view, the journal, a tab
    // switch, etc.) drop the keyboard so it can never linger over the next screen.
    return () => { Keyboard.dismiss(); };
  }, [refresh, prefill]));

  // Pre-select a category when navigated here with a `category` param (e.g. from the
  // Love screen → "Relationships"). Case-insensitive; falls back to the current default.
  // Sets state even if chat history hides the tabs, so the right category shows on New chat.
  useEffect(() => {
    if (!params.category) return;
    const match = taraQuestions.find(
      (c) => c.key.toLowerCase() === String(params.category).toLowerCase(),
    );
    if (match) setCategory(match.key);
  }, [params.category]);
  useEffect(() => {
    if (rememberChat) AsyncStorage.setItem(MEM_KEY, JSON.stringify(messages.slice(-STORE_CAP))).catch(() => {});
    else AsyncStorage.removeItem(MEM_KEY).catch(() => {});
    // Only auto-scroll to the latest message in an ACTIVE chat. In the empty
    // suggestions view this would scroll the tab to the bottom of the list on mount,
    // landing mid-page — the tab must open at the very top.
    if (messages.length > 0) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages, rememberChat]);

  // A question opens the full-screen answer view, which performs the AUTHORITATIVE
  // server-side credit decrement before generating. We only fast-path to the credits
  // paywall here when we already know the balance is 0 (server still has final say).
  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    Keyboard.dismiss(); // drop the keyboard before leaving the tab (belt-and-suspenders vs blur)
    if (outOfCredits) { router.push('/credits'); return; }
    setInput('');
    setShowFresh(false); // asking → return to the thread view on the way back
    router.push({ pathname: '/ask/answer', params: { q: t } });
  };

  // A thread exists once there are messages. `showFresh` lets the user view the suggestions
  // WITHOUT clearing the thread (the ‹ back affordance); "New" still clears it.
  const hasThread = messages.length > 0;
  const showSuggestions = !hasThread || showFresh;

  // Start over → clears history and returns to the suggested-questions view.
  const clearChat = () => {
    setMessages([]);
    setShowFresh(false);
    AsyncStorage.removeItem(MEM_KEY).catch(() => {});
  };

  return (
    <View style={{ flex: 1 }}>
      <CosmicBackground />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, paddingTop: insets.top + 8 }}
      >
        <View style={{ paddingHorizontal: spacing.xl, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            {/* During an active chat, ‹ returns to the suggestions view without clearing
                the thread; from that view, ‹ returns to the chat. */}
            {hasThread && (
              <Pressable onPress={() => setShowFresh((v) => !v)} hitSlop={8} style={{ marginBottom: 2 }}>
                <Text variant="tiny" color={colors.gold}>{showFresh ? '‹ Back to chat' : '‹ Suggestions'}</Text>
              </Pressable>
            )}
            <Eyebrow>Ask Tara · Your 24/7 Guide</Eyebrow>
            <Text variant="h2" style={{ marginTop: 4 }}>Ask Tara anything</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 7, paddingBottom: 4 }}>
            {/* Premium: monthly fair-use remaining (+ any credits as overflow). Free: credit count + Get more. */}
            {isPremium ? (
              (premiumRemaining !== null && premiumRemaining <= 0 && (balance ?? 0) > 0) ? (
                // Monthly used up → credits are now doing the work.
                <Text variant="tiny" color={colors.gold} style={{ fontWeight: '600' }}>
                  Using your credits · {balance} left
                </Text>
              ) : (
                <Text variant="tiny" color={colors.gold} style={{ fontWeight: '600' }}>
                  ✦ {premiumRemaining === null ? '–' : premiumRemaining} left this month{(balance ?? 0) > 0 ? ` · ${balance} credits` : ''}
                </Text>
              )
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text variant="tiny" color={outOfCredits ? colors.terra : colors.gold} style={{ fontWeight: '600' }}>
                  ✦ {balance === null ? '–' : balance}
                </Text>
                <Pressable onPress={() => router.push('/credits')} hitSlop={6} style={styles.getMorePill}>
                  <Text variant="tiny" color={colors.gold} style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: 0.3 }}>Get more</Text>
                </Pressable>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Pressable onPress={() => { Keyboard.dismiss(); router.push('/ask/history' as any); }} hitSlop={6}>
                <Text variant="tiny" color={colors.gold}>◔ My Cosmic Journal</Text>
              </Pressable>
              {hasThread && (
                <Pressable onPress={clearChat} hitSlop={6}>
                  <Text variant="tiny" color={colors.muted}>New</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          {showSuggestions && (
            <View style={{ marginTop: 8 }}>
              <Text variant="serif" color={colors.muted} style={{ fontSize: 15, lineHeight: 23, marginBottom: 18 }}>
                I know your chart, your dashas, today's transits and your wellness signals. Ask me about love, career, timing, or what to focus on.
              </Text>

              <Eyebrow color={colors.muted}>Suggested Questions</Eyebrow>
              {/* Suggestion chips — ✦ For You (chart-today) · Mind · Love · Career · Money · Destiny */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
              >
                {chips.map((c) => {
                  const active = c.key === activeChip?.key;
                  return (
                    <Pressable
                      key={c.key}
                      onPress={() => setCategory(c.key)}
                      style={[styles.catTab, active && { backgroundColor: c.color, borderColor: c.color }]}
                    >
                      <Text variant="tiny" color={active ? '#1a1018' : colors.muted} style={{ fontSize: 11.5, fontWeight: active ? '600' : '400' }}>
                        {c.icon}  {c.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              {/* Questions for the selected chip (For You = per-day chart prompts) */}
              <View style={{ gap: 9 }}>
                {(activeChip?.questions ?? []).map((q) => (
                  <Pressable key={q} style={styles.suggest} onPress={() => prefill(q)}>
                    <Text variant="body" style={{ fontSize: 13.5 }}>{q}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {!showSuggestions && messages.map((m, i) => (
            <Animated.View
              key={i}
              entering={FadeInUp.duration(300)}
              style={[styles.bubble, m.role === 'user' ? styles.user : styles.assistant]}
            >
              {m.role === 'assistant' && <Text variant="eyebrow" color={colors.gold} style={{ marginBottom: 6 }}>✦ Tara</Text>}
              {m.role === 'user' ? (
                <Text variant="body" color="#1a1018" style={{ lineHeight: 22 }}>
                  {m.content}
                </Text>
              ) : (
                <Markdown style={markdownStyles}>{m.content}</Markdown>
              )}
            </Animated.View>
          ))}

        </ScrollView>

        {outOfCredits ? (
          <Animated.View entering={FadeInUp.duration(300)} style={{ marginHorizontal: spacing.xl, marginTop: 8, marginBottom: insets.bottom + 70 }}>
            <Card solid glow>
              <Eyebrow color={colors.gold}>✦ Out of Questions</Eyebrow>
              <Text variant="serif" style={{ fontSize: 17, marginTop: 8 }}>You've used all your Ask Tara credits</Text>
              <Text variant="tiny" style={{ marginTop: 6 }}>Buy a credit pack to keep asking. Credits never expire.</Text>
              <GoldButton label="Get Credits" onPress={() => router.push('/credits')} style={{ marginTop: 14 }} />
            </Card>
          </Animated.View>
        ) : (
          <View style={[styles.inputBar, { paddingBottom: insets.bottom + 70 }]}>
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              selection={sel}
              placeholder="Ask Tara…"
              placeholderTextColor={colors.mutedDim}
              style={styles.input}
              onSubmitEditing={() => send(input)}
              returnKeyType="send"
            />
            <Pressable style={styles.sendBtn} onPress={() => send(input)}>
              <Text style={{ fontSize: 18, color: '#1a1018' }}>↑</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  getMorePill: {
    paddingVertical: 3, paddingHorizontal: 10, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.gold, backgroundColor: 'rgba(205,163,73,0.10)',
  },
  suggest: {
    padding: 14, backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg,
  },
  catTab: {
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card,
  },
  bubble: { maxWidth: '88%', borderRadius: 18, padding: 14, marginTop: 12 },
  user: { alignSelf: 'flex-end', backgroundColor: colors.goldSoft },
  assistant: { alignSelf: 'flex-start', backgroundColor: colors.cardSolid, borderColor: colors.line, borderWidth: 1 },
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: spacing.xl, paddingTop: 10,
    borderTopColor: colors.line, borderTopWidth: 1, backgroundColor: 'rgba(12,8,18,0.7)',
  },
  input: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: colors.line, borderWidth: 1,
    borderRadius: radius.pill, paddingVertical: 12, paddingHorizontal: 18, color: colors.cream, fontFamily: fonts.sans, fontWeight: '400', fontSize: 15,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center',
  },
});

const markdownStyles = {
  body: { color: colors.cream, fontFamily: fonts.sans, fontSize: 15, lineHeight: 23 },
  paragraph: { marginTop: 0, marginBottom: 12 },
  strong: { color: colors.gold, fontWeight: '600' as const },
  em: { fontStyle: 'italic' as const, color: colors.cream },
  heading1: { color: colors.gold, fontSize: 18, fontWeight: '700' as const, marginTop: 4, marginBottom: 8 },
  heading2: { color: colors.gold, fontSize: 16, fontWeight: '600' as const, marginTop: 10, marginBottom: 6 },
  bullet_list: { marginTop: 2, marginBottom: 8 },
  ordered_list: { marginTop: 2, marginBottom: 8 },
  list_item: { marginBottom: 4 },
  bullet_list_icon: { color: colors.gold },
  link: { color: colors.goldSoft, textDecorationLine: 'underline' as const },
  blockquote: {
    backgroundColor: 'rgba(205,163,73,0.08)',
    borderLeftColor: colors.gold,
    borderLeftWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginVertical: 6,
  },
  code_inline: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: colors.cream,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
};
