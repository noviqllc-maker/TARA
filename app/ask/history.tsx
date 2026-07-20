// app/ask/history.tsx — Past Ask Tara questions (server-side, survives reinstall).
import React, { useEffect, useState } from 'react';
import { View, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import Screen from '@/components/Screen';
import SubHeader from '@/components/SubHeader';
import { Text, Card } from '@/components/ui';
import { fetchHistory, HistoryEntry } from '@/lib/history';
import { colors, fonts } from '@/theme';

function fmtDate(iso?: string): string {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return ''; }
}

export default function History() {
  const [items, setItems] = useState<HistoryEntry[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { fetchHistory().then(setItems).catch(() => setItems([])); }, []);

  return (
    <Screen>
      <SubHeader eyebrow="Ask Tara" title="My Cosmic Journal" />

      {items === null ? (
        <View style={{ paddingTop: 48, alignItems: 'center' }}>
          <ActivityIndicator color={colors.gold} />
        </View>
      ) : items.length === 0 ? (
        <Card>
          <Text variant="tiny" color={colors.muted} style={{ lineHeight: 18 }}>
            Your Cosmic Journal fills as you ask Tara — every question and answer, kept here and carried with your account across devices.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: 10 }}>
          {items.map((it, i) => {
            const key = it.id ?? String(i);
            const open = expanded === key;
            return (
              <Pressable key={key} onPress={() => setExpanded(open ? null : key)}>
                <Card>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                    <Text variant="serif" style={{ fontSize: 15, flex: 1, lineHeight: 21 }} numberOfLines={open ? undefined : 2}>
                      {it.question}
                    </Text>
                    <Text variant="tiny" color={colors.mutedDim} style={{ fontSize: 10.5 }}>{fmtDate(it.created_at)}</Text>
                  </View>

                  {open ? (
                    <>
                      {it.factor ? <Text style={styles.factor}>{it.factor}</Text> : null}
                      <Text variant="body" color={colors.cream} style={styles.answer}>{it.answer}</Text>
                    </>
                  ) : (
                    <Text variant="tiny" color={colors.muted} style={{ marginTop: 6 }} numberOfLines={1}>
                      {it.answer}
                    </Text>
                  )}
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  factor: { fontFamily: fonts.sansSemi, color: colors.gold, fontSize: 11, letterSpacing: 0.6, marginTop: 10 },
  answer: { fontSize: 14.5, lineHeight: 22, marginTop: 8 },
});
