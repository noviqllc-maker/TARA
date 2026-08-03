// src/lib/notifications.ts
// Daily local notification at 8:00 AM device-local time. Titles rotate by content
// category (general / planetary / career / love / money / fallback) and never repeat two
// days running; titles + bodies are chosen per day by the astro engine, seeded by
// (user id + date) — see @/data/notificationLines. Local notifications only (no push/APNs);
// we schedule the next 3 days as explicit dated notifications and refresh on every app open.
//
// Each notification carries a `data.route` deep-link, read on tap in app/_layout.tsx.
//
// NOTE: expo-notifications is a NATIVE module — after installing it the app must be
// rebuilt with `npx expo run:ios`; a JS-only reload won't pick it up.
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { BirthChart, computeTransitFactor, computeAllTransits } from '@/lib/vedic';
import { computeTransits } from '@/lib/transits';
import { pickNotification, pickMidday, pickEvening, NotificationContext } from '@/data/notificationLines';
import { loadEvening } from '@/lib/practice';

export type NotifRoute = '/(tabs)/home' | '/(tabs)/tara' | '/practice/evening';

const DAILY_ROUTE: NotifRoute = '/(tabs)/home';
// The 6 PM slot ("Evening Reflection") deep-links into the Evening Ritual. There is no
// premium-specific notification variant (all three slots are uniform for every user), so
// this route change applies cleanly to everyone.
const EVENING_ROUTE: NotifRoute = '/practice/evening';
const DAYS_AHEAD = 3;
const PRIMER_SEEN_KEY = 'tara.notif.primerSeen.v1';
const SLOTS_KEY = 'tara.notif.slots.v1';
const MS_DAY = 86_400_000;

// Three daily slots at fixed local hours.
export type NotifSlots = { morning: boolean; midday: boolean; evening: boolean };
const DEFAULT_SLOTS: NotifSlots = { morning: true, midday: true, evening: true };
const SLOT_DEFS: { key: keyof NotifSlots; hour: number }[] = [
  { key: 'morning', hour: 8 },
  { key: 'midday', hour: 12 },
  { key: 'evening', hour: 18 },
];

export async function getNotifSlots(): Promise<NotifSlots> {
  try { const v = await AsyncStorage.getItem(SLOTS_KEY); return v ? { ...DEFAULT_SLOTS, ...JSON.parse(v) } : { ...DEFAULT_SLOTS }; }
  catch { return { ...DEFAULT_SLOTS }; }
}
export async function setNotifSlots(slots: NotifSlots): Promise<void> {
  try { await AsyncStorage.setItem(SLOTS_KEY, JSON.stringify(slots)); } catch {}
}
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
  chart: BirthChart | null, birthDate: string, date: Date,
): NotificationContext {
  const ctx: NotificationContext = { date };
  if (birthDate) ctx.solarReturnWeek = isSolarReturnWeek(birthDate, date);
  if (!chart) return ctx; // general-only when there's no chart yet

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
  try {
    // Mercury retrograde today (confirmed) — gates the "Mercury is slowing things down" line.
    ctx.mercuryRetro = computeAllTransits(chart, date).some((p) => p.name === 'Mercury' && p.retrograde);
  } catch {}
  return ctx;
}

// ---- scheduling ---------------------------------------------------------------
const ymd = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

// Stable per-user seed component so rotation differs across users (and stays deterministic
// per day). Reading the session is a local lookup — no auth logic is changed here.
async function seedUser(): Promise<string> {
  try { const { data } = await supabase.auth.getSession(); return data.session?.user?.id || 'anon'; }
  catch { return 'anon'; }
}

// Cancel and re-schedule the next few days across the ENABLED slots (8 AM briefing,
// 12 PM timing, 6 PM reflection). Morning uses the category-rotating engine line (titles
// never repeat two days running); midday/evening use their own disjoint pools, so no line
// repeats across slots in a day. Returns false (no-op) when permission isn't granted.
export async function refreshDailyNotifications(chart: BirthChart | null, birthDate = ''): Promise<boolean> {
  if (!(await Notifications.getPermissionsAsync()).granted) return false;
  await Notifications.cancelAllScheduledNotificationsAsync();

  const slots = await getNotifSlots();
  const uid = await seedUser();
  const now = new Date();
  // Local practice state — makes the 6 PM evening slot streak-aware (recomputed here on the
  // daily refresh AND on every app foreground, since NotificationRefresher calls this on
  // AppState 'active'; the evening screen also calls it right after a ritual completes).
  const eve = await loadEvening();

  for (const { key, hour } of SLOT_DEFS) {
    if (!slots[key]) continue;
    let first = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0, 0);
    if (first.getTime() <= now.getTime()) first = new Date(first.getTime() + MS_DAY); // slot hour passed → start tomorrow
    // Whether the nearest fire (i=0) lands TODAY — the only day "done today" can apply to.
    const firstIsToday = first.getFullYear() === now.getFullYear() && first.getMonth() === now.getMonth() && first.getDate() === now.getDate();

    let prevTitle: string | undefined;
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const fireDate = new Date(first.getTime() + i * MS_DAY);
      const seed = `${uid}:${ymd(fireDate)}:${key}`;
      let pick;
      if (key === 'morning') {
        pick = pickNotification(buildNotificationContext(chart, birthDate, fireDate), seed, prevTitle);
      } else if (key === 'midday') {
        pick = pickMidday(seed);
      } else {
        pick = pickEvening(seed, { streak: eve.streak, doneToday: i === 0 && firstIsToday && eve.doneToday });
      }
      prevTitle = pick.title;
      const route = key === 'evening' ? EVENING_ROUTE : DAILY_ROUTE;
      await Notifications.scheduleNotificationAsync({
        identifier: `tara-${key}-${i}`,
        content: { title: pick.title, body: pick.body, data: { route } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
      });
    }
  }
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
