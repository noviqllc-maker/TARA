// app/practice/svadhyaya.tsx
// Svādhyāya — "Today's Teaching" (free, deterministic, no AI). Shows the day's teaching
// (a Gītā śloka or a jyotiṣa concept card) beautifully, plus a browse list of previously
// shown teachings. Selection + history are recomputed deterministically (see lib/svadhyaya).
import React, { useMemo, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Screen from '@/components/Screen';
import SubHeader from '@/components/SubHeader';
import { Text, Card } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { teachingForDate, pastTeachings } from '@/lib/svadhyaya';
import { Teaching } from '@/data/svadhyaya';
import { colors, fonts, radius, spacing } from '@/theme';

const GRAHA_GLYPH: Record<string, string> = {
  Sun: '☉', Moon: '☾', Mars: '♂', Mercury: '☿', Jupiter: '♃', Venus: '♀', Saturn: '♄', Rahu: '☊', Ketu: '☋',
};

export default function Svadhyaya() {
  const { session } = useAuth();
  const uid = session?.user?.id || 'anon';
  const { teaching, dayLord } = useMemo(() => teachingForDate(uid, new Date()), [uid]);
  const past = useMemo(() => pastTeachings(uid, 24), [uid]);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Screen>
      <SubHeader eyebrow="Practice · Svādhyāya" title="Today's Teaching" />
      <Text variant="tiny" color={colors.muted} style={{ marginBottom: spacing.lg, lineHeight: 18 }}>
        A verse or a teaching for reflection — drawn fresh each day, in the spirit of {GRAHA_GLYPH[dayLord]} {dayLord}’s day.
      </Text>

      <Animated.View entering={FadeInDown.duration(400)}>
        <TeachingView teaching={teaching} featured />
      </Animated.View>

      <Text color={colors.gold} style={styles.sectionLabel}>Browse past teachings</Text>
      {past.map(({ date, teaching: t }) => {
        const open = openId === `${date.toDateString()}:${t.id}`;
        const key = `${date.toDateString()}:${t.id}`;
        return (
          <View key={key}>
            <Pressable onPress={() => setOpenId(open ? null : key)}>
              <Card style={{ marginBottom: open ? 0 : 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 15, color: colors.goldSoft }}>{t.type === 'shloka' ? '❁' : '✦'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text variant="serif" style={{ fontSize: 14.5 }}>{t.type === 'shloka' ? t.citation : t.title}</Text>
                    <Text variant="tiny" color={colors.muted} style={{ fontSize: 11, marginTop: 2 }}>
                      {shortDate(date)} · {GRAHA_GLYPH[t.graha]} {t.graha}
                    </Text>
                  </View>
                  <Text style={{ color: colors.gold, fontSize: 15 }}>{open ? '▾' : '▸'}</Text>
                </View>
              </Card>
            </Pressable>
            {open ? (
              <Animated.View entering={FadeIn.duration(260)} style={{ marginBottom: 8 }}>
                <TeachingView teaching={t} />
              </Animated.View>
            ) : null}
          </View>
        );
      })}
    </Screen>
  );
}

function TeachingView({ teaching: t, featured }: { teaching: Teaching; featured?: boolean }) {
  return (
    <Card solid={featured} glow={featured} style={{ marginBottom: spacing.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text variant="eyebrow" color={colors.gold}>{t.type === 'shloka' ? t.citation : 'Teaching'}</Text>
        <View style={styles.grahaChip}>
          <Text variant="tiny" color={colors.goldSoft} style={{ fontSize: 10.5 }}>{GRAHA_GLYPH[t.graha]} {t.graha}</Text>
        </View>
      </View>

      {t.type === 'shloka' ? (
        <>
          <Text style={styles.devanagari}>{t.devanagari}</Text>
          <Text style={styles.iast}>{t.iast}</Text>
          <View style={styles.divider} />
          <Text variant="tiny" color={colors.gold} style={{ fontSize: 10, letterSpacing: 0.4, marginBottom: 6 }}>A PLAIN RENDERING</Text>
          <Text variant="body" color={colors.cream} style={{ fontSize: 15, lineHeight: 24 }}>{t.rendering}</Text>
        </>
      ) : (
        <>
          <Text variant="h2" style={styles.headline}>{t.title}</Text>
          <Text variant="body" color={colors.cream} style={{ fontSize: 15, lineHeight: 24 }}>{t.body}</Text>
        </>
      )}

      <View style={styles.forToday}>
        <Text variant="tiny" color={colors.gold} style={{ fontSize: 10, letterSpacing: 0.4, marginBottom: 6 }}>FOR TODAY</Text>
        <Text style={styles.forTodayText}>{t.forToday}</Text>
      </View>
    </Card>
  );
}

function shortDate(d: Date) {
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${MON[d.getMonth()]} ${d.getDate()}`;
}

const styles = StyleSheet.create({
  sectionLabel: { fontSize: 14, fontWeight: '500', marginBottom: 12, marginTop: 4 },
  grahaChip: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 9, marginLeft: 8 },
  // Devanāgarī: large and airy; the OS supplies the Devanāgarī face (Fraunces is Latin-only).
  devanagari: { fontSize: 23, color: colors.cream, marginTop: 16, lineHeight: 38 },
  iast: { fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 13.5, color: colors.goldSoft, marginTop: 12, lineHeight: 21 },
  headline: { fontSize: 24, lineHeight: 32, marginTop: 14, marginBottom: 10 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 16 },
  forToday: {
    marginTop: 18, paddingTop: 14, paddingHorizontal: 14, paddingBottom: 16,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(205,163,73,0.3)', backgroundColor: 'rgba(205,163,73,0.06)',
  },
  // Outfit regular (non-italic) in a softer cream — italic Fraunces read poorly at this size.
  forTodayText: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 23, color: colors.creamDim },
});
