// app/practice/sankalpa.tsx
// Sankalpa (free, deterministic, no AI). On an auspicious window (Amāvasyā / Pūrṇimā /
// Sankrānti / Ekādaśī) you may set a short intention. At the NEXT window of the same type,
// the screen invites you to revisit the last one — Reflect, Renew, or Complete. Below, a
// history of past sankalpas with their states. Register: invitation, never obligation.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Screen from '@/components/Screen';
import SubHeader from '@/components/SubHeader';
import { Text, Card, GoldButton } from '@/components/ui';
import { todayObservance, computeObservances, ObservanceKind } from '@/lib/observances';
import { loadSankalpas, addSankalpa, updateSankalpa, openSankalpaFor, Sankalpa, SankalpaState } from '@/lib/sankalpa';
import { colors, radius, spacing } from '@/theme';

const WINDOW_KINDS: ObservanceKind[] = ['amavasya', 'purnima', 'sankranti', 'ekadashi'];

const STATE_LABEL: Record<SankalpaState, string> = {
  active: 'Active', reflected: 'Reflected', renewed: 'Renewed', completed: 'Completed ✦',
};

export default function SankalpaScreen() {
  const now = useMemo(() => new Date(), []);
  const obs = useMemo(() => todayObservance(now), [now]);
  const window = obs && WINDOW_KINDS.includes(obs.kind) ? { type: obs.kind as string, label: obs.name } : null;
  const nextWindow = useMemo(
    () => (window ? null : computeObservances(now, 30).find((o) => WINDOW_KINDS.includes(o.kind)) ?? null),
    [window, now],
  );

  const [list, setList] = useState<Sankalpa[]>([]);
  const [revisit, setRevisit] = useState<Sankalpa | null>(null);
  const [text, setText] = useState('');
  const [reflectId, setReflectId] = useState<string | null>(null);
  const [reflectText, setReflectText] = useState('');

  const refresh = () => loadSankalpas().then(setList);
  useEffect(() => {
    refresh();
    if (window) openSankalpaFor(window.type).then(setRevisit);
  }, [window?.type]);

  const onSet = async () => {
    if (!window || !text.trim()) return;
    await addSankalpa(window.type, window.label, text);
    setText('');
    refresh();
  };

  const onComplete = async (id: string) => { await updateSankalpa(id, { state: 'completed' }); setRevisit((r) => (r?.id === id ? null : r)); refresh(); };
  const onRenew = async (s: Sankalpa) => {
    // Close the old one as renewed and carry its intention forward under the current window.
    await updateSankalpa(s.id, { state: 'renewed' });
    if (window) await addSankalpa(window.type, window.label, s.text);
    setRevisit(null);
    refresh();
  };
  const onReflectSave = async (id: string) => {
    await updateSankalpa(id, { state: 'reflected', reflectNote: reflectText });
    setReflectId(null); setReflectText('');
    setRevisit((r) => (r?.id === id ? null : r));
    refresh();
  };

  return (
    <Screen>
      <SubHeader eyebrow="Practice · Sankalpa" title="Sankalpa" />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Revisit the last same-type sankalpa */}
        {revisit ? (
          <Animated.View entering={FadeInDown.duration(360)}>
            <Card solid glow style={{ marginBottom: 14 }}>
              <Text variant="eyebrow" color={colors.gold}>Under the last {revisit.windowLabel}</Text>
              <Text variant="serif" style={{ fontSize: 18, lineHeight: 26, marginTop: 10 }}>“{revisit.text}”</Text>
              <Text variant="tiny" color={colors.muted} style={{ marginTop: 8 }}>How did it unfold? There's no wrong answer.</Text>
              {reflectId === revisit.id ? (
                <View style={{ marginTop: 12 }}>
                  <TextInput value={reflectText} onChangeText={setReflectText} placeholder="A short note (optional)" placeholderTextColor={colors.mutedDim} style={styles.input} multiline maxLength={280} />
                  <View style={{ marginTop: 12 }}><GoldButton label="Save reflection" onPress={() => onReflectSave(revisit.id)} /></View>
                </View>
              ) : (
                <View style={styles.actions}>
                  <Act label="Reflect" onPress={() => { setReflectId(revisit.id); setReflectText(revisit.reflectNote ?? ''); }} />
                  <Act label="Renew" onPress={() => onRenew(revisit)} />
                  <Act label="Complete ✦" gold onPress={() => onComplete(revisit.id)} />
                </View>
              )}
            </Card>
          </Animated.View>
        ) : null}

        {/* Set a new sankalpa under today's window */}
        {window ? (
          <Card style={{ marginBottom: 14 }}>
            <Text variant="eyebrow" color={colors.gold}>Set a sankalpa under {window.label}</Text>
            <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, lineHeight: 18 }}>
              An auspicious window to name a short intention: a direction, not a demand. You're invited, never obliged.
            </Text>
            <TextInput
              value={text} onChangeText={setText}
              placeholder="I intend to…" placeholderTextColor={colors.mutedDim}
              style={styles.input} multiline maxLength={280}
            />
            <View style={{ marginTop: 14 }}>
              <GoldButton label="Set sankalpa" onPress={onSet} disabled={!text.trim()} />
            </View>
          </Card>
        ) : (
          <Card style={{ marginBottom: 14 }}>
            <Text variant="eyebrow" color={colors.gold}>No open window today</Text>
            <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, lineHeight: 18 }}>
              A sankalpa is traditionally set under an auspicious window.{nextWindow ? ` The next is ${nextWindow.name}, ${nextWindow.dateLabel} (in ${nextWindow.daysAway} day${nextWindow.daysAway === 1 ? '' : 's'}).` : ''} You're welcome to return then.
            </Text>
          </Card>
        )}

        {/* History */}
        {list.length ? (
          <>
            <Text color={colors.gold} style={styles.sectionLabel}>Your sankalpas</Text>
            {list.map((s) => (
              <Card key={s.id} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text variant="tiny" color={colors.goldSoft} style={{ fontSize: 11.5 }}>{s.windowLabel}</Text>
                  <View style={[styles.badge, s.state === 'completed' && { borderColor: colors.gold }]}>
                    <Text variant="tiny" color={s.state === 'completed' ? colors.gold : colors.muted} style={{ fontSize: 9.5, letterSpacing: 0.3 }}>{STATE_LABEL[s.state]}</Text>
                  </View>
                </View>
                <Text variant="body" color={colors.cream} style={{ fontSize: 14.5, lineHeight: 22, marginTop: 8 }}>“{s.text}”</Text>
                <Text variant="tiny" color={colors.mutedDim} style={{ marginTop: 6, fontSize: 11 }}>Set {s.setDate}</Text>
                {s.reflectNote ? (
                  <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, fontSize: 12.5, lineHeight: 18, fontStyle: 'italic' }}>Reflection: {s.reflectNote}</Text>
                ) : null}
                {(s.state === 'active' || s.state === 'renewed') ? (
                  <View style={[styles.actions, { marginTop: 12 }]}>
                    <Act label="Complete ✦" gold onPress={() => onComplete(s.id)} />
                  </View>
                ) : null}
              </Card>
            ))}
          </>
        ) : (
          <Text variant="tiny" color={colors.mutedDim} style={{ textAlign: 'center', marginTop: spacing.md, fontStyle: 'italic' }}>
            Your sankalpas will gather here as you set them.
          </Text>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Act({ label, onPress, gold }: { label: string; onPress: () => void; gold?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.act, gold && { borderColor: colors.gold, backgroundColor: 'rgba(205,163,73,0.1)' }]} hitSlop={6}>
      <Text variant="tiny" color={gold ? colors.gold : colors.cream} style={{ fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  input: {
    marginTop: 14, minHeight: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 12, color: colors.cream,
    fontFamily: 'Outfit_400Regular', fontSize: 15,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  act: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14 },
  sectionLabel: { fontSize: 14, fontWeight: '500', marginTop: spacing.md, marginBottom: 12 },
  badge: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 8 },
  section: {},
});
