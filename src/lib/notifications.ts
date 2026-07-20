// src/lib/notifications.ts
// Daily local notification — "Your day at a glance" at 8:00 AM device-local time.
// Local notifications only (no push/APNs). Bodies are chosen per day by the astro
// engine (see @/data/notificationLines); we schedule the next 3 days as explicit
// dated notifications and refresh them on every app open so bodies stay current.
//
// Each notification carries a `data.route` deep-link, read on tap in app/_layout.tsx.
//
// NOTE: expo-notifications is a NATIVE module — after installing it the app must be
// rebuilt with `npx expo run:ios`; a JS-only reload won't pick it up.
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BirthChart, computeTransitFactor } from '@/lib/vedic';
import { computeTransits } from '@/lib/transits';
import { getNotificationLine, isStaticLine, NotificationContext } from '@/data/notificationLines';

export type NotifRoute = '/(tabs)/home' | '/(tabs)/tara';

const DAILY_TITLE = 'Your day at a glance';
const DAILY_ROUTE: NotifRoute = '/(tabs)/home';
const DAILY_HOUR = 8; // 8:00 AM local
const DAYS_AHEAD = 3;
const RECENT_KEY = 'tara.notif.recent.v1';       // last static bodies used (avoid repeats)
const PRIMER_SEEN_KEY = 'tara.notif.primerSeen.v1';
const MS_DAY = 86_400_000;
const SLOW_GRAHAS = ['Jupiter', 'Saturn', 'Rahu', 'Ketu', 'Mars'];

// Show banners even in the foreground (otherwise iOS suppresses them).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
  }),
});

// ---- permissions --------------------------------------------------------------
export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

export async function getNotificationStatus(): Promise<Notifications.PermissionStatus> {
  return (await Notifications.getPermissionsAsync()).status;
}

// Primer shows once, only while the OS permission is still undetermined and the user
// hasn't already answered our primer. Never re-shown once granted/denied.
export async function shouldShowNotificationPrimer(): Promise<boolean> {
  try {
    if (await AsyncStorage.getItem(PRIMER_SEEN_KEY)) return false;
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'undetermined';
  } catch { return false; }
}
export async function markNotificationPrimerSeen(): Promise<void> {
  try { await AsyncStorage.setItem(PRIMER_SEEN_KEY, '1'); } catch {}
}

// ---- per-day context from the existing Vedic engine ---------------------------
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// The 7 days up to and including the user's birthday = solar-return week.
function isSolarReturnWeek(birthDate: string, date: Date): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDate || '');
  if (!m) return false;
  const bday = new Date(date.getFullYear(), Number(m[2]) - 1, Number(m[3]));
  const diffDays = (bday.getTime() - startOfDay(date).getTime()) / MS_DAY;
  return diffDays >= 0 && diffDays <= 6;
}

// The running antardasha began this calendar month → a real, confirmed period shift.
function dashaChangesNow(chart: BirthChart, date: Date): boolean {
  const running = chart.dasha.find((d) => d.phase === 'present')?.antardashas?.find((a) => a.phase === 'present');
  const start = running?.start; // "Mon YYYY"
  if (!start) return false;
  const mm = /([A-Za-z]{3})\w*\s+(\d{4})/.exec(start);
  if (!mm) return false;
  const mo = MONTHS[mm[1].toLowerCase()];
  if (mo === undefined) return false;
  return sameMonth(new Date(Number(mm[2]), mo, 1), date);
}

export function buildNotificationContext(
  chart: BirthChart | null, birthDate: string, date: Date, recent: string[],
): NotificationContext {
  const ctx: NotificationContext = { date, recent };
  if (birthDate) ctx.solarReturnWeek = isSolarReturnWeek(birthDate, date);
  if (!chart) return ctx; // static-only when there's no chart yet

  try {
    const factor = computeTransitFactor(chart, date);
    ctx.strongestGraha = factor.transiting;
    ctx.transitOnMoon = factor.natalPlanet === 'Moon' && SLOW_GRAHAS.includes(factor.transiting);
  } catch {}
  try {
    const today = computeTransits(date, chart).moonNakshatra;
    const yesterday = computeTransits(new Date(date.getTime() - MS_DAY), chart).moonNakshatra;
    ctx.moonNakshatraChanged = !!today && !!yesterday && today !== yesterday;
  } catch {}
  try { ctx.dashaChange = dashaChangesNow(chart, date); } catch {}
  return ctx;
}

// ---- scheduling ---------------------------------------------------------------
async function getRecent(): Promise<string[]> {
  try { const v = await AsyncStorage.getItem(RECENT_KEY); return v ? JSON.parse(v) : []; } catch { return []; }
}
async function setRecent(list: string[]): Promise<void> {
  try { await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(-7))); } catch {}
}

// Cancel and re-schedule the next 3 daily 8 AM notifications with current bodies.
// Returns false (no-op) when permission isn't granted.
export async function refreshDailyNotifications(chart: BirthChart | null, birthDate = ''): Promise<boolean> {
  if (!(await Notifications.getPermissionsAsync()).granted) return false;
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();
  let first = new Date(now.getFullYear(), now.getMonth(), now.getDate(), DAILY_HOUR, 0, 0, 0);
  if (first.getTime() <= now.getTime()) first = new Date(first.getTime() + MS_DAY); // 8 AM already passed → start tomorrow

  const recent = await getRecent();
  const used: string[] = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const fireDate = new Date(first.getTime() + i * MS_DAY);
    const ctx = buildNotificationContext(chart, birthDate, fireDate, [...recent, ...used]);
    const body = getNotificationLine(ctx);
    if (isStaticLine(body)) used.push(body); // only static bodies count toward the "last 7"
    await Notifications.scheduleNotificationAsync({
      identifier: `tara-daily-${i}`,
      content: { title: DAILY_TITLE, body, data: { route: DAILY_ROUTE } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
    });
  }
  await setRecent([...recent, ...used]);
  return true;
}

// Request permission and schedule (used by the primer + the settings toggle).
export async function enableDailyNotifications(chart: BirthChart | null, birthDate = ''): Promise<boolean> {
  if (!(await requestNotificationPermission())) return false;
  return refreshDailyNotifications(chart, birthDate);
}

export async function cancelDailyNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function hasScheduledNotifications(): Promise<boolean> {
  return (await Notifications.getAllScheduledNotificationsAsync()).length > 0;
}

// Extract the deep-link target from a notification response (or null).
export function routeFromResponse(response: Notifications.NotificationResponse | null): string | null {
  const route = response?.notification.request.content.data?.route;
  return typeof route === 'string' ? route : null;
}
