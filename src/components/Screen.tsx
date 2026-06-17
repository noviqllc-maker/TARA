// src/components/Screen.tsx
import React from 'react';
import { ScrollView, View, StyleSheet, ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CosmicBackground from './CosmicBackground';
import { spacing } from '@/theme';

export default function Screen({
  children, scroll = true, intense = false, contentStyle, ...rest
}: ScrollViewProps & { scroll?: boolean; intense?: boolean; contentStyle?: any }) {
  const insets = useSafeAreaInsets();
  const Inner = (
    <View style={[{ paddingTop: insets.top + 8, paddingHorizontal: spacing.xl }, contentStyle]}>
      {children}
    </View>
  );
  return (
    <View style={styles.root}>
      <CosmicBackground intense={intense} />
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          {...rest}
        >
          {Inner}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{Inner}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
