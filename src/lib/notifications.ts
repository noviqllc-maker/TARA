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
import { powerHours } from '@/lib/panchanga';
import { pickNotification, pickMidday, pickMiddayArea, pickEvening, NotificationContext } from '@/data/notificationLines';
import { loadEvening } from '@/lib/practice';
import { computeDailyEnergy } from '@/lib/energy';
import { mockMetrics } from '@/lib/health';
import { EnergyDomain } from '@/data/mock';

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

// Preference-weighted afternoon: each onboarding priority maps to the daily-energy domain that
// scores its "chart support" today, and to the midday copy pool that voices it. The afternoon
// leads with a preference ONLY when its domain scores at/above PREF_THRESHOLD; else it stays a
// plain timing-window line. This keeps the chart in charge (astrology gates the preference).
const PREF_DOMAIN: Record<string, EnergyDomain['key']> = {
  career: 'Career', business: 'Career', money: 'Career',
  love: 'Relationships', family: 'Relationships',
  health: 'Body', purpose: 'Spiritual', learning: 'Mind',
};
const PREF_AREA: Record<string, string> = {
  career: 'career', business: 'career', money: 'money',
  love: 'love', family: 'love', health: 'health', purpose: 'purpose', learning: 'learning',
};
const PREF_THRESHOLD = 55;

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

// ---- recent-body no-repeat history (cross-day, cross-slot) ---------------------
// We persist the recent window of bodies that have already fired, plus the still-pending
// schedule (so the next refresh can roll fired entries into the window). Choosing new bodies
// avoids everything in the window, so no body repeats within the last RECENT_WINDOW pushes.
const RECENT_KEY = 'tara.notif.recentBodies.v1';
const RECENT_WINDOW = 6;
type NotifHistory = { recent: string[]; scheduled: { t: number; body: string }[] };

async function loadNotifHistory(): Promise<NotifHistory> {
  try {
    const v = await AsyncStorage.getItem(RECENT_KEY);
    if (!v) return { recent: [], scheduled: [] };
    const p = JSON.parse(v);
    return { recent: Array.isArray(p?.recent) ? p.recent : [], scheduled: Array.isArray(p?.scheduled) ? p.scheduled : [] };
  } catch { return { recent: [], scheduled: [] }; }
}
async function saveNotifHistory(h: NotifHistory): Promise<void> {
  try { await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(h)); } catch {}
}

