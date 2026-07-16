// app/insights/journal.tsx
import React, { useEffect, useState } from 'react';
import { View, Pressable, StyleSheet, TextInput } from 'react-native';
import Slider from '@/components/Slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Screen from '@/components/Screen';
import { Text, Card, Eyebrow, GoldButton } from '@/components/ui';
import SubHeader from '@/components/SubHeader';
import Disclaimer from '@/components/Disclaimer';
import { colors, fonts, radius, spacing } from '@/theme';

const MOODS = [['😄', 'Joyful'], ['🙂', 'Content'], ['😐', 'Neutral'], ['😔', 'Low'], ['😣', 'Stressed'], ['😴', 'Drained']];
const REPLAY = ['Accurate', 'Somewhat Accurate', 'Not Accurate'];
const KEY = 'tara.journal.v1';

export default function Journal() {
  const [emoji, setEmoji] = useState('');
  const [energy, setEnergy] = useState(5);
  const [stress, setStress] = useState(5);
  const [notes, setNotes] = useState('');
  const [replay, setReplay] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (v) { const d = JSON.parse(v); setEmoji(d.emoji || ''); setEnergy(d.energy ?? 5); setStress(d.stress ?? 5); setNotes(d.notes || ''); }
    });
  }, []);

  const save = () => {
    AsyncStorage.setItem(KEY, JSON.stringify({ emoji, energy, stress, notes, date: new Date().toISOString() }));
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <Screen>
      <SubHeader eyebrow="Mood Journal" title="Daily Check-in" />

      <Card style={{ marginBottom: spacing.lg }}>
        <Eyebrow>Mood</Eyebrow>
        <View style={styles.moods}>
          {MOODS.map(([e]) => {
            const on = emoji === e;
            return (
              <Pressable key={e} onPress={() => setEmoji(e)} hitSlop={4} style={[styles.mood, on && styles.moodOn]}>
                <Text style={{ fontSize: 26 }}>{e}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
        <View style={styles.sliderHead}>
          <Eyebrow>Energy Level</Eyebrow>
          <Text style={{ fontFamily: fonts.serif, fontWeight: '600', color: colors.gold }}>{energy}/10</Text>
        </View>
        <Slider value={energy} onChange={setEnergy} color={colors.gold} />
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
        <View style={styles.sliderHead}>
          <Eyebrow>Stress Level</Eyebrow>
          <Text style={{ fontFamily: fonts.serif, fontWeight: '600', color: colors.rose }}>{stress}/10</Text>
        </View>
        <Slider value={stress} onChange={setStress} color={colors.rose} />
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
        <Eyebrow>Journal Entry</Eyebrow>
        <TextInput
          value={notes} onChangeText={setNotes} multiline placeholder="What's on your mind…"
          placeholderTextColor={colors.muted} style={styles.notes}
        />
      </Card>

      <GoldButton label={saved ? '✓ Saved' : 'Save Entry'} onPress={save} />

      {/* Cosmic Replay */}
      <Card solid style={{ marginTop: spacing.xxl }}>
        <Eyebrow color={colors.lav}>Cosmic Replay</Eyebrow>
        <Text variant="serif" style={{ fontSize: 16, marginTop: 8 }}>How accurate was Tara today?</Text>
        <View style={styles.replay}>
          {REPLAY.map((r) => (
            <Pressable key={r} onPress={() => setReplay(r)} style={[styles.replayBtn, replay === r && styles.replayOn]}>
              <Text variant="tiny" color={replay === r ? '#1a1018' : colors.cream}>{r}</Text>
            </Pressable>
          ))}
        </View>
        {replay ? <Text variant="tiny" style={{ marginTop: 10 }}>Thank you — Tara learns from this to personalize tomorrow.</Text> : null}
      </Card>

      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  moods: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  // 46x46 tap target (>=44); circular gold ring/pill + scale on select, dim when not.
  mood: {
    width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'transparent', opacity: 0.55,
  },
  moodOn: {
    borderColor: colors.gold, backgroundColor: 'rgba(205,163,73,0.14)',
    opacity: 1, transform: [{ scale: 1.08 }],
  },
  sliderHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notes: {
    marginTop: 12, minHeight: 120, textAlignVertical: 'top', color: colors.cream,
    fontFamily: fonts.sans, fontSize: 15, lineHeight: 22,
    backgroundColor: 'rgba(255,255,255,0.04)', borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, padding: 16,
  },
  replay: { flexDirection: 'row', gap: 8, marginTop: 12 },
  replayBtn: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line },
  replayOn: { backgroundColor: colors.goldSoft, borderColor: colors.goldSoft },
});
