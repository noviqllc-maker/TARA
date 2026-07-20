// app/(tabs)/tara.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, ScrollView, Pressable, StyleSheet, KeyboardAvoidingView, Platform, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInUp } from 'react-native-reanimated';
import CosmicBackground from '@/components/CosmicBackground';
import { Text, Eyebrow, Card, GoldButton } from '@/components/ui';
import { ChatMessage } from '@/lib/ai';
import { taraQuestions, QuestionCategory, chartTodayPrompts } from '@/data/taraQuestions';
import { useChart } from '@/hooks/useChart';
import { useCredits } from '@/hooks/useCredits';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { getRememberChat } from '@/lib/privacy';
import { takeAskDraft } from '@/lib/askDraft';
import { colors, fonts, radius, spacing } from '@/theme';
import Markdown from 'react-native-markdown-display';

const MEM_KEY = 'tara.chat.v1';
const STORE_CAP = 200;       // most-recent messages persisted on-device (bounds storage)

export default function AskTara() {
  const insets = useSafeAreaInsets();
  const chart = useChart();
  // Question credits are server-authoritative; the balance here just mirrors the server.
  const { balance, refresh } = useCredits();
  const params = useLocalSearchParams<{ category?: string }>();
  // Per-day prompts from the user's active transits/dasha (deterministic within a day).
  const todayPrompts = useMemo(() => (chart ? chartTodayPrompts(chart) : []), [chart]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [category, setCategory] = useState<QuestionCategory['key']>('Mind');
  const [rememberChat, setRememberChat] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  const outOfCredits = balance !== null && balance <= 0;

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
    const restored = takeAskDraft();
    if (restored) setInput(restored);
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
  }, [refresh]));

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
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages, rememberChat]);

  // A question opens the full-screen answer view, which performs the AUTHORITATIVE
  // server-side credit decrement before generating. We only fast-path to the credits
  // paywall here when we already know the balance is 0 (server still has final say).
  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    if (outOfCredits) { router.push('/credits'); return; }
    setInput('');
    router.push({ pathname: '/ask/answer', params: { q: t } });
  };

  const empty = messages.length === 0;

  // Start over → clears history and returns to the suggested-questions view.
  const clearChat = () => {
    setMessages([]);
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
            <Eyebrow>Ask Tara · Your 24/7 Guide</Eyebrow>
            <Text variant="h2" style={{ marginTop: 4 }}>Ask Tara anything</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 8, paddingBottom: 4 }}>
            <Pressable onPress={() => router.push('/ask/history' as any)} hitSlop={8}>
              <Text variant="tiny" color={colors.gold}>◔ Past questions</Text>
            </Pressable>
            {!empty && (
              <Pressable onPress={clearChat} hitSlop={8}>
                <Text variant="tiny" color={colors.muted}>New conversation</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Server-authoritative credit balance. Tap to buy more. */}
        <View style={{ paddingHorizontal: spacing.xl, marginBottom: 8 }}>
          <Pressable onPress={() => router.push('/credits')} hitSlop={6} style={styles.balanceRow}>
            <Text variant="tiny" color={outOfCredits ? colors.terra : colors.gold} style={{ fontWeight: '600' }}>
              ✦ {balance === null ? '—' : balance} {balance === 1 ? 'question' : 'questions'} left
            </Text>
            <Text variant="tiny" color={colors.gold} style={{ fontWeight: '600' }}>
              {outOfCredits ? 'Get more →' : 'Get more'}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {empty && (
            <View style={{ marginTop: 8 }}>
              <Text variant="serif" color={colors.muted} style={{ fontSize: 15, lineHeight: 23, marginBottom: 18 }}>
                I know your chart, your dashas, today's transits and your wellness signals. Ask me about love, career, timing, or what to focus on.
              </Text>

              {/* Based on your chart today — personalized, per-day prompts. Tapping
                  prefills the input; sending routes through the same gated answer flow. */}
              {todayPrompts.length > 0 && (
                <View style={{ marginBottom: 22 }}>
                  <Eyebrow color={colors.gold}>✦ Based on your chart today</Eyebrow>
                  <View style={{ gap: 9, marginTop: 12 }}>
                    {todayPrompts.map((q) => (
                      <Pressable key={q} style={styles.todayCard} onPress={() => setInput(q)}>
                        <Text variant="body" style={{ fontSize: 13.5, flex: 1 }}>{q}</Text>
                        <Text style={{ color: colors.gold, fontSize: 15 }}>↑</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              <Eyebrow color={colors.muted}>Suggested Questions</Eyebrow>
              {/* Category tabs — Mind · Love · Career · Money · Destiny */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
              >
                {taraQuestions.map((c) => {
                  const active = c.key === category;
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
              {/* Questions for the selected category */}
              <View style={{ gap: 9 }}>
                {(taraQuestions.find((c) => c.key === category)?.questions ?? []).map((q) => (
                  <Pressable key={q} style={styles.suggest} onPress={() => send(q)}>
                    <Text variant="body" style={{ fontSize: 13.5 }}>{q}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {messages.map((m, i) => (
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
              value={input}
              onChangeText={setInput}
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
  balanceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 9, paddingHorizontal: 14,
    backgroundColor: 'rgba(205,163,73,0.06)', borderColor: colors.line, borderWidth: 1, borderRadius: radius.pill,
  },
  suggest: {
    padding: 14, backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg,
  },
  todayCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
    backgroundColor: 'rgba(205,163,73,0.06)', borderColor: colors.gold, borderWidth: 1, borderRadius: radius.lg,
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
