// src/lib/astronomy.ts
// Location-aware solar timing for the "Today's Cosmic Events" almanac: sunrise/sunset,
// the day-lord horā (power hour), Rahukālam, and Abhijit Muhūrta. Pure JS math, no
// external libraries, no network, fully deterministic (same date + location -> same result).
//
// Sunrise/sunset use the "Almanac for Computers" (Nautical Almanac Office) algorithm,
// accurate to ~1 minute at non-polar latitudes. All returned clock strings are localized
// to the birth place via `tzOffsetMinutes` (minutes east of UTC, e.g. IST = +330) so the
// windows read in the user's own local time rather than the device's timezone. When the
// offset is omitted we fall back to device-local formatting.

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
// Official sunrise/sunset zenith: 90° + refraction (34') + solar semidiameter (16') = 90.833°.
const ZENITH = 90.833;

const norm360 = (x: number) => ((x % 360) + 360) % 360;
const norm24 = (x: number) => ((x % 24) + 24) % 24;
const two = (n: number) => (n < 10 ? `0${n}` : `${n}`);

// Format an absolute instant as "HH:MM" at the given timezone (minutes east of UTC).
// Falls back to the device's local clock when no offset is supplied.
function fmtHM(instant: Date, tzOffsetMinutes?: number): string {
  if (tzOffsetMinutes == null) return `${two(instant.getHours())}:${two(instant.getMinutes())}`;
  const shifted = new Date(instant.getTime() + tzOffsetMinutes * 60_000);
  return `${two(shifted.getUTCHours())}:${two(shifted.getUTCMinutes())}`;
}

// UT (hours, 0..24) of sunrise or sunset on Y/M/D at lat/lon (east-positive longitude).
// Returns null on polar days when the sun never rises or never sets.
function eventUT(Y: number, M: number, D: number, lat: number, lon: number, rising: boolean): number | null {
  // 1. Day of the year.
  const N1 = Math.floor((275 * M) / 9);
  const N2 = Math.floor((M + 9) / 12);
  const N3 = 1 + Math.floor((Y - 4 * Math.floor(Y / 4) + 2) / 3);
  const N = N1 - N2 * N3 + D - 30;

  // 2. Longitude as an hour value; a first approximation of the event time.
  const lngHour = lon / 15;
  const t = N + ((rising ? 6 : 18) - lngHour) / 24;

  // 3. Sun's mean anomaly.
  const Msun = 0.9856 * t - 3.289;

  // 4. Sun's true ecliptic longitude.
  let L = Msun + 1.916 * Math.sin(Msun * DEG) + 0.02 * Math.sin(2 * Msun * DEG) + 282.634;
  L = norm360(L);

  // 5. Sun's right ascension, put in the same quadrant as L, then to hours.
  let RA = norm360(Math.atan(0.91764 * Math.tan(L * DEG)) * RAD);
  const Lquad = Math.floor(L / 90) * 90;
  const RAquad = Math.floor(RA / 90) * 90;
  RA = (RA + (Lquad - RAquad)) / 15;

  // 6. Sun's declination.
  const sinDec = 0.39782 * Math.sin(L * DEG);
  const cosDec = Math.cos(Math.asin(sinDec));

  // 7. Local hour angle; out of [-1, 1] means the sun never crosses the horizon that day.
  const cosH = (Math.cos(ZENITH * DEG) - sinDec * Math.sin(lat * DEG)) / (cosDec * Math.cos(lat * DEG));
  if (cosH > 1 || cosH < -1) return null;
  const H = (rising ? 360 - Math.acos(cosH) * RAD : Math.acos(cosH) * RAD) / 15;

  // 8. Local mean time, then 9. convert to UT.
  const T = H + RA - 0.06571 * t - 6.622;
  return norm24(T - lngHour);
}

