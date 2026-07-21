// app/settings/account.tsx
// Account controls: Sign out (confirm) and Delete Account (App Review 5.1.1 —
// mandatory now that we have accounts). Delete double-confirms, removes the Supabase
// user + all their rows server-side, and logs out of RevenueCat.
import React, { useState } from 'react';
import { View, Pressable, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from 'expo-router';
import Screen from '@/components/Screen';
import SubHeader from '@/components/SubHeader';
import { Text, Card } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { resetRoot } from '@/lib/nav';
import { colors, radius } from '@/theme';

export default function AccountSettings() {
  const { session, signOut, deleteAccount } = useAuth();
  const nav = useNavigation();
  const [busy, setBusy] = useState(false);

  const email = session?.user?.email;

  const onSignOut = () => {
    Alert.alert('Sign out', 'You can sign back in anytime with Apple to restore your chart and questions.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        // Reset the root stack → auth is the sole screen (no signed-in tabs left beneath).
        onPress: async () => { await signOut(); resetRoot(nav, 'auth', '/auth'); },
      },
    ]);
  };

  const onDelete = () => {
    Alert.alert(
      'Delete account',
      'This permanently deletes your account, chart data, journal, and question credits. Purchases cannot be restored afterward. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => Alert.alert('Are you sure?', 'This is permanent.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete forever', style: 'destructive',
              onPress: async () => {
                setBusy(true);
                const ok = await deleteAccount();
                setBusy(false);
                if (!ok) { Alert.alert('Could not delete', 'Please try again in a moment.'); return; }
                resetRoot(nav, 'intro', '/intro');
              },
            },
          ]),
        },
      ],
    );
  };

  return (
    <Screen>
      <SubHeader eyebrow="Settings" title="Account" />

      <Card style={{ marginBottom: 16 }}>
        <Text variant="eyebrow" color={colors.muted}>Signed in with Apple</Text>
        <Text variant="body" style={{ marginTop: 8, fontSize: 14 }}>{email || 'Your Apple account'}</Text>
      </Card>

      {busy ? (
        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
          <ActivityIndicator color={colors.gold} />
          <Text variant="tiny" color={colors.muted} style={{ marginTop: 10 }}>Deleting your account…</Text>
        </View>
      ) : (
        <>
          <Pressable onPress={onSignOut} style={styles.row}>
            <Text variant="body" style={{ fontSize: 14 }}>Sign out</Text>
            <Text style={{ color: colors.gold, fontSize: 18 }}>›</Text>
          </Pressable>
          <Pressable onPress={onDelete} style={[styles.row, { borderColor: 'rgba(217,138,134,0.4)' }]}>
            <Text variant="body" color={colors.rose} style={{ fontSize: 14 }}>Delete Account</Text>
            <Text style={{ color: colors.rose, fontSize: 18 }}>›</Text>
          </Pressable>
          <Text variant="tiny" color={colors.mutedDim} style={{ marginTop: 14, lineHeight: 16, fontSize: 11 }}>
            Deleting removes your account and all associated data from our servers.
          </Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 15, paddingHorizontal: 16, marginBottom: 10,
    backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md,
  },
});
