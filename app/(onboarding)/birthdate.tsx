// app/(onboarding)/birthdate.tsx
import React, { useState } from 'react';
import { View, Platform, Pressable } from 'react-native';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import OnboardingShell from '@/components/OnboardingShell';
import { Text } from '@/components/ui';
import { useProfile } from '@/hooks/useProfile';
import { colors, radius } from '@/theme';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MIN_DATE = new Date(1900, 0, 1);
const DEFAULT_DATE = new Date(1995, 0, 1);

// Exact same YYYY-MM-DD shape the Vedic engine already expects — only the input UI changes.
function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function fromYMD(s?: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}
function label(d: Date): string {
  return `${d.getDate().toString().padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function BirthDateScreen() {
  const { profile, update } = useProfile();
  const today = new Date();
  // Keep the previously entered date (e.g. navigating back), else a sensible default.
  const [date, setDate] = useState<Date>(fromYMD(profile.birthDate) ?? DEFAULT_DATE);
  const [show, setShow] = useState(Platform.OS === 'ios'); // iOS inline spinner; Android opens on tap

  return (
    <OnboardingShell
      step={2} total={5}
      question="When were you born?"
      helper="Tap to pick your date of birth."
      onContinue={() => { update({ birthDate: toYMD(date) }); router.push('/(onboarding)/birthtime'); }}
    >
      {/* Themed, tappable field showing the selected date */}
      <Pressable
        onPress={() => setShow(true)}
        style={{
          backgroundColor: 'rgba(255,255,255,0.04)',
          borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg,
          paddingVertical: 22, alignItems: 'center', marginBottom: 8,
        }}
      >
        <Text variant="eyebrow" color={colors.muted} style={{ marginBottom: 6 }}>Date of birth</Text>
        <Text variant="h1" style={{ fontSize: 30 }}>{label(date)}</Text>
      </Pressable>

      {show && (
        <View style={{ alignItems: 'center' }}>
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            themeVariant="dark"
            textColor={colors.cream}
            maximumDate={today}
            minimumDate={MIN_DATE}
            onChange={(_, d) => {
              if (Platform.OS === 'android') setShow(false);
              if (d) setDate(d);
            }}
          />
        </View>
      )}
    </OnboardingShell>
  );
}
