// app/settings/notifications.tsx
import React from 'react';
import Screen from '@/components/Screen';
import SubHeader from '@/components/SubHeader';
import { Text, Card } from '@/components/ui';
import { colors } from '@/theme';

export default function NotificationsSettings() {
  return (
    <Screen>
      <SubHeader eyebrow="Settings" title="Notifications" />
      <Card>
        <Text variant="tiny" color={colors.muted}>
          Choose what Tara nudges you about — daily energy, transits, and dasha shifts. Controls coming soon.
        </Text>
      </Card>
    </Screen>
  );
}
