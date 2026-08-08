// app/insights/purpose.tsx
// "Your Soul Direction" — now personalized. The reading is derived from the user's real
// natal chart (Atmakaraka, 9th house, running Mahādasha) by composeSoulDirection; when there
// is no chart yet, we show a graceful add-birth-details prompt.
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Screen from '@/components/Screen';
import { Text, Card, Eyebrow, GhostButton, GoldButton } from '@/components/ui';
import SubHeader from '@/components/SubHeader';
import { PremiumNudgeBar } from '@/components/PremiumNudge';
import Disclaimer from '@/components/Disclaimer';
import { useChart } from '@/hooks/useChart';
import { composeSoulDirection } from '@/lib/composeSoulDirection';
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

// Shown when there is no birth chart yet (no birth date/time saved).
function PurposePrompt() {
  return (
    <Screen>
      <SubHeader eyebrow="Life Purpose" title="Your Soul Direction" />
      <Card solid glow style={{ alignItems: 'center', marginTop: spacing.lg }}>
        <Text style={{ fontSize: 24, color: colors.gold }}>✦</Text>
        <Text variant="serif" style={{ fontSize: 19, marginTop: 8, textAlign: 'center' }}>Add your birth details</Text>
        <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, textAlign: 'center', lineHeight: 19 }}>
          Your soul direction is read from your birth chart: your Atmakaraka, your 9th house of dharma, and the life chapter you are living now. Add your date, time, and place of birth to see it.
        </Text>
        <View style={{ alignSelf: 'stretch', marginTop: 18 }}>
          <GoldButton label="Add birth details" onPress={() => router.push('/(tabs)/profile')} />
        </View>
      </Card>
      <Disclaimer />
    </Screen>
  );
}

export default function Purpose() {
  const chart = useChart();
  const purpose = composeSoulDirection(chart);
  if (!purpose) return <PurposePrompt />;

  return (
    <Screen>
      <SubHeader eyebrow="Life Purpose" title="Your Soul Direction" />
      <PremiumNudgeBar context="life_purpose" style={{ marginBottom: spacing.lg }} />

      <Card solid glow style={{ marginBottom: spacing.lg }}>
        <Eyebrow>Life Theme</Eyebrow>
        <Text variant="serif" style={{ fontSize: 18, marginTop: 8, lineHeight: 26 }}>{purpose.lifeTheme}</Text>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <Eyebrow color={colors.gold}>Current Life Phase</Eyebrow>
        <Text variant="body" style={{ marginTop: 8 }}>{purpose.currentPhase}</Text>
      </Card>

      <List title="Natural Gifts" items={purpose.naturalGifts} color={colors.sage} />
      <List title="Growth Lessons" items={purpose.growthLessons} color={colors.rose} />

      <Card style={{ marginBottom: 12 }}>
        <Eyebrow color={colors.saffron}>Soul Direction</Eyebrow>
        <Text variant="serif" style={{ fontSize: 15.5, marginTop: 8 }}>{purpose.soulDirection}</Text>
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
        <Eyebrow color={colors.lav}>Spiritual Evolution</Eyebrow>
        <Text variant="tiny" style={{ marginTop: 8, fontSize: 13 }}>{purpose.spiritualEvolution}</Text>
      </Card>

      <GhostButton label="Ask About Your Purpose →" onPress={() => router.push('/(tabs)/tara')} />
      <Disclaimer />
    </Screen>
  );
}
