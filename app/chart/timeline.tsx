// app/chart/timeline.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Screen from '@/components/Screen';
import { Text, Card } from '@/components/ui';
import SubHeader from '@/components/SubHeader';
import Disclaimer from '@/components/Disclaimer';
import { useChart } from '@/hooks/useChart';
import { colors } from '@/theme';

const phaseColor = { past: colors.muted, present: colors.gold, future: colors.lav } as const;

export default function Timeline() {
  const chart = useChart();
  const dasha = chart?.dasha ?? [];

  return (
    <Screen>
      <SubHeader eyebrow="Life Timeline" title="Your Dasha Cycles" />
      <Text variant="tiny" style={{ marginBottom: 18 }}>
        Your Vimśottarī Mahādasha periods — the major planetary chapters of your life, calculated
        from your Moon's exact position at birth.
      </Text>

      {dasha.length === 0 ? (
        <Card><Text variant="tiny">Complete onboarding to see your timeline.</Text></Card>
      ) : (
        <View style={{ paddingLeft: 6 }}>
          {dasha.map((d, i) => (
            <Animated.View key={`${d.planet}-${i}`} entering={FadeInDown.delay(i * 80).duration(450)} style={styles.row}>
              <View style={styles.spine}>
                <View style={[styles.dot, { backgroundColor: phaseColor[d.phase], transform: [{ scale: d.phase === 'present' ? 1.4 : 1 }] }]} />
                {i < dasha.length - 1 && <View style={styles.line} />}
              </View>
              <Card solid={d.phase === 'present'} glow={d.phase === 'present'} style={{ flex: 1, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="serif" style={{ fontSize: 18 }}>{d.planet} Daśā</Text>
                  <Text variant="tiny" color={phaseColor[d.phase]} style={{ textTransform: 'uppercase', letterSpacing: 1 }}>{d.phase}</Text>
                </View>
                <Text variant="tiny" color={colors.goldSoft} style={{ marginTop: 4 }}>{d.start} – {d.end}</Text>
                <Text variant="body" style={{ marginTop: 8, fontSize: 13.5 }}>{d.theme}</Text>
              </Card>
            </Animated.View>
          ))}
        </View>
      )}

      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14 },
  spine: { alignItems: 'center', width: 16 },
  dot: { width: 12, height: 12, borderRadius: 12, marginTop: 18 },
  line: { width: 1.5, flex: 1, backgroundColor: colors.line, marginTop: 4 },
});
