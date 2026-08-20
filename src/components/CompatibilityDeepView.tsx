// src/components/CompatibilityDeepView.tsx
// Renders the 12-section deep compatibility analysis as collapsible cards, plain-English
// first with a small "Vedic basis" line. Themed with the app's own tokens (not raw hex), and
// with human field labels instead of dumping camelCase keys.
import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, Card, Eyebrow } from '@/components/ui';
import { CompatibilityAnalysis } from '@/lib/compatibilityDeep';
import { colors, radius, spacing } from '@/theme';

// Human labels for the sub-fields. Keys not listed here (plainEnglish/summary/whatHappens)
// render as the lead paragraph; vedic/scoringBasis render as small footnotes.
const FIELD_LABELS: Record<string, string> = {
  headline: 'In a line', moonSigns: 'Moon signs', nakshatras: 'Birth stars', moonToMoon: 'Moon to Moon',
  emotionalNeeds: 'What each needs', conflictSensitivity: 'Sensitivity', venus: 'Venus', mars: 'Mars',
  chemistry: 'Chemistry', affectionStyle: 'How you show love', attraction: 'Romance',
  mercuryAnalysis: 'How you each think', directness: 'Directness', misunderstandings: 'Where it snags',
  bestPractice: 'What helps', seventhHouse: '7th house of partnership', jupiter: 'Jupiter',
  stability: 'Stability', commitmentStyle: 'Commitment style', frictionPoints: 'Watch for',
  userNavamsa: 'Your deeper chart (D9)', partnerNavamsa: 'Their deeper chart (D9)',
  deeperNature: 'At the soul level', maturation: 'Over time', timeWeight: 'With time',
  cycleName: 'The pattern', userCurrentPhase: 'Your season', partnerCurrentPhase: 'Their season',
  mutualInfluence: 'Together right now', favorableWindow: 'This phase',
};
const SCORE_LABELS: Record<string, string> = {
  emotional: 'Emotional', communication: 'Communication', romance: 'Romance',
  commitment: 'Commitment', family: 'Family', money: 'Money', growth: 'Growth',
};
const LEAD_KEYS = ['headline', 'summary', 'plainEnglish', 'whatHappens'];

const scoreColor = (v: number) => (v >= 75 ? colors.sage : v >= 55 ? colors.goldSoft : colors.terra);

