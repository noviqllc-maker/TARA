// app/(tabs)/tara.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View, ScrollView, Pressable, StyleSheet, KeyboardAvoidingView, Platform, TextInput, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInUp } from 'react-native-reanimated';
import CosmicBackground from '@/components/CosmicBackground';
import { Text, Eyebrow } from '@/components/ui';
import { askTara, ChatMessage } from '@/lib/ai';
import { suggestedQuestions } from '@/data/mock';
import { useProfile } from '@/hooks/useProfile';
import { useChart } from '@/hooks/useChart';
import { useSubscription } from '@/hooks/useSubscription';
import { useHealth } from '@/hooks/useHealth';
import { router } from 'expo-router';
import { colors, fonts, radius, spacing } from '@/theme';

const MEM_KEY = 'tara.chat.v1';
const FREE_LIMIT = 5; // free users get 5 questions, then Premium

export default function TaraAI() {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const chart = useChart();
  const { isPremium } = useSubscription();
  const { metrics } = useHealth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const userMsgCount = messages.filter((m) => m.role === 'user').length;
  const limitReached = !isPremium && userMsgCount >= FREE_LIMIT;

  // Load memory
  useEffect(() => {
    AsyncStorage.getItem(MEM_KEY).then((v) => { if (v) setMessages(JSON.parse(v)); });
  }, []);
  useEffect(() => {
    AsyncStorage.setItem(MEM_KEY, JSON.stringify(messages.slice(-30))).catch(() => {});
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || thinking) return;
    if (limitReached) { router.push('/paywall'); return; }
    const next = [...messages, { role: 'user' as const, content: t }];
    setMessages(next);
    setInput('');
    setThinking(true);
    const reply = await askTara(next, profile.name || 'friend', chart, metrics);
    setMessages([...next, { role: 'assistant', content: reply }]);
    setThinking(false);
  };

  const empty = messages.length === 0;

  return (
    <View style={{ flex: 1 }}>
      <CosmicBackground />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, paddingTop: insets.top + 8 }}
      >
        <View style={{ paddingHorizontal: spacing.xl, marginBottom: 8 }}>
          <Eyebrow>Tara AI · Your 24/7 Guide</Eyebrow>
          <Text variant="h2" style={{ marginTop: 4 }}>Ask Tara anything</Text>
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
              <View style={{ gap: 9, marginTop: 12 }}>
                {suggestedQuestions.map((q) => (
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
              <Text variant="body" color={m.role === 'user' ? '#1a1018' : colors.cream} style={{ lineHeight: 22 }}>
                {m.content}
              </Text>
            </Animated.View>
          ))}

          {thinking && (
            <View style={[styles.bubble, styles.assistant, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
              <ActivityIndicator color={colors.gold} size="small" />
              <Text variant="tiny" color={colors.muted}>Tara is reflecting…</Text>
            </View>
          )}
        </ScrollView>

        {limitReached && (
          <Pressable onPress={() => router.push('/paywall')} style={{ marginHorizontal: spacing.xl, marginBottom: 8, padding: 14, borderRadius: 14, backgroundColor: 'rgba(205,163,73,0.12)', borderWidth: 1, borderColor: colors.line }}>
            <Text variant="body" color={colors.goldSoft} style={{ textAlign: 'center', fontSize: 13.5 }}>
              ✦ You've used your free questions — tap for unlimited Tara AI with Premium
            </Text>
          </Pressable>
        )}

        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 70 }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={limitReached ? 'Upgrade for unlimited questions' : 'Ask Tara…'}
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
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  suggest: {
    padding: 14, backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg,
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
    borderRadius: radius.pill, paddingVertical: 12, paddingHorizontal: 18, color: colors.cream, fontFamily: fonts.sans, fontSize: 15,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center',
  },
});
