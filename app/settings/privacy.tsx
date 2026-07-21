// app/settings/privacy.tsx
import React, { useEffect, useState } from 'react';
import { View, Switch, Pressable, Alert, Linking } from 'react-native';
import { useNavigation } from 'expo-router';
import Screen from '@/components/Screen';
import SubHeader from '@/components/SubHeader';
import { Text, Card } from '@/components/ui';
import { useProfile } from '@/hooks/useProfile';
import { getRememberChat, setRememberChat, clearChatHistory, wipeLocalData } from '@/lib/privacy';
import { cancelDailyNotifications } from '@/lib/notifications';
import { resetRoot } from '@/lib/nav';
import { colors } from '@/theme';

const PRIVACY_URL = 'https://tarawellness.org/privacy';

export default function PrivacySettings() {
  const { reset } = useProfile();
  const nav = useNavigation();
  const [remember, setRemember] = useState(true);
  useEffect(() => { getRememberChat().then(setRemember); }, []);

  const toggleRemember = async (next: boolean) => { setRemember(next); await setRememberChat(next); };

  const onClearChat = () =>
    Alert.alert('Clear chat history', 'This removes your Ask Tara conversation memory on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => clearChatHistory() },
    ]);

  const onWipe = () =>
    Alert.alert('Delete all my data', 'This permanently erases your profile, chart inputs, chat, and settings from this device and restarts onboarding.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete everything', style: 'destructive',
        onPress: async () => {
          await wipeLocalData();
          await cancelDailyNotifications().catch(() => {});
          reset();
          resetRoot(nav, 'intro', '/intro'); // reset root → intro is sole screen (no tabs beneath)
        },
      },
    ]);

  return (
    <Screen>
      <SubHeader eyebrow="Settings" title="Privacy" />

      <Card style={{ marginBottom: 16 }}>
        <Text variant="eyebrow" color={colors.gold}>In your account · synced</Text>
        <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, lineHeight: 18 }}>
          Your Apple sign-in details (name, email, and user ID), birth details, chart, journal
          entries, mood check-ins, purchased reports, and question credits are stored securely in
          your account on our servers (Supabase). This keeps everything in sync across your devices
          and safe if you reinstall.
        </Text>

        <Text variant="eyebrow" color={colors.gold} style={{ marginTop: 18 }}>On this device only</Text>
        <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, lineHeight: 18 }}>
          Your Ask Tara conversations stay on this device (per the setting below). Each question is
          sent to our AI service to generate a reply, but isn’t retained on our servers beyond
          producing that answer.
        </Text>

        <Text variant="eyebrow" color={colors.gold} style={{ marginTop: 18 }}>Apple Health</Text>
        <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, lineHeight: 18 }}>
          Any Apple Health data is read on your device, only with your permission, and used solely
          for personalized insights. It’s never sold or used for advertising.
        </Text>

        <Text variant="eyebrow" color={colors.gold} style={{ marginTop: 18 }}>Deleting your data</Text>
        <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, lineHeight: 18 }}>
          You can permanently delete your account and everything stored on our servers anytime in
          Settings → Delete Account.
        </Text>

        <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} hitSlop={6} style={{ marginTop: 18 }}>
          <Text variant="tiny" color={colors.gold} style={{ fontWeight: '600' }}>Read our full Privacy Policy →</Text>
        </Pressable>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text variant="serif" style={{ fontSize: 16 }}>Remember conversations</Text>
            <Text variant="tiny" color={colors.muted} style={{ marginTop: 4 }}>
              Let Tara keep your chat history on this device. Turning this off erases it now.
            </Text>
          </View>
          <Switch value={remember} onValueChange={toggleRemember} trackColor={{ true: colors.gold }} />
        </View>
      </Card>

      <Card>
        <Pressable onPress={onClearChat} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(205,163,73,0.1)' }}>
          <Text variant="body" style={{ fontSize: 14 }}>Clear Ask Tara history</Text>
        </Pressable>
        <Pressable onPress={onWipe} style={{ paddingVertical: 12 }}>
          <Text variant="body" color={colors.rose} style={{ fontSize: 14 }}>Delete all my data</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}
