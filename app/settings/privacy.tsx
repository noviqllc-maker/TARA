// app/settings/privacy.tsx
import React, { useEffect, useState } from 'react';
import { View, Switch, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import Screen from '@/components/Screen';
import SubHeader from '@/components/SubHeader';
import { Text, Card } from '@/components/ui';
import { useProfile } from '@/hooks/useProfile';
import { getRememberChat, setRememberChat, clearChatHistory, wipeLocalData } from '@/lib/privacy';
import { cancelDailyNotifications } from '@/lib/notifications';
import { colors } from '@/theme';

export default function PrivacySettings() {
  const { reset } = useProfile();
  const [remember, setRemember] = useState(true);
  useEffect(() => { getRememberChat().then(setRemember); }, []);

  const toggleRemember = async (next: boolean) => { setRemember(next); await setRememberChat(next); };

  const onClearChat = () =>
    Alert.alert('Clear chat history', 'This removes your Tara AI conversation memory on this device.', [
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
          router.replace('/intro');
        },
      },
    ]);

  return (
    <Screen>
      <SubHeader eyebrow="Settings" title="Privacy" />

      <Card style={{ marginBottom: 16 }}>
        <Text variant="tiny" color={colors.muted}>
          Your birth chart is computed on this device, and your data is stored locally on your phone — not on our servers. Tara AI questions are sent to our service to generate a reply.
        </Text>
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
          <Text variant="body" style={{ fontSize: 14 }}>Clear Tara AI history</Text>
        </Pressable>
        <Pressable onPress={onWipe} style={{ paddingVertical: 12 }}>
          <Text variant="body" color={colors.rose} style={{ fontSize: 14 }}>Delete all my data</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}
