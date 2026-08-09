// app/(onboarding)/priority.tsx
// "What matters most to you right now?" A multi-select step (up to 3 areas) after birth
// details and before the wellness step. The choices are stored on the profile as
// userPriorities and used only as gentle tie-breakers and suggestion seeds; the chart still
// drives the daily experience. No chart math here; it runs later on the reveal.
import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import OnboardingShell from '@/components/OnboardingShell';
import { Text } from '@/components/ui';
import { useProfile } from '@/hooks/useProfile';
import { PRIORITIES, PriorityKey } from '@/data/priorities';
import { colors, radius } from '@/theme';

const MAX = 3;

export default function PriorityScreen() {
  const { profile, update } = useProfile();
  const [selected, setSelected] = useState<PriorityKey[]>(profile.userPriorities ?? []);

  const toggle = (key: PriorityKey) => {
    setSelected((cur) =>
      cur.includes(key) ? cur.filter((k) => k !== key) : cur.length < MAX ? [...cur, key] : cur,
    );
  };

  const onContinue = () => {
    if (!selected.length) return;
    update({ userPriorities: selected });
    router.push('/(onboarding)/wellness');
  };

  return (
    <OnboardingShell
      step={5}
      total={6}
      question="What matters most to you right now?"
      helper="Choose up to 3. Your chart still leads each day; these just help Tara tune the details."
      disabled={!selected.length}
      onContinue={onContinue}
      continueLabel={selected.length ? `Continue (${selected.length}/${MAX})` : 'Continue'}
    >
      <View style={{ gap: 9 }}>
        {PRIORITIES.map((p) => {
          const idx = selected.indexOf(p.key);
          const on = idx >= 0;
          const full = selected.length >= MAX && !on;
          return (
            <Pressable
              key={p.key}
              onPress={() => toggle(p.key)}
              disabled={full}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on, disabled: full }}
              style={[styles.row, on && styles.rowOn, full && styles.rowFull]}
            >
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontSize: 15 }}>{p.label}</Text>
                <Text variant="tiny" color={colors.muted} style={{ fontSize: 11.5, marginTop: 1 }}>{p.blurb}</Text>
              </View>
              {/* A numbered box shows the selection order (1, 2, 3); empty when unselected. */}
              <View style={[styles.box, on && styles.boxOn]}>
                {on ? <Text variant="tiny" color={colors.bg} style={{ fontSize: 12, fontWeight: '700' }}>{idx + 1}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 11, paddingHorizontal: 14,
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, backgroundColor: colors.card,
  },
  rowOn: { borderColor: 'rgba(205,163,73,0.6)', backgroundColor: 'rgba(205,163,73,0.10)' },
  rowFull: { opacity: 0.4 },
  box: {
    width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  boxOn: { borderColor: colors.gold, backgroundColor: colors.gold },
});
