// src/lib/notifications.ts
// Daily Vedic-hour reminders + the deep-link routing they carry.
//
// Each scheduled notification embeds a `data.route` payload naming the screen to
// open when tapped. Both tap paths (warm via a response listener, cold via
// getLastNotificationResponseAsync) read that same payload — see app/_layout.tsx.
//
// NOTE: expo-notifications is a NATIVE module. After installing it the app must be
// rebuilt with `npx expo run:ios` — a JS-only reload will not pick it up.
import * as Notifications from 'expo-notifications';

export type NotifRoute = '/(tabs)/home' | '/(tabs)/tara';

// Show banners even when the app is in the foreground (otherwise iOS suppresses them).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// The three daily muhurta reminders. `route` is the deep-link target on tap.
type DailyNotif = {
  id: string; hour: number; minute: number;
  title: string; body: string; route: NotifRoute;
};
const DAILY: DailyNotif[] = [
  {
    id: 'tara-brahma', hour: 5, minute: 0,
    title: 'Brahma Muhurta ✦',
    body: 'The most sacred hour has begun. Set your intention for the day.',
    route: '/(tabs)/home',
  },
  {
    id: 'tara-abhijit', hour: 12, minute: 0,
    title: 'Abhijit Muhurta ✦',
    body: 'The victory hour — ask Tara what to focus on now.',
    route: '/(tabs)/tara',
  },
  {
    id: 'tara-sandhya', hour: 18, minute: 0,
    title: 'Sandhya ✦',
    body: 'Dusk reflection. See how your day’s energy has settled.',
    route: '/(tabs)/home',
  },
];

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

// Schedule (or re-schedule) all three daily reminders. Clears any existing ones
// first so toggling on/off and re-enabling never double-schedules.
export async function scheduleDailyNotifications(): Promise<boolean> {
  const ok = await requestNotificationPermission();
  if (!ok) return false;
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const n of DAILY) {
    await Notifications.scheduleNotificationAsync({
      identifier: n.id,
      content: { title: n.title, body: n.body, data: { route: n.route } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: n.hour,
        minute: n.minute,
      },
    });
  }
  return true;
}

export async function cancelDailyNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function hasScheduledNotifications(): Promise<boolean> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.length > 0;
}

// Extract the deep-link target from a notification response (or null if none / no route).
export function routeFromResponse(response: Notifications.NotificationResponse | null): string | null {
  const route = response?.notification.request.content.data?.route;
  return typeof route === 'string' ? route : null;
}
