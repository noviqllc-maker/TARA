// app/report/[kind].tsx
// Renders a purchased shop report. First open after purchase generates it via the
// AI backend from the user's real chart, then caches permanently (keyed by product
// + birth-data hash). Subsequent opens are instant. Regenerates only if birth data
// changes. In __DEV__ a ?preview=1 param bypasses the ownership gate for QA.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Screen from '@/components/Screen';
import SubHeader from '@/components/SubHeader';
import { Text, Card, GoldButton } from '@/components/ui';
import Disclaimer from '@/components/Disclaimer';
import { useChart } from '@/hooks/useChart';
import { useProfile } from '@/hooks/useProfile';
import { useSubscription } from '@/hooks/useSubscription';
import {
  ReportKind, Report, REPORT_META, REPORT_FOOTER, isReportKind,
  birthHash, loadReport, saveReport, clearReport, generateReport,
} from '@/lib/reports';
import { colors, spacing } from '@/theme';

type UIState = 'loading' | 'ready' | 'error' | 'locked' | 'nochart' | 'invalid';

export default function ReportScreen() {
  const { kind: kindParam, preview } = useLocalSearchParams<{ kind?: string; preview?: string }>();
  const chart = useChart();
  const { profile } = useProfile();
  const { owns } = useSubscription();

  const kind = kindParam as ReportKind;
  const valid = isReportKind(kindParam);
  const isPreview = __DEV__ && preview === '1';
  const hash = useMemo(
    () => birthHash(profile),
    [profile.birthDate, profile.birthTime, profile.lat, profile.lon, profile.tzOffsetMinutes],
  );

  const [state, setState] = useState<UIState>('loading');
  const [report, setReport] = useState<Report | null>(null);

  // force = ignore cache + regenerate (dev "Regenerate" / error "Try again").
  const run = useCallback(async (force = false) => {
    if (!valid) { setState('invalid'); return; }
    if (!chart) { setState('nochart'); return; }
    if (!isPreview && !owns(kind)) { setState('locked'); return; }

    setState('loading');
    if (!force) {
      const cached = await loadReport(kind, hash);
      if (cached) { setReport(cached); setState('ready'); return; }
    }
    try {
      if (force) await clearReport(kind);
      const r = await generateReport(kind, chart, hash);
      await saveReport(r);              // persist permanently
      setReport(r);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [valid, chart, isPreview, owns, kind, hash]);

  useEffect(() => { run(); }, [run]);

  // ---- states ----
  if (state === 'loading') {
    return (
      <Screen scroll={false} contentStyle={{ flex: 1 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
          <Text variant="body" color={colors.muted}>✕ Close</Text>
        </Pressable>
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} />
          <Text variant="serif" style={styles.loadingText}>
            {valid ? REPORT_META[kind].loading : 'Tara is writing your report…'}
          </Text>
          <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, textAlign: 'center' }}>
            Reading your chart and composing every section. This takes a moment.
          </Text>
        </View>
      </Screen>
    );
  }

  if (state === 'invalid') {
    return <Message eyebrow="Report" title="Not found" body="This report doesn't exist." cta="Go back" onCta={() => router.back()} />;
  }
  if (state === 'nochart') {
    return <Message eyebrow={REPORT_META[kind]?.title ?? 'Report'} title="Add your birth details"
      body="This report is built from your birth chart. Add your date, time, and place of birth first."
      cta="Go back" onCta={() => router.back()} />;
  }
  if (state === 'locked') {
    return <Message eyebrow={REPORT_META[kind].title} title="Locked"
      body="Unlock this report from the Shop to read your personalized reading."
      cta="Go to Shop" onCta={() => router.replace('/(tabs)/profile')} />;
  }
  if (state === 'error') {
    return (
      <Screen scroll={false} contentStyle={{ flex: 1 }}>
        <View style={styles.center}>
          <Text variant="serif" style={styles.loadingText}>The stars need a moment</Text>
          <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, marginBottom: 22, textAlign: 'center' }}>
            We couldn't finish your report just now. Please try again.
          </Text>
          <View style={{ alignSelf: 'stretch', paddingHorizontal: spacing.xl }}>
            <GoldButton label="Try again" onPress={() => run(true)} />
          </View>
          <Pressable onPress={() => router.back()} style={{ marginTop: 14 }}>
            <Text variant="tiny" color={colors.muted}>Go back</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  // ---- ready ----
  return (
    <Screen>
      <SubHeader eyebrow={isPreview ? 'Preview · dev' : 'Your report'} title={REPORT_META[kind].title} />
      {report?.sections.map((s, i) => (
        <Card key={`${i}-${s.heading}`} style={{ marginBottom: spacing.md }}>
          <Text variant="h3" style={styles.sectionHeading}>{s.heading}</Text>
          {s.body.split(/\n{2,}/).map((para, j) => (
            <Text key={j} variant="body" color={colors.cream} style={styles.para}>{para.trim()}</Text>
          ))}
        </Card>
      ))}

      <Text variant="tiny" color={colors.mutedDim} style={styles.footer}>{REPORT_FOOTER}</Text>

      {__DEV__ && (
        <Pressable onPress={() => run(true)} style={styles.regen}>
          <Text variant="tiny" color={colors.muted}>↻ Regenerate (dev)</Text>
        </Pressable>
      )}

      <Disclaimer />
    </Screen>
  );
}

function Message({ eyebrow, title, body, cta, onCta }: {
  eyebrow: string; title: string; body: string; cta: string; onCta: () => void;
}) {
  return (
    <Screen scroll={false} contentStyle={{ flex: 1 }}>
      <View style={styles.center}>
        <Text variant="eyebrow" color={colors.gold} style={{ marginBottom: 10 }}>{eyebrow}</Text>
        <Text variant="serif" style={styles.loadingText}>{title}</Text>
        <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, marginBottom: 22, textAlign: 'center' }}>{body}</Text>
        <View style={{ alignSelf: 'stretch', paddingHorizontal: spacing.xl }}>
          <GoldButton label={cta} onPress={onCta} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  loadingText: { fontSize: 22, marginTop: 16, textAlign: 'center' },
  sectionHeading: { fontSize: 17, color: colors.goldSoft, marginBottom: 8 },
  para: { fontSize: 14.5, lineHeight: 22, marginTop: 2, marginBottom: 8 },
  footer: { textAlign: 'center', fontStyle: 'italic', marginTop: 6, marginBottom: spacing.lg },
  regen: { alignSelf: 'center', paddingVertical: 8, marginBottom: spacing.md },
});
