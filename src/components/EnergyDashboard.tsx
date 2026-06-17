// src/components/EnergyDashboard.tsx
import React from 'react';
import { View, ScrollView } from 'react-native';
import Ring from './Ring';
import { Text } from './ui';
import { todayEnergy, EnergyDomain } from '@/data/mock';
import { domainColors, colors } from '@/theme';

export default function EnergyDashboard() {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingVertical: 4 }}>
      {todayEnergy.map((d: EnergyDomain) => (
        <View key={d.key} style={{ alignItems: 'center', gap: 6 }}>
          <Ring value={d.score} size={74} stroke={6} color={domainColors[d.key]} />
          <Text variant="tiny" color={colors.cream} style={{ fontSize: 11 }}>{d.key}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
