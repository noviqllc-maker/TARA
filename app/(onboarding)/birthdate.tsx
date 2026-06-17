// app/(onboarding)/birthdate.tsx
import React, { useState } from 'react';
import { router } from 'expo-router';
import OnboardingShell from '@/components/OnboardingShell';
import Field from '@/components/Field';
import { useProfile } from '@/hooks/useProfile';

export default function BirthDateScreen() {
  const { profile, update } = useProfile();
  const [v, setV] = useState(profile.birthDate);
  return (
    <OnboardingShell
      step={2} total={5}
      question="When were you born?"
      helper="Format: YYYY-MM-DD"
      disabled={!v.trim()}
      onContinue={() => { update({ birthDate: v.trim() }); router.push('/(onboarding)/birthtime'); }}
    >
      <Field placeholder="1994-09-23" value={v} onChangeText={setV} autoFocus keyboardType="numbers-and-punctuation" />
    </OnboardingShell>
  );
}
