// src/components/Disclaimer.tsx
import React from 'react';
import { View } from 'react-native';
import { Text } from './ui';
import { colors } from '@/theme';

export default function Disclaimer() {
  return (
    <View style={{ marginTop: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line }}>
      <Text variant="tiny" color={colors.mutedDim} style={{ textAlign: 'center', fontSize: 10, lineHeight: 15 }}>
        Tara provides astrology and wellness insights for reflection and lifestyle support.
        It does not provide medical advice, diagnosis, or treatment.
      </Text>
    </View>
  );
}
