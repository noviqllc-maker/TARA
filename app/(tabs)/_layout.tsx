// app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { colors, fonts } from '@/theme';

function Icon({ name, color }: { name: string; color: string }) {
  const p: any = { fill: 'none', stroke: color, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'home':
      return <Svg width={22} height={22} viewBox="0 0 24 24"><Path {...p} d="M3 11l9-8 9 8M5 10v10h14V10" /></Svg>;
    case 'chart':
      return <Svg width={22} height={22} viewBox="0 0 24 24"><Circle {...p} cx="12" cy="12" r="9" /><Line {...p} x1="12" y1="3" x2="12" y2="21" /><Line {...p} x1="3" y1="12" x2="21" y2="12" /><Line {...p} x1="5.6" y1="5.6" x2="18.4" y2="18.4" /><Line {...p} x1="18.4" y1="5.6" x2="5.6" y2="18.4" /></Svg>;
    case 'tara':
      return <Svg width={22} height={22} viewBox="0 0 24 24"><Path {...p} d="M12 2l2.4 7.6H22l-6 4.6 2.3 7.8L12 17l-6.3 5 2.3-7.8-6-4.6h7.6z" /></Svg>;
    case 'insights':
      return <Svg width={22} height={22} viewBox="0 0 24 24"><Path {...p} d="M3 12h4l2-7 4 16 2-9h6" /></Svg>;
    case 'profile':
      return <Svg width={22} height={22} viewBox="0 0 24 24"><Circle {...p} cx="12" cy="8" r="4" /><Path {...p} d="M4 21c0-4 4-6 8-6s8 2 8 6" /></Svg>;
    default:
      return null;
  }
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: styles.bar,
        tabBarBackground: () => (
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        ),
        tabBarLabelStyle: { fontFamily: fonts.sansMed, fontSize: 9.5, letterSpacing: 0.4 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Today', tabBarIcon: ({ color }) => <Icon name="home" color={color} /> }} />
      <Tabs.Screen name="chart" options={{ title: 'Chart', tabBarIcon: ({ color }) => <Icon name="chart" color={color} /> }} />
      <Tabs.Screen name="tara" options={{ title: 'Tara AI', tabBarIcon: ({ color }) => <Icon name="tara" color={color} /> }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights', tabBarIcon: ({ color }) => <Icon name="insights" color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <Icon name="profile" color={color} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    borderTopColor: colors.line,
    borderTopWidth: 1,
    backgroundColor: 'rgba(12,8,18,0.6)',
    height: 64,
    paddingTop: 6,
    paddingBottom: 8,
  },
});
