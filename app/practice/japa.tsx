// app/practice/japa.tsx
// Japa mālā counter (free, no entitlement checks). Tap anywhere to count a bead toward 108,
// with a light haptic tick per tap and a bead-ring that fills as you go. At 108 the round
// completes gently — recorded to the daily log + streak (local + server) — with the option
// to begin another. A second segment is the full nine-graha mantra library; the day-lord's
// mantra is featured but any can be practised. No audio in this phase.
import React, { useMemo, useState, useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Screen from '@/components/Screen';
import SubHeader from '@/components/SubHeader';
import { Text, Card, GoldButton } from '@/components/ui';
import { MANTRA_LIB, mantraFor, dayMantra, GrahaMantra } from '@/lib/mantras';
import { recordRound, loadJapa, JapaState } from '@/lib/practice';
import { tick, completion } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme';

const ROUND = 108;
const SIZE = 288;
const R = 126;
const BEAD = 7;

// Precomputed bead positions around the ring (start at top, clockwise).
const BEADS = Array.from({ length: ROUND }, (_, i) => {
  const a = -Math.PI / 2 + (i / ROUND) * 2 * Math.PI;
  return { left: SIZE / 2 + R * Math.cos(a) - BEAD / 2, top: SIZE / 2 + R * Math.sin(a) - BEAD / 2 };
});

export default function Japa() {
  const now = useMemo(() => new Date(), []);
  const todayGraha = useMemo(() => dayMantra(now).graha, [now]);

  const [segment, setSegment] = useState<'japa' | 'library'>('japa');
  const [graha, setGraha] = useState(todayGraha);
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);
  const [japa, setJapa] = useState<JapaState | null>(null);

  const mantra = mantraFor(graha);
  useEffect(() => { loadJapa().then(setJapa); }, []);

  const onTap = () => {
    if (done) return;
    const next = count + 1;
    if (next >= ROUND) {
      setCount(ROUND);
      setDone(true);
      completion();
      recordRound().then(setJapa);
    } else {
      setCount(next);
      tick();
    }
  };

  const beginAnother = () => { setCount(0); setDone(false); };
  const switchMantra = (g: string) => { setGraha(g); setCount(0); setDone(false); setSegment('japa'); };

  return (
    <Screen scroll={segment === 'library'}>
      <SubHeader eyebrow="Practice · Japa" title="Mālā Counter" />

      {/* Segmented control */}
      <View style={styles.segment}>
        {(['japa', 'library'] as const).map((s) => (
          <Pressable key={s} onPress={() => setSegment(s)} style={[styles.segItem, segment === s && styles.segItemOn]}>
            <Text variant="tiny" color={segment === s ? colors.black : colors.muted} style={{ fontSize: 12.5, fontWeight: '600' }}>
              {s === 'japa' ? 'Japa' : 'Mantra Library'}
            </Text>
          </Pressable>
        ))}
      </View>

      {segment === 'japa' ? (
        <View style={{ alignItems: 'center' }}>
          {/* Tap anywhere in this block (mantra + ring) to count a bead. */}
          <Pressable onPress={onTap} style={{ alignItems: 'center', alignSelf: 'stretch' }}>
          {/* Selected mantra */}
          <Text style={styles.devanagari}>{mantra.devanagari}</Text>
          <Text variant="serif" style={{ fontSize: 17, marginTop: 4 }}>{mantra.translit}</Text>
          <Text variant="tiny" color={colors.muted} style={{ marginTop: 6, textAlign: 'center', lineHeight: 17, paddingHorizontal: spacing.lg }}>{mantra.meaning}</Text>
          <Text variant="tiny" color={colors.goldSoft} style={{ marginTop: 8, fontSize: 11.5 }}>
            {mantra.glyph} {mantra.graha}{graha === todayGraha ? " · today's mantra" : ''}
          </Text>

          {/* Bead ring */}
          <View style={styles.ringWrap}>
            <View style={{ width: SIZE, height: SIZE }}>
              {BEADS.map((b, i) => (
                <View
                  key={i}
                  style={[
                    styles.bead,
                    { left: b.left, top: b.top },
                    i < count ? styles.beadOn : null,
                    i === count - 1 ? styles.beadCurrent : null,
                  ]}
                />
              ))}
              <View style={styles.ringCenter}>
                {done ? (
                  <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 34, color: colors.goldSoft }}>✦</Text>
                    <Text variant="serif" style={{ fontSize: 22, marginTop: 6 }}>Mālā complete</Text>
                    <Text variant="tiny" color={colors.muted} style={{ marginTop: 4 }}>108 · well done</Text>
                  </Animated.View>
                ) : (
                  <>
                    <Text style={styles.count}>{count}</Text>
                    <Text variant="tiny" color={colors.muted} style={{ marginTop: 2 }}>of {ROUND}</Text>
                    <Text variant="tiny" color={colors.mutedDim} style={{ marginTop: 10, fontSize: 10.5 }}>tap anywhere</Text>
                  </>
                )}
              </View>
            </View>
          </View>
          </Pressable>

          {/* Completion / stats */}
          {done ? (
            <View style={{ alignSelf: 'stretch', paddingHorizontal: spacing.lg, marginTop: 6 }}>
              <GoldButton label="Begin another round" onPress={beginAnother} />
            </View>
          ) : null}

          <View style={styles.stats}>
            <Stat label="Today" value={japa ? `${japa.today} mālā` : '–'} />
            <Stat label="Streak" value={japa ? `${japa.streak} day${japa.streak === 1 ? '' : 's'}` : '–'} />
          </View>
        </View>
      ) : (
        <View>
          <Text variant="tiny" color={colors.muted} style={{ marginBottom: 14, lineHeight: 18 }}>
            All nine graha mantras. The day-lord's is featured, but you may practise any. Tap one to bring it to the counter.
          </Text>
          {MANTRA_LIB.map((m) => (
            <MantraRow key={m.graha} m={m} featured={m.graha === todayGraha} onPress={() => switchMantra(m.graha)} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text variant="tiny" color={colors.muted} style={{ fontSize: 10.5, letterSpacing: 0.3 }}>{label}</Text>
      <Text variant="serif" style={{ fontSize: 17, marginTop: 3 }}>{value}</Text>
    </View>
  );
}

function MantraRow({ m, featured, onPress }: { m: GrahaMantra; featured: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card style={{ marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="serif" style={{ fontSize: 16 }}>{m.glyph}  {m.graha}</Text>
          {featured ? (
            <View style={styles.todayChip}><Text variant="tiny" color={colors.gold} style={{ fontSize: 9.5, fontWeight: '700' }}>TODAY</Text></View>
          ) : (
            <Text variant="tiny" color={colors.muted} style={{ fontSize: 11 }}>{m.day}</Text>
          )}
        </View>
        <Text style={{ fontSize: 22, color: colors.cream, marginTop: 8, lineHeight: 32 }}>{m.devanagari}</Text>
        <Text variant="tiny" color={colors.goldSoft} style={{ marginTop: 2, fontSize: 12.5 }}>{m.translit}</Text>
        <Text variant="tiny" color={colors.muted} style={{ marginTop: 6, lineHeight: 17 }}>{m.meaning}</Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.pill, padding: 4, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.line },
  segItem: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: radius.pill },
  segItemOn: { backgroundColor: colors.goldSoft },
  devanagari: { fontSize: 34, color: colors.cream, marginTop: 4, lineHeight: 48, textAlign: 'center' },
  ringWrap: { marginTop: 20, marginBottom: 8, alignItems: 'center', justifyContent: 'center' },
  bead: { position: 'absolute', width: BEAD, height: BEAD, borderRadius: BEAD / 2, backgroundColor: colors.line },
  beadOn: { backgroundColor: colors.gold },
  beadCurrent: { backgroundColor: colors.goldSoft, width: BEAD + 3, height: BEAD + 3, borderRadius: (BEAD + 3) / 2 },
  ringCenter: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  count: { fontFamily: 'Fraunces_600SemiBold', fontSize: 68, color: colors.cream, lineHeight: 74 },
  stats: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.line },
  todayChip: { borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill, paddingVertical: 2, paddingHorizontal: 8 },
});
