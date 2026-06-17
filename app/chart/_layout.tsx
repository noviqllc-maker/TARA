// app/chart/_layout.tsx
import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function ChartLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.black }, animation: 'slide_from_right' }} />;
}
