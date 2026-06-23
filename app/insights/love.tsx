// app/insights/love.tsx
import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Screen from '@/components/Screen';
import { Text, Card, Eyebrow, GoldButton, GhostButton } from '@/components/ui';
import SubHeader from '@/components/SubHeader';
import Ring from '@/components/Ring';
import Field from '@/components/Field';
import Disclaimer from '@/components/Disclaimer';
import { love } from '@/data/mock';
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

export default function Love() {
  const [partner, setPartner] = useState('');
  const [matched, setMatched] = useState(false);
  const energy = useDailyEnergy();
  const loveScore = energy.snapshot.find((s) => s.label === 'Love')?.value ?? love.score;

  return (
    <Screen>
      <SubHeader eyebrow="Love & Relationships" title="Your Connection Energy" />

      <Card solid glow style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <Ring value={loveScore} label="Harmony" color={colors.rose} />
        <Text variant="tiny" style={{ marginTop: 10, textAlign: 'center' }}>{love.influence}</Text>
      </Card>

      <List title="Strengths" items={love.strengths} color={colors.sage} />
      <List title="Challenges" items={love.challenges} color={colors.rose} />
      <List title="Growth Opportunities" items={love.growth} color={colors.goldSoft} />

      <Card style={{ marginBottom: spacing.lg }}>
        <Eyebrow>Personalized Advice</Eyebrow>
        <Text variant="serif" style={{ fontSize: 15.5, marginTop: 8 }}>{love.advice}</Text>
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
        <Eyebrow>Connect Partner Profile</Eyebrow>
        <Field placeholder="Partner's name" value={partner} onChangeText={setPartner} style={{ marginTop: 10 }} />
        <GoldButton label="Calculate Compatibility" style={{ marginTop: 12 }} onPress={() => setMatched(true)} />
        {matched && (
          <View style={{ alignItems: 'center', marginTop: 16 }}>
            <Ring value={78} label="Guṇa /36" color={colors.lav} size={100} />
            <Text variant="serif" style={{ marginTop: 8 }}>28 / 36 — Very Good</Text>
          </View>
        )}
      </Card>

      <GhostButton label="Ask a Love Question →" onPress={() => router.push('/(tabs)/tara')} />
      <Disclaimer />
    </Screen>
  );
}