// Sunrise and sunset as absolute-instant Date objects (UTC-correct moments). Null in polar
// day/night. Callers format to a local clock via fmtHM / the higher-level helpers below.
export function getSunriseSunset(
  date: Date,
  lat: number,
  lon: number,
): { sunrise: Date | null; sunset: Date | null } {
  const Y = date.getFullYear();
  const M = date.getMonth() + 1;
  const D = date.getDate();
  const mk = (ut: number | null) => (ut == null ? null : new Date(Date.UTC(Y, M - 1, D) + ut * 3_600_000));
  const sunrise = mk(eventUT(Y, M, D, lat, lon, true));
  let sunset = mk(eventUT(Y, M, D, lat, lon, false));
  // Both events are placed on the same UTC calendar date, but at western longitudes sunset
  // occurs after 00:00 UTC (and at far-eastern ones sunrise occurs before it), which can put
  // the two instants a day out of order. Roll sunset forward so the day always has positive
  // length; this leaves the displayed HH:MM unchanged (a whole day shift) but fixes duration.
  if (sunrise && sunset && sunset.getTime() <= sunrise.getTime()) {
    sunset = new Date(sunset.getTime() + 86_400_000);
  }
  return { sunrise, sunset };
}

// The horā (planetary hour) sequence: each successive hour steps through this Chaldean
// order, and the first horā after sunrise is ruled by the day lord.
const HORA_ORDER = ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars'];

// The day-lord's horā window: daytime (sunrise -> sunset) split into 12 equal horās. The
// day lord rules horā 0 (at dawn) and again horā 7 (early afternoon); we surface the
// afternoon recurrence, which reads as a usable "power hour" rather than a dawn slot.
export function getHoraWindows(
  date: Date,
  lat: number,
  lon: number,
  dayLordPlanet: string,
  tzOffsetMinutes?: number,
): { lord: string; start: string; end: string; windowMinutes: number } | null {
  const { sunrise, sunset } = getSunriseSunset(date, lat, lon);
  if (!sunrise || !sunset) return null;
  const horaMs = (sunset.getTime() - sunrise.getTime()) / 12;
  const startIdx = Math.max(0, HORA_ORDER.indexOf(dayLordPlanet));
  const k = 7; // afternoon recurrence of the day lord's horā
  const s = new Date(sunrise.getTime() + k * horaMs);
  const e = new Date(sunrise.getTime() + (k + 1) * horaMs);
  return {
    lord: HORA_ORDER[(startIdx + k) % 7], // resolves back to dayLordPlanet
    start: fmtHM(s, tzOffsetMinutes),
    end: fmtHM(e, tzOffsetMinutes),
    windowMinutes: Math.round(horaMs / 60_000),
  };
}

// Rahukālam: the daytime is split into 8 equal parts; which part belongs to Rāhu depends
// on the weekday (0-based part index, indexed by getDay(), Sunday = 0). This is the
// traditional weekday model, not the horā/Yamaganda model. `dayLordPlanet` is accepted for
// signature symmetry with the other windows but isn't needed by this calculation.
const RAHU_SEGMENT = [7, 1, 6, 4, 5, 3, 2];
export function getRahukalam(
  date: Date,
  lat: number,
  lon: number,
  dayLordPlanet: string,
  tzOffsetMinutes?: number,
): { start: string; end: string; description: string } | null {
  const { sunrise, sunset } = getSunriseSunset(date, lat, lon);
  if (!sunrise || !sunset) return null;
  const partMs = (sunset.getTime() - sunrise.getTime()) / 8;
  const seg = RAHU_SEGMENT[date.getDay()];
  const s = new Date(sunrise.getTime() + seg * partMs);
  const e = new Date(s.getTime() + partMs);
  return {
    start: fmtHM(s, tzOffsetMinutes),
    end: fmtHM(e, tzOffsetMinutes),
    description: 'Inauspicious window for auspicious activities',
  };
}

// Abhijit Muhūrta: the ~44-minute window centered on true local solar noon. Solar noon is
// the midpoint of sunrise and sunset (this folds in the equation of time and is more
// accurate than a bare longitude/15 estimate); the muhūrta spans 22 minutes either side.
export function getAbhijitMuhurta(
  date: Date,
  lat: number,
  lon: number,
  tzOffsetMinutes?: number,
): { start: string; end: string; description: string } | null {
  const { sunrise, sunset } = getSunriseSunset(date, lat, lon);
  if (!sunrise || !sunset) return null;
  const noonMs = (sunrise.getTime() + sunset.getTime()) / 2;
  const s = new Date(noonMs - 22 * 60_000);
  const e = new Date(noonMs + 22 * 60_000);
  return {
    start: fmtHM(s, tzOffsetMinutes),
    end: fmtHM(e, tzOffsetMinutes),
    description: 'Auspicious window (Abhijit Muhūrta)',
  };
}
