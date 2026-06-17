// app/insights/purpose.tsx
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Screen from '@/components/Screen';
import { Text, Card, Eyebrow, GhostButton } from '@/components/ui';
import SubHeader from '@/components/SubHeader';
import Disclaimer from '@/components/Disclaimer';
import { purpose } from '@/data/mock';
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

export default function Purpose() {
  return (
    <Screen>
      <SubHeader eyebrow="Life Purpose" title="Your Soul Direction" />

      <Card solid glow style={{ marginBottom: spacing.lg }}>
        <Eyebrow>Life Theme</Eyebrow>
        <Text variant="serif" style={{ fontSize: 18, marginTop: 8, lineHeight: 26 }}>{purpose.theme}</Text>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <Eyebrow color={colors.gold}>Current Life Phase</Eyebrow>
        <Text variant="body" style={{ marginTop: 8 }}>{purpose.phase}</Text>
      </Card>

      <List title="Natural Gifts" items={purpose.gifts} color={colors.sage} />
      <List title="Growth Lessons" items={purpose.lessons} color={colors.rose} />

      <Card style={{ marginBottom: 12 }}>
        <Eyebrow color={colors.saffron}>Soul Direction</Eyebrow>
        <Text variant="serif" style={{ fontSize: 15.5, marginTop: 8 }}>{purpose.soulDirection}</Text>
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
        <Eyebrow color={colors.lav}>Spiritual Evolution</Eyebrow>
        <Text variant="tiny" style={{ marginTop: 8, fontSize: 13 }}>{purpose.guidance}</Text>
      </Card>

      <GhostButton label="Ask About Your Purpose →" onPress={() => router.push('/(tabs)/tara')} />
      <Disclaimer />
    </Screen>
  );
}
