// app/insights/career.tsx
// "Your Work Energy" — the reading is now derived from the chart (10th/2nd houses, running
// Mahādasha, Jupiter/Saturn transits) via composeCareer. The score ring stays driven by the
// chart-based daily energy. Graceful fallback when there is no birth chart yet.
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Screen from '@/components/Screen';
import { Text, Card, Eyebrow, GhostButton, GoldButton } from '@/components/ui';
import SubHeader from '@/components/SubHeader';
import { PremiumNudgeBar } from '@/components/PremiumNudge';
import Ring from '@/components/Ring';
import Disclaimer from '@/components/Disclaimer';
import { useChart } from '@/hooks/useChart';
import { useDailyEnergy } from '@/hooks/useDailyEnergy';
import { composeCareer } from '@/lib/composeCareer';
import { colors, spacing } from '@/theme';

function List({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <Card style={{ marginBottom: 12 }}>
      <Eyebrow color={color}>{title}</Eyebrow>
      <View style={{ marginTop: 8, gap: 6 }}>
        {items.map((x) => <Text key={x} variant="tiny" color={colors.cream} style={{ fontSize: 13 }}>• {x}</Text>)}
      </View>
    </Card>
  );
}

function CareerPrompt() {
  return (
    <Screen>
      <SubHeader eyebrow="Career & Money" title="Your Work Energy" />
      <Card solid glow style={{ alignItems: 'center', marginTop: spacing.lg }}>
        <Text style={{ fontSize: 24, color: colors.gold }}>✦</Text>
        <Text variant="serif" style={{ fontSize: 19, marginTop: 8, textAlign: 'center' }}>Add your birth details</Text>
        <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, textAlign: 'center', lineHeight: 19 }}>
          Your work and money reading is drawn from your 10th house of career, your 2nd house of wealth, and the life chapter you are living now. Add your date, time, and place of birth to see it.
        </Text>
        <View style={{ alignSelf: 'stretch', marginTop: 18 }}>
          <GoldButton label="Add birth details" onPress={() => router.push('/(tabs)/profile')} />
        </View>
      </Card>
      <Disclaimer />
    </Screen>
  );
}

export default function Career() {
  const chart = useChart();
  const energy = useDailyEnergy();
  const career = composeCareer(chart);
  if (!career) return <CareerPrompt />;

  const careerScore = energy.snapshot.find((s) => s.label === 'Career')?.value ?? 50;
  return (
    <Screen>
      <SubHeader eyebrow="Career & Money" title="Your Work Energy" />
      <PremiumNudgeBar context="life_career" style={{ marginBottom: spacing.lg }} />

      <Card solid glow style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <Ring value={careerScore} label="Career" color={colors.goldSoft} />
        <Text variant="tiny" style={{ marginTop: 10, textAlign: 'center' }}>{career.financialOutlook}</Text>
      </Card>

      <List title="Short-Term Opportunities" items={career.shortTerm} color={colors.sage} />
      <List title="Long-Term Opportunities" items={career.longTerm} color={colors.lav} />

      <Card style={{ marginBottom: 12 }}>
        <Eyebrow>Planetary Influences</Eyebrow>
        <Text variant="tiny" style={{ marginTop: 8, fontSize: 13 }}>{career.influences}</Text>
      </Card>

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: spacing.lg }}>
        <Card style={{ flex: 1 }}>
          <Eyebrow color={colors.goldSoft}>Career Timing</Eyebrow>
          <Text variant="tiny" style={{ marginTop: 8 }}>{career.careerTiming}</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Eyebrow color={colors.saffron}>Money Timing</Eyebrow>
          <Text variant="tiny" style={{ marginTop: 8 }}>{career.moneyTiming}</Text>
        </Card>
      </View>

      <GhostButton label="Ask a Career Question →" onPress={() => router.push('/(tabs)/tara')} />
      <Disclaimer />
    </Screen>
  );
}
