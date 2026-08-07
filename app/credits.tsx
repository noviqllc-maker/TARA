// app/credits.tsx
// Ask Tara question-credits paywall (consumable packs). Prices come only from
// RevenueCat priceString; the balance and crediting are server-authoritative
// (useCredits → Supabase). Independent of the premium subscription.
import React, { useState } from 'react';
import { View, Pressable, ScrollView, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import CosmicBackground from '@/components/CosmicBackground';
import { Text, GoldButton } from '@/components/ui';
import { useCredits } from '@/hooks/useCredits';
import { CreditProductId, BuyResult } from '@/lib/credits';
import { colors, radius, spacing } from '@/theme';

const PACKS: { id: CreditProductId; amount: number; tag?: string }[] = [
  { id: 'ask_credits_5', amount: 5 },
  { id: 'ask_credits_10', amount: 10, tag: 'Popular' },
  { id: 'ask_credits_25', amount: 25, tag: 'Best value' },
];

export default function CreditsPaywall() {
  const insets = useSafeAreaInsets();
  const { balance, products, buy } = useCredits();
  const [selected, setSelected] = useState<CreditProductId>('ask_credits_10');
  const [phase, setPhase] = useState<'idle' | 'buying' | 'success' | 'pending'>('idle');

  const priceOf = (id: string): string | undefined => products[id]?.priceString;
  const busy = phase === 'buying';

  // Return to the question page (Ask Tara). dismissTo pops the paywall (and the answer
  // view, if we came through it) back to the Ask Tara tab. NOT dismissAll(): that unwinds
  // the root Stack past (tabs) to its `index` anchor, which re-runs index.tsx's redirect
  // and remounts the whole tree at root (the "Begin Journey" flash + [Premium] Home mount).
  // The pending question is preserved on the tab (draft from the answer view / typed input).
  const backToQuestion = () => router.dismissTo('/(tabs)/tara' as any);

  const onBuy = async () => {
    setPhase('buying');
    let result: BuyResult;
    try { result = await buy(selected); }
    catch { result = 'error'; }

    if (result === 'success') {
      setPhase('success');                         // balance increased
      setTimeout(backToQuestion, 1300);
    } else if (result === 'pending') {
      setPhase('pending');                         // charged; webhook not landed yet
      setTimeout(backToQuestion, 2000);
    } else if (result === 'error') {
      setPhase('idle');
      Alert.alert('Purchase failed', 'Something went wrong and no charge was made. Please try again.');
    } else {
      setPhase('idle');                            // cancelled → silent
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <CosmicBackground intense />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: spacing.xl, paddingBottom: insets.bottom + 30 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginBottom: 18 }}>
          <Text variant="body" color={colors.muted}>✕ Close</Text>
        </Pressable>

        {(phase === 'success' || phase === 'pending') ? (
          <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 8 }}>
            <Text style={{ fontSize: 34, lineHeight: 46, color: colors.gold, textAlign: 'center' }}>✦</Text>
            {phase === 'success' ? (
              <>
                <Text variant="h1" style={{ textAlign: 'center', marginTop: 16 }}>Credits added</Text>
                <Text variant="tiny" color={colors.muted} style={{ textAlign: 'center', marginTop: 10, lineHeight: 20 }}>
                  You now have {typeof balance === 'number' ? balance : ''} {balance === 1 ? 'question' : 'questions'} ready. Taking you back…
                </Text>
              </>
            ) : (
              <>
                <Text variant="h1" style={{ textAlign: 'center', marginTop: 16 }}>Purchase received</Text>
                <Text variant="tiny" color={colors.muted} style={{ textAlign: 'center', marginTop: 10, lineHeight: 20 }}>
                  Your credits are arriving shortly. They’ll appear on your next visit. You were not charged twice.
                </Text>
              </>
            )}
          </Animated.View>
        ) : (
        <Animated.View entering={FadeInDown.duration(500)}>
          <Text style={{ fontSize: 30, lineHeight: 40, textAlign: 'center', color: colors.gold }}>✦</Text>
          <Text variant="h1" style={{ textAlign: 'center', marginTop: 12 }}>Ask Tara Credits</Text>
          <Text variant="tiny" style={{ textAlign: 'center', marginTop: 8, marginBottom: 6 }}>
            Each credit is one question, answered with your live chart.
          </Text>
          {typeof balance === 'number' && (
            <Text variant="tiny" color={colors.gold} style={{ textAlign: 'center', marginBottom: 24, fontWeight: '600' }}>
              You have {balance} {balance === 1 ? 'question' : 'questions'} left
            </Text>
          )}

          <View style={{ gap: 12, marginBottom: 18 }}>
            {PACKS.map(({ id, amount, tag }) => {
              const active = selected === id;
              const price = priceOf(id);
              return (
                <Pressable key={id} onPress={() => setSelected(id)} style={[styles.pack, active && styles.packActive]}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text variant="serif" style={{ fontSize: 18 }}>{amount} questions</Text>
                      {tag && (
                        <View style={styles.badge}>
                          <Text variant="tiny" color="#1a1018" style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.4 }}>{tag.toUpperCase()}</Text>
                        </View>
                      )}
                    </View>
                    <Text variant="tiny" color={colors.muted} style={{ marginTop: 4 }}>{amount} Ask Tara questions</Text>
                  </View>
                  <Text variant="serif" color={colors.goldSoft} style={{ fontSize: 17 }}>{price ?? '…'}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text variant="tiny" color={colors.muted} style={{ textAlign: 'center', marginBottom: 18 }}>
            ✦ Credits never expire.
          </Text>

          <GoldButton
            label={busy
              ? <ActivityIndicator color="#1a1018" />
              : priceOf(selected)
                ? `Buy ${PACKS.find((p) => p.id === selected)?.amount} · ${priceOf(selected)}`
                : 'Loading prices…'}
            onPress={onBuy}
            disabled={busy || !priceOf(selected)}
          />
          <Text variant="tiny" color={colors.mutedDim} style={{ textAlign: 'center', marginTop: 14, fontSize: 10.5, lineHeight: 15 }}>
            One-time purchase, charged to your Apple account. Credits are added after purchase and never expire.
          </Text>
        </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pack: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg,
    backgroundColor: colors.card, paddingVertical: 16, paddingHorizontal: 16,
  },
  packActive: { borderColor: colors.gold, backgroundColor: 'rgba(205,163,73,0.10)' },
  badge: {
    backgroundColor: colors.goldSoft, borderRadius: radius.pill,
    paddingVertical: 3, paddingHorizontal: 9,
  },
});
