// src/components/TimeTextInput.tsx
// Manual HH:MM birth-time entry (24-hour), matching the onboarding date fields: digit-only,
// auto-advance from hours to minutes, clamp to 00-23 / 00-59, pad on blur. A drop-in for the
// same value/onChange interface as the old picker, so it never freezes and has no ceiling.
import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Text } from '@/components/ui';
import { colors, fonts, radius } from '@/theme';

const pad = (n: number) => String(n).padStart(2, '0');
const twoDigits = (t: string) => t.replace(/[^0-9]/g, '').slice(0, 2);

export default function TimeTextInput({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const [hh, setHh] = useState(pad(value.getHours()));
  const [mm, setMm] = useState(pad(value.getMinutes()));
  const mmRef = useRef<TextInput>(null);

  const commit = (h: string, m: string) => {
    const H = Math.min(23, parseInt(h || '0', 10) || 0);
    const M = Math.min(59, parseInt(m || '0', 10) || 0);
    const d = new Date(value);
    d.setHours(H, M, 0, 0);
    onChange(d);
  };
  const onHh = (t: string) => { const v = twoDigits(t); setHh(v); commit(v, mm); if (v.length === 2) mmRef.current?.focus(); };
  const onMm = (t: string) => { const v = twoDigits(t); setMm(v); commit(hh, v); };

  return (
    <View style={{ gap: 8, marginVertical: 2 }}>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="HH" placeholderTextColor={colors.mutedDim}
          keyboardType="number-pad" maxLength={2}
          value={hh} onChangeText={onHh}
          onBlur={() => setHh(pad(Math.min(23, parseInt(hh || '0', 10) || 0)))}
          accessibilityLabel="Hour, 00 to 23"
        />
        <Text style={styles.sep}>:</Text>
        <TextInput
          ref={mmRef}
          style={styles.input}
          placeholder="MM" placeholderTextColor={colors.mutedDim}
          keyboardType="number-pad" maxLength={2}
          value={mm} onChangeText={onMm}
          onBlur={() => setMm(pad(Math.min(59, parseInt(mm || '0', 10) || 0)))}
          accessibilityLabel="Minute, 00 to 59"
        />
      </View>
      <Text variant="tiny" color={colors.muted} style={styles.hint}>Enter time in 24-hour format (00:00 to 23:59)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  input: {
    width: 64, borderRadius: radius.md, borderColor: colors.line, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)', color: colors.cream, fontFamily: fonts.sans,
    paddingVertical: 12, fontSize: 22, fontWeight: '600', textAlign: 'center',
  },
  sep: { fontSize: 24, color: colors.goldSoft, fontWeight: '600' },
  hint: { fontSize: 11.5, textAlign: 'center' },
});
