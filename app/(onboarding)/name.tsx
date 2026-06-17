// app/(onboarding)/name.tsx
import React, { useState } from 'react';
import { router } from 'expo-router';
import OnboardingShell from '@/components/OnboardingShell';
import Field from '@/components/Field';
import { useProfile } from '@/hooks/useProfile';

export default function NameScreen() {
  const { profile, update } = useProfile();
  const [name, setName] = useState(profile.name);
  return (
    <OnboardingShell
      step={1} total={5}
      question="What should Tara call you?"
      disabled={!name.trim()}
      onContinue={() => { update({ name: name.trim() }); router.push('/(onboarding)/birthdate'); }}
    >
      <Field placeholder="Your name" value={name} onChangeText={setName} autoFocus returnKeyType="next" />
    </OnboardingShell>
  );
}