function ScoreRow({ label, value, explanation }: { label: string; value: number; explanation?: string }) {
  const [open, setOpen] = useState(false);
  const inner = (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <Text variant="tiny" color={colors.cream} style={{ fontSize: 12.5 }}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text variant="tiny" color={scoreColor(value)} style={{ fontSize: 12.5, fontWeight: '600' }}>{value}/100</Text>
          {explanation ? <Text style={{ color: colors.gold, fontSize: 11 }}>{open ? '▾' : '▸'}</Text> : null}
        </View>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${value}%`, backgroundColor: scoreColor(value) }]} />
      </View>
      {open && explanation ? (
        <View style={{ marginTop: 7, paddingTop: 7, borderTopWidth: 1, borderTopColor: colors.line }}>
          <Text variant="tiny" color={colors.muted} style={{ fontSize: 12, lineHeight: 18 }}>{explanation}</Text>
        </View>
      ) : null}
    </>
  );
  if (!explanation) return <View style={{ marginVertical: 5 }}>{inner}</View>;
  return (
    <Pressable
      onPress={() => setOpen((v) => !v)} style={{ marginVertical: 5 }}
      accessibilityRole="button" accessibilityState={{ expanded: open }}
    >
      {inner}
    </Pressable>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <View style={{ gap: 6, marginTop: 2 }}>
      {items.map((x, i) => (
        <Text key={i} variant="tiny" color={colors.cream} style={{ fontSize: 13, lineHeight: 19 }}>•  {x}</Text>
      ))}
    </View>
  );
}

function LabeledField({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text variant="eyebrow" color={colors.muted} style={{ fontSize: 10, letterSpacing: 0.5 }}>{label}</Text>
      <Text variant="tiny" color={colors.cream} style={{ fontSize: 13, lineHeight: 19, marginTop: 3 }}>{value}</Text>
    </View>
  );
}

// Render any of the section shapes (string | string[] | object) into a readable card body.
// `explanations` (life-areas card only) maps a score key → its tap-to-reveal "why" sentence.
function SectionBody({ content, explanations }: { content: unknown; explanations?: Record<string, string> }) {
  if (typeof content === 'string') {
    return <Text variant="tiny" color={colors.cream} style={styles.lead}>{content}</Text>;
  }
  if (Array.isArray(content)) {
    return <Bullets items={content as string[]} />;
  }
  if (content && typeof content === 'object') {
    const entries = Object.entries(content as Record<string, unknown>);
    const scoreEntries = entries.filter(([, v]) => typeof v === 'number');
    return (
      <View>
        {entries.map(([key, value]) => {
          if (typeof value === 'number') return null; // scores rendered together below
          if (LEAD_KEYS.includes(key) && typeof value === 'string') {
            return <Text key={key} variant="body" color={colors.cream} style={styles.lead}>{value}</Text>;
          }
          if (Array.isArray(value)) {
            const label = FIELD_LABELS[key] ?? (key === 'whatWorks' ? 'What works' : key === 'considerations' ? 'Keep in mind' : key);
            return (
              <View key={key} style={{ marginTop: 10 }}>
                <Text variant="eyebrow" color={colors.muted} style={{ fontSize: 10, letterSpacing: 0.5, marginBottom: 4 }}>{label}</Text>
                <Bullets items={value as string[]} />
              </View>
            );
          }
          if (typeof value !== 'string') return null;
          if (key === 'vedic') {
            return <Text key={key} variant="tiny" color={colors.mutedDim} style={styles.vedic}>Vedic basis: {value}</Text>;
          }
          if (key === 'scoringBasis') {
            return <Text key={key} variant="tiny" color={colors.mutedDim} style={styles.vedic}>How these are scored: {value}</Text>;
          }
          return <LabeledField key={key} label={FIELD_LABELS[key] ?? key} value={value} />;
        })}
        {scoreEntries.length > 0 && (
          <View style={{ marginTop: 8 }}>
            {scoreEntries.map(([key, value]) => (
              <ScoreRow key={key} label={SCORE_LABELS[key] ?? key} value={value as number} explanation={explanations?.[key]} />
            ))}
          </View>
        )}
      </View>
    );
  }
  return null;
}

function CollapsibleCard({ label, content, open, onToggle, explanations }: { label: string; content: unknown; open: boolean; onToggle: () => void; explanations?: Record<string, string> }) {
  return (
    <Card style={{ marginBottom: 10, paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden' }}>
      <Pressable onPress={onToggle} style={styles.header} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Text variant="serif" style={{ fontSize: 15, color: colors.goldSoft, flex: 1 }}>{label}</Text>
        <Text style={{ color: colors.gold, fontSize: 12 }}>{open ? '▼' : '▶'}</Text>
      </Pressable>
      {open ? <View style={styles.body}><SectionBody content={content} explanations={explanations} /></View> : null}
    </Card>
  );
}

export function CompatibilityDeepView({ analysis }: { analysis: CompatibilityAnalysis }) {
  const [open, setOpen] = useState<string | null>('snapshot');
  const CARDS: { id: string; label: string; data: unknown; explanations?: Record<string, string> }[] = [
    { id: 'snapshot', label: 'Your Relationship', data: analysis.relationshipSnapshot },
    { id: 'emotional', label: 'Emotional Connection', data: analysis.emotionalCompatibility },
    { id: 'love', label: 'Love & Attraction', data: analysis.loveAttraction },
    { id: 'communication', label: 'Communication', data: analysis.communication },
    { id: 'longterm', label: 'Long-Term Potential', data: analysis.longTermPartnership },
    { id: 'navamsa', label: 'Navamsa / Deeper Bond', data: analysis.navamsaCompatibility },
    { id: 'strengths', label: 'Strengths of This Relationship', data: analysis.strengths },
    { id: 'growth', label: 'Growth Areas', data: analysis.growthAreas },
    { id: 'conflict', label: 'When Conflict Happens', data: analysis.conflictPattern },
    { id: 'lifeareas', label: 'Shared Life Areas', data: analysis.sharedLifeAreas, explanations: analysis.lifeAreaExplanations },
    { id: 'climate', label: 'Current Relationship Climate', data: analysis.relationshipClimate },
    { id: 'guidance', label: "Tara's Guidance", data: analysis.taraGuidance },
  ];

  return (
    <View style={{ marginTop: spacing.lg }}>
      <View style={{ alignItems: 'center', marginBottom: 12 }}>
        <Text variant="eyebrow" color={colors.muted} style={{ fontSize: 10.5, letterSpacing: 1 }}>YOUR RELATIONSHIP</Text>
        <Text variant="serif" style={{ fontSize: 20, color: colors.gold, marginTop: 4 }}>{analysis.connectionType}</Text>
      </View>
      <View style={styles.contextBox}>
        <Text variant="tiny" color={colors.cream} style={{ fontSize: 12.5, lineHeight: 18 }}>{analysis.scoreContext}</Text>
      </View>
      <Text variant="tiny" color={colors.muted} style={{ fontSize: 11.5, lineHeight: 17, marginBottom: 14 }}>
        Ashtakoota is one traditional lens. The analysis below reveals emotional patterns, attraction, communication, and long-term potential. Tap any section to open it.
      </Text>
      {CARDS.map((c) => (
        <CollapsibleCard
          key={c.id} label={c.label} content={c.data} explanations={c.explanations}
          open={open === c.id} onToggle={() => setOpen(open === c.id ? null : c.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, paddingHorizontal: 16 },
  body: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 2 },
  lead: { fontSize: 13.5, lineHeight: 20, color: colors.cream },
  vedic: { fontSize: 11, lineHeight: 16, fontStyle: 'italic', marginTop: 12 },
  contextBox: {
    borderColor: colors.line, borderWidth: 1, borderRadius: radius.md,
    backgroundColor: 'rgba(205,163,73,0.06)', padding: 13, marginBottom: 12,
  },
  barTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
});
