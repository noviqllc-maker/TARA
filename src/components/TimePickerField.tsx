// src/components/TimePickerField.tsx
// A tap-to-open time field. The iOS spinner is rendered inside a Modal (an overlay OUTSIDE
// any ScrollView), which fixes the gesture conflict that froze the wheels when the picker was
// inline in a scrolling screen. Android uses its native time dialog directly (already an
// overlay, so no conflict). Cancel discards; Done commits (real cancel semantics via a draft).
import React, { useState } from 'react';
import { View, Pressable, Modal, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Text } from '@/components/ui';
import { colors, radius } from '@/theme';

function label(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}

export default function TimePickerField({
  value, onChange, title = 'Birth Time',
}: { value: Date; onChange: (d: Date) => void; title?: string }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const openPicker = () => { setDraft(value); setOpen(true); };

  return (
    <>
      <Pressable onPress={openPicker} style={styles.chip} accessibilityRole="button" accessibilityLabel={`${title}: ${label(value)}`}>
        <Text variant="serif" style={{ fontSize: 22 }}>{label(value)}</Text>
      </Pressable>

      {/* Android: the native time dialog (already an overlay; no ScrollView conflict). */}
      {open && Platform.OS === 'android' && (
        <DateTimePicker
          value={value}
          mode="time"
          display="clock"
          onChange={(e, d) => { setOpen(false); if (e.type === 'set' && d) onChange(d); }}
        />
      )}

      {/* iOS: spinner inside a bottom-sheet Modal, outside the scroll surface. The backdrop
          Pressable sits BEHIND the sheet (absolute fill); the sheet is a plain View so nothing
          wraps the spinner and steals its pan gesture (that froze the wheels before). */}
      {Platform.OS === 'ios' && (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <View style={styles.backdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Dismiss" />
            <View style={styles.sheet}>
              <View style={styles.header}>
                <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                  <Text variant="tiny" color={colors.muted} style={{ fontSize: 15 }}>Cancel</Text>
                </Pressable>
                <Text variant="tiny" color={colors.cream} style={{ fontSize: 15, fontWeight: '600' }}>{title}</Text>
                <Pressable onPress={() => { onChange(draft); setOpen(false); }} hitSlop={10}>
                  <Text variant="tiny" color={colors.gold} style={{ fontSize: 15, fontWeight: '600' }}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={draft}
                mode="time"
                display="spinner"
                themeVariant="dark"
                textColor={colors.cream}
                onChange={(_, d) => { if (d) setDraft(d); }}
                style={{ alignSelf: 'stretch' }}
              />
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderColor: colors.line, borderWidth: 1,
    borderRadius: radius.md, paddingVertical: 14, alignItems: 'center',
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 24 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 14, borderBottomColor: colors.line, borderBottomWidth: 1,
  },
});
