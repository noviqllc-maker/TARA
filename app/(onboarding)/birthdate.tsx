// app/(onboarding)/birthdate.tsx
import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import OnboardingShell from '@/components/OnboardingShell';
import { Text } from '@/components/ui';
import { useProfile } from '@/hooks/useProfile';
import { colors, fonts, radius } from '@/theme';

export default function BirthDateScreen() {
  const { profile, update } = useProfile();

  // Pre-fill from a previously saved YYYY-MM-DD (e.g. when navigating back).
  const saved = /^(\d{4})-(\d{2})-(\d{2})$/.exec(profile.birthDate || '');
  const [day, setDay] = useState(saved ? saved[3] : '');
  const [month, setMonth] = useState(saved ? saved[2] : '');
  const [year, setYear] = useState(saved ? saved[1] : '');

  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  const onlyDigits = (t: string, max: number) => t.replace(/[^0-9]/g, '').slice(0, max);
  // Auto-advance once a field is full.
  const onDay = (t: string) => { const v = onlyDigits(t, 2); setDay(v); if (v.length === 2) monthRef.current?.focus(); };
  const onMonth = (t: string) => { const v = onlyDigits(t, 2); setMonth(v); if (v.length === 2) yearRef.current?.focus(); };
  const onYear = (t: string) => setYear(onlyDigits(t, 4));

  const dN = parseInt(day, 10);
  const mN = parseInt(month, 10);
  const yN = parseInt(year, 10);
  const currentYear = new Date().getFullYear();

  const dayOk = day !== '' && dN >= 1 && dN <= 31;
  const monthOk = month !== '' && mN >= 1 && mN <= 12;
  const yearOk = year.length === 4 && yN >= 1900 && yN <= currentYear;
  const allValid = dayOk && monthOk && yearOk;

  // Only flag a field once it's filled but out of range — no nagging mid-type.
  const dayBad = day !== '' && (dN < 1 || dN > 31);
  const monthBad = month !== '' && (mN < 1 || mN > 12);
  const yearBad = year.length === 4 && (yN < 1900 || yN > currentYear);
  const errorMsg = dayBad ? 'Enter a valid day (1–31).'
    : monthBad ? 'Enter a valid month (1–12).'
    : yearBad ? `Enter a year between 1900 and ${currentYear}.`
    : '';

  const onContinue = () => {
    // Same YYYY-MM-DD shape the rest of the app expects.
    const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    update({ birthDate: date });
    router.push('/(onboarding)/birthtime');
  };

  return (
    <OnboardingShell
      step={2} total={5}
      question="When were you born?"
      helper="Enter your day, month and year of birth."
      disabled={!allValid}
      onContinue={onContinue}
    >
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text variant="eyebrow" color={colors.muted} style={styles.label}>DD</Text>
          <TextInput
            value={day} onChangeText={onDay}
            placeholder="DD" placeholderTextColor={colors.mutedDim}
            keyboardType="number-pad" maxLength={2} autoFocus
            style={styles.field}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="eyebrow" color={colors.muted} style={styles.label}>MM</Text>
          <TextInput
            ref={monthRef} value={month} onChangeText={onMonth}
            placeholder="MM" placeholderTextColor={colors.mutedDim}
            keyboardType="number-pad" maxLength={2}
            style={styles.field}
          />
        </View>
        <View style={{ flex: 1.5 }}>
          <Text variant="eyebrow" color={colors.muted} style={styles.label}>YYYY</Text>
          <TextInput
            ref={yearRef} value={year} onChangeText={onYear}
            placeholder="YYYY" placeholderTextColor={colors.mutedDim}
            keyboardType="number-pad" maxLength={4}
            style={styles.field}
          />
        </View>
      </View>
      {errorMsg ? <Text variant="tiny" color={colors.terra} style={{ marginTop: 12 }}>{errorMsg}</Text> : null}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  label: { marginBottom: 8, marginLeft: 2 },
  field: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 15,
    paddingHorizontal: 16,
    color: colors.cream,
    fontFamily: fonts.sans,
    fontSize: 20,
    textAlign: 'center',
  },
});
