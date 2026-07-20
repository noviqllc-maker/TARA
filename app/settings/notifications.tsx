// app/settings/notifications.tsx
import React, { useEffect, useState } from 'react';
import { View, Switch, Alert, ActivityIndicator, Linking } from 'react-native';
import Screen from '@/components/Screen';
import SubHeader from '@/components/SubHeader';
import { Text, Card } from '@/components/ui';
import { useChart } from '@/hooks/useChart';
import { useProfile } from '@/hooks/useProfile';
import {
  enableDailyNotifications, cancelDailyNotifications, hasScheduledNotifications, getNotificationStatus,
} from '@/lib/notifications';
import { colors } from '@/theme';

export default function NotificationsSettings() {
  const chart = useChart();
  const { profile } = useProfile();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hasScheduledNotifications().then(setEnabled).catch(() => {}).finally(() => setReady(true));
  }, []);

  const promptOpenSettings = () =>
    Alert.alert(
      'Notifications are off',
      'Turn on notifications for Tara in iOS Settings to receive your daily message.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }],
    );

  const onToggle = async (next: boolean) => {
    setBusy(true);
    if (next) {
      // If the OS already denied us, we can't re-prompt — deep-link to Settings.
      if ((await getNotificationStatus()) === 'denied') {
        setBusy(false);
        promptOpenSettings();
        return;
      }
      const ok = await enableDailyNotifications(chart, profile.birthDate);
      setEnabled(ok);
      setBusy(false);
      if (!ok) promptOpenSettings();
    } else {
      await cancelDailyNotifications();
      setEnabled(false);
      setBusy(false);
    }
  };

  return (
    <Screen>
      <SubHeader eyebrow="Settings" title="Notifications" />

      <Card style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text variant="serif" style={{ fontSize: 16 }}>Daily notifications</Text>
            <Text variant="tiny" color={colors.muted} style={{ marginTop: 4, lineHeight: 17 }}>
              One thoughtful message each morning at 8:00 AM, written from your chart.
            </Text>
          </View>
          {ready ? (
            <Switch value={enabled} onValueChange={onToggle} disabled={busy} trackColor={{ true: colors.gold }} />
          ) : (
            <ActivityIndicator color={colors.gold} size="small" />
          )}
        </View>
      </Card>

      <Card>
        <Text variant="tiny" color={colors.muted} style={{ lineHeight: 17 }}>
          Titled “Your day at a glance,” it reflects your dasha, the Moon’s nakshatra, and the day’s
          strongest graha. Scheduled on this device only — no push servers involved.
        </Text>
      </Card>
    </Screen>
  );
}
