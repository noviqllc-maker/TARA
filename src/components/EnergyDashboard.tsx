// src/components/EnergyDashboard.tsx
import React from 'react';
import { View, ScrollView } from 'react-native';
import Ring from './Ring';
import { Text } from './ui';
import { todayEnergy, EnergyDomain } from '@/data/mock';
import { domainColors, colors } from '@/theme';

export default function EnergyDashboard({
  domains = todayEnergy,
  vedicDomains = [],
}: { domains?: EnergyDomain[]; vedicDomains?: string[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingVertical: 4 }}>
      {domains.map((d: EnergyDomain) => {
        // Vedic-only domains (e.g. Body before Apple Health is connected) get a
        // subtle gold ✦ so they read as a chart estimate, not a biometric reading.
        const vedicOnly = vedicDomains.includes(d.key);
        return (
          <View key={d.key} style={{ alignItems: 'center', gap: 6 }}>
            <Ring value={d.score} size={74} stroke={6} color={domainColors[d.key]} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              {vedicOnly && <Text variant="tiny" color={colors.gold} style={{ fontSize: 9 }}>✦</Text>}
              <Text variant="tiny" color={colors.cream} style={{ fontSize: 11 }}>{d.key}</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
