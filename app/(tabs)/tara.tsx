// app/(tabs)/tara.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View, ScrollView, Pressable, StyleSheet, KeyboardAvoidingView, Platform, TextInput, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInUp } from 'react-native-reanimated';
import CosmicBackground from '@/components/CosmicBackground';
import { Text, Eyebrow, Card, GoldButton } from '@/components/ui';
import { askTara, ChatMessage } from '@/lib/ai';
import { taraQuestions, QuestionCategory } from '@/data/taraQuestions';
import { useProfile } from '@/hooks/useProfile';
import { useChart } from '@/hooks/useChart';
import { useSubscription } from '@/hooks/useSubscription';
import { useHealth } from '@/hooks/useHealth';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { getLanguage } from '@/lib/language';
import { getRememberChat } from '@/lib/privacy';
import { colors, fonts, radius, spacing, domainColors } from '@/theme';
import Markdown from 'react-native-markdown-display';

const MEM_KEY = 'tara.chat.v1';
const DAILY_LIMIT = 5; // non-premium: 5 free questions per calendar day (resets at midnight)

// AsyncStorage key for today's question count, e.g. "tara.usage.2026-06-23".
const usageKey = (d = new Date()) =>
  `tara.usage.${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function TaraAI() {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const chart = useChart();
  const { isPremium } = useSubscription();
  const { metrics } = useHealth();
  const params = useLocalSearchParams<{ category?: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [category, setCategory] = useState<QuestionCategory['key']>('Mind');
  const [thinking, setThinking] = useState(false);
  const [usedToday, setUsedToday] = useState(0);
  const [upsellDismissed, setUpsellDismissed] = useState(false);
  const [rememberChat, setRememberChat] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  const limitReached = !isPremium && usedToday >= DAILY_LIMIT;

  // Load memory — only if the privacy "remember conversations" setting is on.
  useEffect(() => {
    (async () => {
      const remember = await getRememberChat();
      setRememberChat(remember);
      if (remember) {
        const v = await AsyncStorage.getItem(MEM_KEY);
        if (v) setMessages(JSON.parse(v));
      }
      // Load today's question count — auto-resets daily since a new day has no key yet.
      const u = await AsyncStorage.getItem(usageKey());
      setUsedToday(u ? parseInt(u, 10) || 0 : 0);
    })();
  }, []);
  // Re-check the privacy toggle whenever this tab regains focus.
  useFocusEffect(React.useCallback(() => { getRememberChat().then(setRememberChat); }, []));

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
    if (rememberChat) AsyncStorage.setItem(MEM_KEY, JSON.stringify(messages.slice(-30))).catch(() => {});
    else AsyncStorage.removeItem(MEM_KEY).catch(() => {});
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages, rememberChat]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || thinking) return;
    if (limitReached) { router.push('/paywall'); return; }
    // Count this question against today's free allowance (premium is unlimited).
    if (!isPremium) {
      const nextCount = usedToday + 1;
      setUsedToday(nextCount);
      AsyncStorage.setItem(usageKey(), String(nextCount)).catch(() => {});
    }
    const next = [...messages, { role: 'user' as const, content: t }];
    setMessages(next);
    setInput('');
    setThinking(true);
    const language = await getLanguage();
    const reply = await askTara(next, profile.name || 'friend', chart, metrics, language);
    setMessages([...next, { role: 'assistant', content: reply }]);
    setThinking(false);
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
            <Eyebrow>Tara AI · Your 24/7 Guide</Eyebrow>
            <Text variant="h2" style={{ marginTop: 4 }}>Ask Tara anything</Text>
          </View>
          {!empty && (
            <Pressable onPress={clearChat} hitSlop={8} style={{ paddingBottom: 4 }}>
              <Text variant="tiny" color={colors.gold}>New chat</Text>
            </Pressable>
          )}
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
              <Eyebrow color={colors.muted}>Suggested Questions</Eyebrow>
              {/* Category tabs — mirror the five Today energy rings */}
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
                      style={[styles.catTab, active && { backgroundColor: domainColors[c.key], borderColor: domainColors[c.key] }]}
                    >
                      <Text variant="tiny" color={active ? '#1a1018' : colors.muted} style={{ fontSize: 11.5, fontWeight: active ? '600' : '400' }}>
                        {c.label}
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

          {thinking && (
            <View style={[styles.bubble, styles.assistant, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
              <ActivityIndicator color={colors.gold} size="small" />
              <Text variant="tiny" color={colors.muted}>Tara is reflecting…</Text>
            </View>
          )}
        </ScrollView>

        {limitReached && !upsellDismissed ? (
          <Animated.View entering={FadeInUp.duration(300)} style={{ marginHorizontal: spacing.xl, marginTop: 8, marginBottom: insets.bottom + 70 }}>
            <Card solid glow>
              <Eyebrow color={colors.gold}>✦ Daily Limit Reached</Eyebrow>
              <Text variant="serif" style={{ fontSize: 17, marginTop: 8 }}>You've reached today's {DAILY_LIMIT} free questions</Text>
              <Text variant="tiny" style={{ marginTop: 6 }}>Upgrade to Tara Premium for unlimited conversations with Tara.</Text>
              <GoldButton label="Upgrade to Premium" onPress={() => router.push('/paywall')} style={{ marginTop: 14 }} />
              <Pressable onPress={() => setUpsellDismissed(true)} style={{ marginTop: 12 }}>
                <Text variant="tiny" color={colors.muted} style={{ textAlign: 'center' }}>Maybe later</Text>
              </Pressable>
            </Card>
          </Animated.View>
        ) : (
          <View style={[styles.inputBar, { paddingBottom: insets.bottom + 70 }]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={limitReached ? `Today's ${DAILY_LIMIT} free questions used · resets tomorrow` : 'Ask Tara…'}
              placeholderTextColor={colors.mutedDim}
              style={styles.input}
              editable={!limitReached}
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
