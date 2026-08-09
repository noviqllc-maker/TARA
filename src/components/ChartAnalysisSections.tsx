// src/components/ChartAnalysisSections.tsx
// The Vedic Calculator's personalized analysis: six deterministic (no-AI) sections computed
// from any entered chart, rendered as collapsible cards. Reuses the existing compose* engines
// and a generic renderer that handles strings, string lists, and one level of nested objects
// with human field labels (not raw camelCase keys).
import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, Card } from '@/components/ui';
import { BirthChart } from '@/lib/vedic';
import { composeWhoTheyAre } from '@/lib/composeWhoTheyAre';
import { composeCurrentChapter } from '@/lib/composeCurrentChapter';
import { composeSoulDirection } from '@/lib/composeSoulDirection';
import { composeCareer } from '@/lib/composeCareer';
import { composeLove } from '@/lib/composeLove';
import { composeWellness } from '@/lib/composeWellness';
import { colors } from '@/theme';

const FIELD_LABELS: Record<string, string> = {
  coreArchetype: 'Core archetype', lifeTheme: 'Life theme', naturalTendencies: 'How you move through life',
  challenges: 'Growth areas', strengths: 'Strengths', currentPhase: 'Current phase',
  naturalGifts: 'Natural gifts', growthLessons: 'Growth lessons', soulDirection: 'Soul direction',
  spiritualEvolution: 'Spiritual evolution', mahadasha: 'Mahādasha', antardasha: 'Antardasha',
  majorTransits: 'Major transits', description: 'Saturn now', jupiterTransit: 'Jupiter now', timing: 'Timing',
  currentEnergy: 'Current energy', whatToWatch: 'What to watch', guidance: 'Guidance',
  financialOutlook: 'Outlook', shortTerm: 'Short term', longTerm: 'Long term', influences: 'Key influences',
  careerTiming: 'Career timing', moneyTiming: 'Money timing', influence: 'Influence', growth: 'Growth',
  advice: 'Advice', spiritualAlignment: 'Spiritual alignment', habits: 'Habits', practices: 'Practices',
};

function Bullets({ items }: { items: string[] }) {
  return (
    <View style={{ gap: 6, marginTop: 3 }}>
      {items.map((x, i) => (
        <Text key={i} variant="tiny" color={colors.cream} style={{ fontSize: 13, lineHeight: 19 }}>•  {x}</Text>
      ))}
    </View>
  );
}
function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text variant="eyebrow" color={colors.muted} style={{ fontSize: 10, letterSpacing: 0.5, marginBottom: 3 }}>{label}</Text>
      {children}
    </View>
  );
}

// Render one section's data (string | string[] | object with string/array/nested-object values).
function SectionBody({ data }: { data: unknown }) {
  if (typeof data === 'string') return <Text variant="tiny" color={colors.cream} style={styles.text}>{data}</Text>;
  if (Array.isArray(data)) return <Bullets items={data as string[]} />;
  if (data && typeof data === 'object') {
    return (
      <View>
        {Object.entries(data as Record<string, unknown>).map(([key, value]) => {
          const label = FIELD_LABELS[key] ?? key;
          if (Array.isArray(value)) return <Labeled key={key} label={label}><Bullets items={value as string[]} /></Labeled>;
          if (value && typeof value === 'object') {
            // one level of nesting (e.g. majorTransits)
            return (
              <Labeled key={key} label={label}>
                {Object.entries(value as Record<string, unknown>).map(([k2, v2]) => (
                  typeof v2 === 'string'
                    ? <Text key={k2} variant="tiny" color={colors.cream} style={{ fontSize: 13, lineHeight: 19, marginTop: 4 }}>
                        <Text variant="tiny" color={colors.goldSoft} style={{ fontSize: 12 }}>{FIELD_LABELS[k2] ?? k2}: </Text>{v2}
                      </Text>
                    : null
                ))}
              </Labeled>
            );
          }
          if (typeof value === 'string') return <Labeled key={key} label={label}><Text variant="tiny" color={colors.cream} style={styles.text}>{value}</Text></Labeled>;
          return null;
        })}
      </View>
    );
  }
  return null;
}

function CollapsibleSection({ label, data, open, onToggle }: { label: string; data: unknown; open: boolean; onToggle: () => void }) {
  if (!data) return null;
  return (
    <Card style={{ marginBottom: 10, paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden' }}>
      <Pressable onPress={onToggle} style={styles.header} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Text variant="serif" style={{ fontSize: 15, color: colors.goldSoft, flex: 1 }}>{label}</Text>
        <Text style={{ color: colors.gold, fontSize: 12 }}>{open ? '▼' : '▶'}</Text>
      </Pressable>
      {open ? <View style={styles.body}><SectionBody data={data} /></View> : null}
    </Card>
  );
}

export function ChartAnalysisSections({ chart }: { chart: BirthChart }) {
  const [open, setOpen] = useState<string | null>('who');
  const sections: { id: string; label: string; data: unknown }[] = [
    { id: 'who', label: 'Who They Are', data: composeWhoTheyAre(chart) },
    { id: 'love', label: 'Love & Relationships', data: composeLove(chart) },
    { id: 'career', label: 'Career & Money', data: composeCareer(chart) },
    { id: 'wellness', label: 'Health & Wellness', data: composeWellness(chart) },
    { id: 'purpose', label: 'Life Purpose', data: composeSoulDirection(chart) },
    { id: 'chapter', label: 'Current Life Chapter', data: composeCurrentChapter(chart) },
  ];
  return (
    <View style={{ marginTop: 24 }}>
      <Text variant="eyebrow" color={colors.muted} style={{ fontSize: 10.5, letterSpacing: 1, marginBottom: 10 }}>PERSONALIZED ANALYSIS</Text>
      {sections.map((s) => (
        <CollapsibleSection key={s.id} label={s.label} data={s.data} open={open === s.id} onToggle={() => setOpen(open === s.id ? null : s.id)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, paddingHorizontal: 16 },
  body: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 2 },
  text: { fontSize: 13.5, lineHeight: 20, color: colors.cream },
});
