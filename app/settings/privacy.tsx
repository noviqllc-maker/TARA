// app/settings/privacy.tsx
import React from 'react';
import Screen from '@/components/Screen';
import SubHeader from '@/components/SubHeader';
import { Text, Card } from '@/components/ui';
import { colors } from '@/theme';

export default function PrivacySettings() {
  return (
    <Screen>
      <SubHeader eyebrow="Settings" title="Privacy" />
      <Card>
        <Text variant="tiny" color={colors.muted}>
          Manage how your birth details and wellness data are stored. Your chart is computed on-device. Controls coming soon.
        </Text>
      </Card>
    </Screen>
  );
}
