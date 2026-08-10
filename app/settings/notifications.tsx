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
  refreshDailyNotifications, getNotifSlots, setNotifSlots, NotifSlots,
} from '@/lib/notifications';
import { colors } from '@/theme';

const SLOTS: { key: keyof NotifSlots; label: string; sub: string }[] = [
  { key: 'morning', label: 'Morning briefing', sub: '8:00 AM · your day at a glance' },
  { key: 'midday', label: 'Midday timing', sub: '12:00 PM · your strongest window' },
  { key: 'evening', label: 'Evening reflection', sub: '6:00 PM · look back on the day' },
];

export default function NotificationsSettings() {
  const chart = useChart();
  const { profile } = useProfile();
  const [enabled, setEnabled] = useState(false);
  const [slots, setSlots] = useState<NotifSlots>({ morning: true, midday: true, evening: true });
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      setSlots(await getNotifSlots());
      setEnabled(await hasScheduledNotifications().catch(() => false));
      setReady(true);
    })();
  }, []);

  const promptOpenSettings = () =>
    Alert.alert(
      'Notifications are off',
      'Turn on notifications for Tara in iOS Settings to receive your daily guidance.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }],
    );

  // Master switch: on schedules the enabled slots; off cancels everything.
  const onMaster = async (next: boolean) => {
    setBusy(true);
    if (next) {
      if ((await getNotificationStatus()) === 'denied') { setBusy(false); promptOpenSettings(); return; }
      // If every slot is off, turn them all on so "on" actually delivers something.
      let s = slots;
      if (!s.morning && !s.midday && !s.evening) { s = { morning: true, midday: true, evening: true }; setSlots(s); await setNotifSlots(s); }
      const ok = await enableDailyNotifications(chart, profile.birthDate, profile.userPriorities ?? []);
      setEnabled(ok);
      setBusy(false);
      if (!ok) promptOpenSettings();
    } else {
      await cancelDailyNotifications();
      setEnabled(false);
      setBusy(false);
    }
  };

  // Per-slot switch: reschedule with the new selection (only meaningful while master is on).
  const onSlot = async (key: keyof NotifSlots, val: boolean) => {
    const next = { ...slots, [key]: val };
    setSlots(next);
    await setNotifSlots(next);
    if (!enabled) return;
    setBusy(true);
    await refreshDailyNotifications(chart, profile.birthDate, profile.userPriorities ?? []);
    setEnabled(await hasScheduledNotifications().catch(() => false));
    setBusy(false);
  };

  return (
    <Screen>
      <SubHeader eyebrow="Settings" title="Notifications" />

      <Card style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text variant="serif" style={{ fontSize: 16 }}>Daily notifications</Text>
            <Text variant="tiny" color={colors.muted} style={{ marginTop: 4, lineHeight: 17 }}>
              Three moments a day: a morning briefing, a midday timing cue, and an evening reflection, each written from your chart.
            </Text>
          </View>
          {ready ? (
            <Switch value={enabled} onValueChange={onMaster} disabled={busy} trackColor={{ true: colors.gold }} />
          ) : (
            <ActivityIndicator color={colors.gold} size="small" />
          )}
        </View>
      </Card>

      <Card style={{ marginBottom: 16, opacity: enabled ? 1 : 0.5 }}>
        {SLOTS.map((s, i) => (
          <View
            key={s.key}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingVertical: 12, borderBottomWidth: i === SLOTS.length - 1 ? 0 : 1, borderBottomColor: colors.line,
            }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text variant="body" style={{ fontSize: 14.5 }}>{s.label}</Text>
              <Text variant="tiny" color={colors.muted} style={{ marginTop: 2, fontSize: 11.5 }}>{s.sub}</Text>
            </View>
            <Switch
              value={slots[s.key]}
              onValueChange={(v) => onSlot(s.key, v)}
              disabled={busy || !enabled}
              trackColor={{ true: colors.gold }}
            />
          </View>
        ))}
      </Card>

      <Card>
        <Text variant="tiny" color={colors.muted} style={{ lineHeight: 17 }}>
          Each message reflects that day: your dasha, the Moon’s nakshatra, and the day’s strongest graha,
          so no two read the same. Scheduled on this device only. No push servers involved.
        </Text>
      </Card>
    </Screen>
  );
}
