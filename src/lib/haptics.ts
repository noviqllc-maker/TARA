// src/lib/haptics.ts
// Thin, safe wrapper over expo-haptics (a core Expo module, available in Expo Go and dev
// builds). Every call is guarded so a missing native module or an unsupported platform
// simply no-ops — the japa counter never depends on haptics succeeding.
import * as Haptics from 'expo-haptics';

export function tick(): void {
  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch { /* no-op */ }
}

export function completion(): void {
  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch { /* no-op */ }
}
