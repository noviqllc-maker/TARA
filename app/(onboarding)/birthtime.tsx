// app/(onboarding)/birthtime.tsx
import React, { useState } from 'react';
import { View, Platform, Pressable } from 'react-native';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import OnboardingShell from '@/components/OnboardingShell';
import { Text } from '@/components/ui';
import { useProfile } from '@/hooks/useProfile';
import { colors, radius } from '@/theme';

function fmt(d: Date) {
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}
function label(d: Date) {
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}

export default function BirthTimeScreen() {
  const { profile, update } = useProfile();
  // seed from saved value or a sensible default of 6:00 AM
  const init = (() => {
    const d = new Date();
    if (profile.birthTime && /^\d{1,2}:\d{2}/.test(profile.birthTime)) {
      const [h, m] = profile.birthTime.split(':').map(Number);
      d.setHours(h, m, 0, 0);
    } else {
      d.setHours(6, 0, 0, 0);
    }
    return d;
  })();
  const [time, setTime] = useState<Date>(init);
  const [show, setShow] = useState(Platform.OS === 'ios'); // iOS shows inline; Android on tap

  return (
    <OnboardingShell
      step={3} total={5}
      question="What time were you born?"
      helper="Even a few minutes can shift your chart. Tap to spin the dial."
      onContinue={() => { update({ birthTime: fmt(time) }); router.push('/(onboarding)/birthplace'); }}
    >
      {/* Big tappable time chip */}
      <Pressable
        onPress={() => setShow(true)}
        style={{
          backgroundColor: 'rgba(255,255,255,0.04)',
          borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg,
          paddingVertical: 22, alignItems: 'center', marginBottom: 8,
        }}
      >
        <Text variant="eyebrow" color={colors.muted} style={{ marginBottom: 6 }}>Selected time</Text>
        <Text variant="h1" style={{ fontSize: 38 }}>{label(time)}</Text>
      </Pressable>

      {show && (
        <View style={{ alignItems: 'center' }}>
          <DateTimePicker
            value={time}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
            themeVariant="dark"
            textColor={colors.cream}
            onChange={(_, d) => {
              if (Platform.OS === 'android') setShow(false);
              if (d) setTime(d);
            }}
          />
        </View>
      )}
    </OnboardingShell>
  );
}
