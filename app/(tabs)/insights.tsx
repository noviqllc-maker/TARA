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

const ENERGY_ROWS: [string, string, string][] = [
  ['Emotional Energy', insights.emotional, colors.rose],
  ['Mental Energy', insights.mental, colors.lav],
  ['Relationship Energy', insights.relationship, colors.rose],
  ['Career Energy', insights.career, colors.goldSoft],
  ['Body Signal', insights.body, colors.sage],
  ['Spiritual Guidance', insights.spiritual, colors.saffron],
];

const SECTIONS = [
  { label: 'Love & Relationships', route: '/insights/love' },
  { label: 'Career & Money', route: '/insights/career' },
  { label: 'Health & Wellness', route: '/insights/wellness' },
  { label: 'Life Purpose', route: '/insights/purpose' },
];

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

      {ENERGY_ROWS.map(([label, body, color]) => (
        <Card key={label} style={{ marginBottom: 12 }}>
          <Eyebrow color={color}>{label}</Eyebrow>
          <Text variant="tiny" style={{ marginTop: 8, fontSize: 13 }}>{body}</Text>
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

      <Card style={{ marginTop: 12 }}>
        <Eyebrow>Journal Prompt</Eyebrow>
        <Text variant="serif" style={{ fontSize: 15, marginTop: 8, fontStyle: 'italic' }}>"{insights.journalPrompt}"</Text>
        <Pressable style={styles.journalBtn} onPress={() => router.push('/insights/journal')}>
          <Text variant="body" color={colors.gold} style={{ fontSize: 13 }}>Open Mood Journal →</Text>
        </Pressable>
      </Card>

      <Eyebrow color={colors.muted} >{'\n'}Explore Life Areas</Eyebrow>
      <View style={styles.grid}>
        {SECTIONS.map((s) => (
          <Pressable key={s.label} style={styles.areaCard} onPress={() => router.push(s.route as any)}>
            <Text variant="body" style={{ fontSize: 13.5 }}>{s.label}</Text>
            <Text style={{ color: colors.gold, fontSize: 18 }}>›</Text>
          </Pressable>
        ))}
      </View>

      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  dual: { flexDirection: 'row', gap: 12 },
  journalBtn: { marginTop: 12 },
  grid: { gap: 10, marginTop: 12 },
  areaCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 16,
  },
});
