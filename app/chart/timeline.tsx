// app/chart/timeline.tsx
// "Your Life Chapters" — the Vimshottari dasha timeline reframed in plain English while
// keeping the real computed data. The running Mahadasha gets a "What this means" read, a
// progress bar (X% through the chapter, from the period dates), and the running
// Antardasha's "rewards / watch for" lists. Past & future chapters keep one-line summaries.
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Screen from '@/components/Screen';
import { Text, Card } from '@/components/ui';
import SubHeader from '@/components/SubHeader';
import { PremiumNudgeBar } from '@/components/PremiumNudge';
import Disclaimer from '@/components/Disclaimer';
import { useChart } from '@/hooks/useChart';
import { MAHA_MEANING, ANTAR_THEME } from '@/data/dashaMeaning';
import { colors } from '@/theme';

const phaseColor = { past: colors.muted, present: colors.gold, future: colors.lav } as const;

// Fraction of the way through a [start, end] year window (0..1), using the current month.
function chapterProgress(start: number, end: number): number {
  if (!(end > start)) return 0;
  const now = new Date().getFullYear() + new Date().getMonth() / 12;
  return Math.max(0, Math.min(1, (now - start) / (end - start)));
}

export default function Timeline() {
  const chart = useChart();
  const dasha = chart?.dasha ?? [];

  return (
    <Screen>
      <SubHeader eyebrow="Life Timeline" title="Your Life Chapters" />
      <PremiumNudgeBar context="chart" style={{ marginBottom: 18 }} />
      <Text variant="tiny" style={{ marginBottom: 18 }}>
        The major planetary chapters of your life, in plain language, calculated from your
        Moon's exact position at birth (your Vimśottarī daśā).
      </Text>

      {dasha.length === 0 ? (
        <Card><Text variant="tiny">Complete onboarding to see your timeline.</Text></Card>
      ) : (
        <View style={{ paddingLeft: 6 }}>
          {dasha.map((d, i) => {
            const present = d.phase === 'present';
            const meaning = MAHA_MEANING[d.planet];
            const pct = present ? Math.round(chapterProgress(d.start, d.end) * 100) : 0;
            const antar = present ? d.antardashas?.find((a) => a.phase === 'present') : undefined;
            const antarTheme = antar ? ANTAR_THEME[antar.planet] : undefined;

            return (
              <Animated.View key={`${d.planet}-${i}`} entering={FadeInDown.delay(i * 80).duration(450)} style={styles.row}>
                <View style={styles.spine}>
                  <View style={[styles.dot, { backgroundColor: phaseColor[d.phase], transform: [{ scale: present ? 1.4 : 1 }] }]} />
                  {i < dasha.length - 1 && <View style={styles.line} />}
                </View>
                <Card solid={present} glow={present} style={{ flex: 1, marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text variant="serif" style={{ fontSize: 18 }}>{d.planet} Chapter</Text>
                      {present && meaning ? (
                        <Text variant="tiny" color={colors.goldSoft} style={{ marginTop: 2 }}>{meaning.chapter}</Text>
                      ) : null}
                    </View>
                    <Text variant="tiny" color={phaseColor[d.phase]} style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                      {present ? 'now' : d.phase}
                    </Text>
                  </View>
                  <Text variant="tiny" color={colors.muted} style={{ marginTop: 4 }}>{d.start} – {d.end}</Text>

                  {present ? (
                    <>
                      {/* Progress through the chapter */}
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${pct}%` }]} />
                      </View>
                      <Text variant="tiny" color={colors.goldSoft} style={{ marginTop: 6, fontSize: 12 }}>
                        {pct}% through your {d.planet} chapter
                      </Text>

                      {/* Plain-English "what this means" */}
                      {meaning ? (
                        <View style={{ marginTop: 12 }}>
                          <Text variant="tiny" color={colors.muted} style={styles.miniLabel}>What this means</Text>
                          <Text variant="body" style={{ marginTop: 6, fontSize: 13.5, lineHeight: 21 }}>{meaning.meaning}</Text>
                        </View>
                      ) : (
                        <Text variant="body" style={{ marginTop: 8, fontSize: 13.5 }}>{d.theme}</Text>
                      )}

                      {/* Running Antardasha rewards / watch-for */}
                      {antar && antarTheme ? (
                        <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 }}>
                          <Text variant="tiny" color={colors.muted} style={styles.miniLabel}>
                            Current sub-period · {d.planet}–{antar.planet}
                          </Text>
                          <Text variant="tiny" color={colors.mutedDim} style={{ marginTop: 2, fontSize: 11 }}>{antar.start} – {antar.end}</Text>
                          <Text variant="tiny" color={colors.sage} style={{ marginTop: 10, fontWeight: '600' }}>This period rewards</Text>
                          {antarTheme.rewards.map((r) => (
                            <Text key={r} variant="tiny" style={{ marginTop: 3, fontSize: 12.5 }}>• {r}</Text>
                          ))}
                          <Text variant="tiny" color={colors.terra} style={{ marginTop: 10, fontWeight: '600' }}>Watch for</Text>
                          {antarTheme.watch.map((w) => (
                            <Text key={w} variant="tiny" style={{ marginTop: 3, fontSize: 12.5 }}>• {w}</Text>
                          ))}
                        </View>
                      ) : null}
                    </>
                  ) : (
                    // Past / future chapters: one-line summary only.
                    <Text variant="body" style={{ marginTop: 8, fontSize: 13.5 }}>{d.theme}</Text>
                  )}
                </Card>
              </Animated.View>
            );
          })}
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
  miniLabel: { textTransform: 'uppercase', letterSpacing: 1, fontSize: 10.5 },
  progressTrack: {
    height: 6, borderRadius: 3, backgroundColor: colors.line, marginTop: 12, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: colors.gold },
});
