// app/(onboarding)/priority.tsx
// "What matters most right now?" — a single-select step after birth details and before the
// wellness/health step. The answer is stored on the profile (userPriority) and later used to
// weight which life area Tara leads with. No chart math here; it runs later on the reveal.
import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import OnboardingShell from '@/components/OnboardingShell';
import { Text } from '@/components/ui';
import { useProfile } from '@/hooks/useProfile';
import { PRIORITIES, PriorityKey } from '@/data/priorities';
import { colors, radius } from '@/theme';

export default function PriorityScreen() {
  const { profile, update } = useProfile();
  const [selected, setSelected] = useState<PriorityKey | undefined>(profile.userPriority);

  const onContinue = () => {
    if (!selected) return;
    update({ userPriority: selected });
    router.push('/(onboarding)/wellness');
  };

  return (
    <OnboardingShell
      step={5}
      total={6}
      question="What matters most right now?"
      helper="Pick one. Tara will lead with the part of life you most want guidance on."
      disabled={!selected}
      onContinue={onContinue}
    >
      <View style={{ gap: 9 }}>
        {PRIORITIES.map((p) => {
          const on = selected === p.key;
          return (
            <Pressable
              key={p.key}
              onPress={() => setSelected(p.key)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={[styles.row, on && styles.rowOn]}
            >
              <View style={{ flex: 1 }}>
                <Text variant="body" color={on ? colors.cream : colors.cream} style={{ fontSize: 15 }}>{p.label}</Text>
                <Text variant="tiny" color={colors.muted} style={{ fontSize: 11.5, marginTop: 1 }}>{p.blurb}</Text>
              </View>
              <View style={[styles.radio, on && styles.radioOn]}>
                {on ? <View style={styles.radioDot} /> : null}
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
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOn: { borderColor: colors.gold },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.gold },
});
