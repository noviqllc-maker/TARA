// src/components/Screen.tsx
import React, { forwardRef } from 'react';
import { ScrollView, View, StyleSheet, ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CosmicBackground from './CosmicBackground';
import { spacing } from '@/theme';

const Screen = forwardRef<ScrollView, ScrollViewProps & { scroll?: boolean; intense?: boolean; contentStyle?: any }>(
  function Screen({ children, scroll = true, intense = false, contentStyle, ...rest }, ref) {
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
          ref={ref}
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
});

export default Screen;

const styles = StyleSheet.create({ root: { flex: 1 } });
