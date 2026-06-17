// src/components/SubHeader.tsx
import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Text, Eyebrow } from './ui';
import { colors } from '@/theme';

export default function SubHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Pressable onPress={() => router.back()} style={{ marginBottom: 14 }}>
        <Text variant="body" color={colors.gold}>‹ Back</Text>
      </Pressable>
      <Eyebrow>{eyebrow}</Eyebrow>
      <Text variant="h1" style={{ marginTop: 8 }}>{title}</Text>
    </View>
  );
}