// Cancel and RE-SCHEDULE (not top-up) the next few days across the ENABLED slots (8 AM
// briefing, 12 PM timing, 6 PM reflection). Because it cancels all pending and rebuilds from
// source, copy/logic fixes propagate the same day (delivered notifications in the OS center
// can't be edited and age out on their own). Jobs are scheduled in FIRE ORDER, and every body
// is checked against the recent-6 window so nothing repeats across slots or days. Titles are
// locked to their body's category (a shift body can only carry the Planetary Shift title).
// Returns false (no-op) when permission isn't granted.
export async function refreshDailyNotifications(chart: BirthChart | null, birthDate = '', preferences: string[] = []): Promise<boolean> {
  if (!(await Notifications.getPermissionsAsync()).granted) return false;
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Today's per-domain energy for a given fire date (chart-derived, deterministic; uses the
  // neutral health fallback so it matches what a non-Apple-Health user sees). Cached per day.
  const domainCache = new Map<string, Record<string, number>>();
  const domainScoresFor = (d: Date): Record<string, number> => {
    if (!chart) return {};
    const k = ymd(d);
    const hit = domainCache.get(k);
    if (hit) return hit;
    let scores: Record<string, number> = {};
    try {
      const e = computeDailyEnergy({ chart, health: mockMetrics(), transits: computeTransits(d, chart), date: d });
      scores = Object.fromEntries(e.domains.map((x) => [x.key, x.score]));
    } catch {}
    domainCache.set(k, scores);
    return scores;
  };

  const slots = await getNotifSlots();
  const uid = await seedUser();
  const now = new Date();
  // Local practice state — makes the 6 PM evening slot streak-aware (recomputed here on the
  // daily refresh AND on every app foreground, since NotificationRefresher calls this on
  // AppState 'active'; the evening screen also calls it right after a ritual completes).
  const eve = await loadEvening();

  // Roll any previously-scheduled bodies whose fire time has passed into the recent window
  // (they've been delivered), then avoid every body in that window when picking new ones.
  const hist = await loadNotifHistory();
  const fired = hist.scheduled.filter((s) => s.t <= now.getTime()).sort((a, b) => a.t - b.t).map((s) => s.body);
  const recent = [...hist.recent, ...fired].slice(-RECENT_WINDOW);
  const used = new Set<string>(recent);

  // Collect every (slot, day) job, then order by fire time so the no-repeat window tracks the
  // sequence the user actually receives.
  type Job = { key: keyof NotifSlots; i: number; fireDate: Date; firstIsToday: boolean };
  const jobs: Job[] = [];
  for (const { key, hour } of SLOT_DEFS) {
    if (!slots[key]) continue;
    let first = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0, 0);
    if (first.getTime() <= now.getTime()) first = new Date(first.getTime() + MS_DAY); // slot hour passed → start tomorrow
    const firstIsToday = first.getFullYear() === now.getFullYear() && first.getMonth() === now.getMonth() && first.getDate() === now.getDate();
    for (let i = 0; i < DAYS_AHEAD; i++) jobs.push({ key, i, fireDate: new Date(first.getTime() + i * MS_DAY), firstIsToday });
  }
  jobs.sort((a, b) => a.fireDate.getTime() - b.fireDate.getTime());

  const prevTitleBySlot: Partial<Record<string, string>> = {};
  const scheduled: { t: number; body: string }[] = [];

  for (const job of jobs) {
    const seed = `${uid}:${ymd(job.fireDate)}:${job.key}`;
    let pick;
    if (job.key === 'morning') {
      pick = pickNotification(buildNotificationContext(chart, birthDate, job.fireDate), seed, prevTitleBySlot.morning, used);
      prevTitleBySlot.morning = pick.title;
    } else if (job.key === 'midday') {
      // Chart-derived timing: the day-lord horā window (e.g. "1 PM") headlines the midday pool.
      const p = powerHours(job.fireDate);
      const powerStart = p.window.split(/\s*[–-]\s*/)[0].trim(); // "1 PM – 2 PM" → "1 PM"
      // Preference-weighted afternoon: lead with the user's best-supported area today (>= the
      // energy threshold); otherwise keep the plain timing-window line. The chart decides.
      let areaPick = null as ReturnType<typeof pickMiddayArea> | null;
      if (chart && preferences.length) {
        const scores = domainScoresFor(job.fireDate);
        const top = preferences
          .map((pref) => ({ area: PREF_AREA[pref], score: scores[PREF_DOMAIN[pref]] ?? 0 }))
          .filter((r) => r.area)
          .sort((a, b) => b.score - a.score)
          .find((r) => r.score >= PREF_THRESHOLD);
        if (top) areaPick = pickMiddayArea(seed, top.area, used);
      }
      pick = areaPick ?? pickMidday(seed, { powerStart, dayLord: p.lord }, used);
    } else {
      pick = pickEvening(seed, { streak: eve.streak, doneToday: job.i === 0 && job.firstIsToday && eve.doneToday }, used);
    }
    used.add(pick.body);
    scheduled.push({ t: job.fireDate.getTime(), body: pick.body });
    const route = job.key === 'evening' ? EVENING_ROUTE : DAILY_ROUTE;
    await Notifications.scheduleNotificationAsync({
      identifier: `tara-${job.key}-${job.i}`,
      content: { title: pick.title, body: pick.body, data: { route } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: job.fireDate },
    });
  }

  await saveNotifHistory({ recent, scheduled });
  return true;
}

// Request permission and schedule (used by the primer + the settings toggle).
export async function enableDailyNotifications(chart: BirthChart | null, birthDate = '', preferences: string[] = []): Promise<boolean> {
  if (!(await requestNotificationPermission())) return false;
  return refreshDailyNotifications(chart, birthDate, preferences);
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
