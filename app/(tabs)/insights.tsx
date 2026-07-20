// app/(tabs)/insights.tsx
import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Screen from '@/components/Screen';
import { Text, Card, Eyebrow } from '@/components/ui';
import Disclaimer from '@/components/Disclaimer';
import { insights, todayLong } from '@/data/mock';
import { colors, spacing } from '@/theme';

// [label, body, accent color, the "Ask Tara why" question this card seeds]
const ENERGY_ROWS: [string, string, string, string][] = [
  ['Emotional Energy', insights.emotional, colors.rose, 'Why does my emotional energy feel this way today?'],
  ['Mental Energy', insights.mental, colors.lav, 'Why is my mind moving like this today?'],
  ['Relationship Energy', insights.relationship, colors.rose, "What's shaping my relationships today?"],
  ['Career Energy', insights.career, colors.goldSoft, 'Why is my career energy where it is today?'],
  ['Body Signal', insights.body, colors.sage, 'What is my body signalling today?'],
  ['Spiritual Guidance', insights.spiritual, colors.saffron, 'What spiritual guidance is here for me today?'],
];

// Route into the normal gated answer flow (spends a credit like any other question).
const askWhy = (q: string) => router.push({ pathname: '/ask/answer', params: { q } } as any);

export default function Insights() {
  return (
    <Screen>
      <Animated.View entering={FadeInDown.duration(500)}>
        <Eyebrow>Daily Insights · {todayLong()}</Eyebrow>
        <Text variant="h1" style={{ marginTop: 8, marginBottom: spacing.lg }}>Your Cosmic Weather</Text>
      </Animated.View>

      <Card solid glow style={{ marginBottom: spacing.lg }}>
        <Text variant="serif" style={{ fontSize: 16.5, lineHeight: 25 }}>{insights.cosmicWeather}</Text>
      </Card>

      {ENERGY_ROWS.map(([label, body, color, q]) => (
        <Card key={label} style={{ marginBottom: 12 }}>
          <Eyebrow color={color}>{label}</Eyebrow>
          <Text variant="tiny" style={{ marginTop: 8, fontSize: 13 }}>{body}</Text>
          <Pressable onPress={() => askWhy(q)} hitSlop={6} style={{ marginTop: 12, alignSelf: 'flex-start' }}>
            <Text variant="tiny" color={colors.gold} style={{ fontWeight: '600', fontSize: 12.5 }}>Ask Tara why →</Text>
          </Pressable>
        </Card>
      ))}

      <View style={styles.dual}>
        <Card style={{ flex: 1 }}>
          <Eyebrow color={colors.rose}>What to Avoid</Eyebrow>
          <Text variant="tiny" style={{ marginTop: 8 }}>{insights.avoid}</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Eyebrow color={colors.sage}>Lean Into</Eyebrow>
          <Text variant="tiny" style={{ marginTop: 8 }}>{insights.leanInto}</Text>
        </Card>
      </View>

      <Card solid style={{ marginTop: spacing.lg }}>
        <Eyebrow>Mantra of the Day</Eyebrow>
        <Text variant="serif" style={{ fontSize: 19, marginTop: 8, color: colors.goldSoft }}>{insights.mantra}</Text>
        <Text variant="tiny" style={{ marginTop: 6 }}>{insights.mantraNote}</Text>
      </Card>

      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  dual: { flexDirection: 'row', gap: 12 },
});
