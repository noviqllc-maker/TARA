// app/(onboarding)/birthtime.tsx
import React, { useRef, useState } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import OnboardingShell from '@/components/OnboardingShell';
import { Text } from '@/components/ui';
import { useProfile } from '@/hooks/useProfile';
import { colors, fonts, radius } from '@/theme';

const pad = (n: number | string) => n.toString().padStart(2, '0');

export default function BirthTimeScreen() {
  const { profile, update } = useProfile();

  // Seed from a previously saved 24-hour "HH:MM" (e.g. navigating back) → 12-hour fields.
  const seed = /^(\d{1,2}):(\d{2})/.exec(profile.birthTime || '');
  const seedH24 = seed ? parseInt(seed[1], 10) : NaN;
  const [hh, setHH] = useState(seed ? pad(seedH24 % 12 || 12) : '');
  const [mm, setMM] = useState(seed ? pad(parseInt(seed[2], 10)) : '');
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(seed && seedH24 >= 12 ? 'PM' : 'AM');

  const mmRef = useRef<TextInput>(null);

  const onlyDigits = (t: string, max: number) => t.replace(/[^0-9]/g, '').slice(0, max);
  const onHH = (t: string) => { const v = onlyDigits(t, 2); setHH(v); if (v.length === 2) mmRef.current?.focus(); };
  const onMM = (t: string) => setMM(onlyDigits(t, 2));
  // Zero-pad on blur so a single digit reads as e.g. 07 / 05.
  const padHH = () => { if (hh.length === 1) setHH(pad(hh)); };
  const padMM = () => { if (mm.length === 1) setMM(pad(mm)); };

  const hN = parseInt(hh, 10);
  const mN = parseInt(mm, 10);
  const hourOk = hh !== '' && hN >= 1 && hN <= 12;
  const minOk = mm !== '' && mN >= 0 && mN <= 59;
  const valid = hourOk && minOk;

  // Only flag a field once it's filled but out of range — no nagging mid-type.
  const hourBad = hh !== '' && (hN < 1 || hN > 12);
  const minBad = mm !== '' && (mN < 0 || mN > 59);
  const errorMsg = hourBad ? 'Enter an hour between 1 and 12.'
    : minBad ? 'Enter minutes between 0 and 59.'
    : '';

  const onContinue = () => {
    // Convert 12-hour → the SAME 24-hour "HH:MM" shape the app already saves.
    const h24 = ampm === 'PM' ? (hN % 12) + 12 : (hN % 12);
    update({ birthTime: `${pad(h24)}:${pad(mN)}` });
    router.push('/(onboarding)/birthplace');
  };

  return (
    <OnboardingShell
      step={3} total={5}
      question="What time were you born?"
      helper="Enter the hour and minute from your birth records."
      disabled={!valid}
      onContinue={onContinue}
    >
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text variant="eyebrow" color={colors.muted} style={styles.label}>HH</Text>
          <TextInput
            value={hh} onChangeText={onHH} onBlur={padHH}
            placeholder="07" placeholderTextColor={colors.mutedDim}
            keyboardType="number-pad" maxLength={2} autoFocus
            style={styles.field}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="eyebrow" color={colors.muted} style={styles.label}>MM</Text>
          <TextInput
            ref={mmRef} value={mm} onChangeText={onMM} onBlur={padMM}
            placeholder="05" placeholderTextColor={colors.mutedDim}
            keyboardType="number-pad" maxLength={2}
            style={styles.field}
          />
        </View>
      </View>

      <Text variant="eyebrow" color={colors.muted} style={[styles.label, { marginTop: 18 }]}>AM / PM</Text>
      <View style={styles.pillRow}>
        {(['AM', 'PM'] as const).map((p) => {
          const active = ampm === p;
          return (
            <Pressable key={p} onPress={() => setAmpm(p)} style={[styles.pill, active && styles.pillActive]}>
              <Text variant="body" color={active ? '#1a1018' : colors.cream} style={{ fontWeight: '600' }}>{p}</Text>
            </Pressable>
          );
        })}
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
  pillRow: { flexDirection: 'row', gap: 12 },
  pill: {
    flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  pillActive: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
});
