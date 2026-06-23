// app/insights/career.tsx
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Screen from '@/components/Screen';
import { Text, Card, Eyebrow, GhostButton } from '@/components/ui';
import SubHeader from '@/components/SubHeader';
import Ring from '@/components/Ring';
import Disclaimer from '@/components/Disclaimer';
import { career } from '@/data/mock';
import { useDailyEnergy } from '@/hooks/useDailyEnergy';
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

export default function Career() {
  const energy = useDailyEnergy();
  const careerScore = energy.snapshot.find((s) => s.label === 'Career')?.value ?? career.energy;
  return (
    <Screen>
      <SubHeader eyebrow="Career & Money" title="Your Work Energy" />

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
