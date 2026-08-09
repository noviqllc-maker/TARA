// src/components/GlossaryTooltip.tsx
// A small inline "ⓘ" that opens a plain-English explanation of a Vedic term, pulled from the
// glossary. Place it right after a term label; if the term is not in the glossary it renders
// nothing (or its children unchanged), so it is always safe to drop in.
import React, { useState } from 'react';
import { Pressable, Modal, View, Text, StyleSheet } from 'react-native';
import { getExplanation } from '@/data/glossary';
import { colors, radius } from '@/theme';

type Props = {
  term: string;              // glossary key, e.g. "mahadasha" or "graha drishti"
  children?: React.ReactNode; // optional custom trigger instead of the default ⓘ
};

// "graha_drishti" -> "Graha Drishti"
const pretty = (t: string) => t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export function GlossaryTooltip({ term, children }: Props) {
  const [visible, setVisible] = useState(false);
  const explanation = getExplanation(term);
  if (!explanation) return <>{children ?? null}</>;

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`What is ${pretty(term)}?`}
      >
        {children ?? <Text style={styles.icon}>ⓘ</Text>}
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          {/* stopPropagation: taps inside the card should not dismiss */}
          <Pressable style={styles.card} onPress={() => {}}>
            <Text style={styles.term}>{pretty(term)}</Text>
            <Text style={styles.explanation}>{explanation}</Text>
            <Pressable onPress={() => setVisible(false)} hitSlop={8} style={styles.dismissBtn}>
              <Text style={styles.dismiss}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  icon: { fontSize: 13, color: colors.goldSoft, marginLeft: 3 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', paddingHorizontal: 28 },
  card: {
    backgroundColor: '#1b1526', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line,
    padding: 20, maxWidth: 420, alignSelf: 'center', width: '100%',
  },
  term: { fontSize: 16, color: colors.gold, fontWeight: '700', marginBottom: 8 },
  explanation: { fontSize: 14, color: colors.cream, lineHeight: 21, marginBottom: 18 },
  dismissBtn: { alignSelf: 'flex-end' },
  dismiss: { fontSize: 14, color: colors.gold, fontWeight: '600' },
});
