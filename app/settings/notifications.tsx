// app/settings/notifications.tsx
import React, { useEffect, useState } from 'react';
import { View, Switch, Alert, ActivityIndicator } from 'react-native';
import Screen from '@/components/Screen';
import SubHeader from '@/components/SubHeader';
import { Text, Card, GhostButton } from '@/components/ui';
import {
  scheduleDailyNotifications, cancelDailyNotifications, hasScheduledNotifications,
  scheduleTestNotification,
} from '@/lib/notifications';
import { colors } from '@/theme';

const ROWS = [
  { title: 'Brahma Muhurta', time: '5:00 AM', desc: 'The sacred dawn hour — set your intention.' },
  { title: 'Abhijit Muhurta', time: '12:00 PM', desc: 'The victory hour — a midday nudge to ask Tara.' },
  { title: 'Sandhya', time: '6:00 PM', desc: 'Dusk reflection on how your day settled.' },
];

export default function NotificationsSettings() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hasScheduledNotifications()
      .then(setEnabled)
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const onToggle = async (next: boolean) => {
    setBusy(true);
    if (next) {
      const ok = await scheduleDailyNotifications();
      setEnabled(ok);
      if (!ok) {
        Alert.alert(
          'Notifications are off',
          'Enable notifications for Tara in iOS Settings to receive your daily muhurta reminders.',
        );
      }
    } else {
      await cancelDailyNotifications();
      setEnabled(false);
    }
    setBusy(false);
  };

  return (
    <Screen>
      <SubHeader eyebrow="Settings" title="Notifications" />

      <Card style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text variant="serif" style={{ fontSize: 16 }}>Daily reminders</Text>
            <Text variant="tiny" color={colors.muted} style={{ marginTop: 4 }}>
              Three gentle nudges a day, timed to the Vedic muhurtas.
            </Text>
          </View>
          {ready ? (
            <Switch
              value={enabled}
              onValueChange={onToggle}
              disabled={busy}
              trackColor={{ true: colors.gold }}
            />
          ) : (
            <ActivityIndicator color={colors.gold} size="small" />
          )}
        </View>
      </Card>

      {/* TEMP (dev): verify the cold-start deep link. Tap, then immediately
          force-quit the app; in ~12s tap the banner — it should open Tara AI.
          Remove this card once confirmed. */}
      <Card style={{ marginBottom: 16 }}>
        <Text variant="serif" style={{ fontSize: 15 }}>Test cold-start deep link</Text>
        <Text variant="tiny" color={colors.muted} style={{ marginTop: 4 }}>
          Sends a one-off notification in ~12s. Tap it, then force-quit the app before it arrives — tapping the banner should cold-launch Tara AI.
        </Text>
        <GhostButton
          label="Send test notification (12s)"
          style={{ marginTop: 12 }}
          onPress={async () => {
            const ok = await scheduleTestNotification();
            Alert.alert(
              ok ? 'Test scheduled ✦' : 'Notifications are off',
              ok ? 'Force-quit the app now. Tap the banner in ~12s.' : 'Enable notifications for Tara in iOS Settings first.',
            );
          }}
        />
      </Card>

      <Card>
        <View style={{ gap: 14 }}>
          {ROWS.map((r) => (
            <View key={r.title} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontSize: 14 }}>{r.title}</Text>
                <Text variant="tiny" color={colors.muted} style={{ marginTop: 3 }}>{r.desc}</Text>
              </View>
              <Text variant="body" color={colors.goldSoft} style={{ fontSize: 13 }}>{r.time}</Text>
            </View>
          ))}
        </View>
      </Card>
    </Screen>
  );
}
