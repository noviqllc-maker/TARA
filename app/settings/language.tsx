// app/settings/language.tsx
import React from 'react';
import Screen from '@/components/Screen';
import SubHeader from '@/components/SubHeader';
import { Text, Card } from '@/components/ui';
import { colors } from '@/theme';

export default function LanguageSettings() {
  return (
    <Screen>
      <SubHeader eyebrow="Settings" title="Language" />
      <Card>
        <Text variant="tiny" color={colors.muted}>
          Choose the language Tara speaks. Currently English — more languages coming soon.
        </Text>
      </Card>
    </Screen>
  );
}
