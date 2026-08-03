// src/lib/observances.ts
// Deterministic Vedic observance calendar (no AI, no network). Computes, for a forward
// window of days, the recurring lunar/solar markers — Ekādaśī, Pūrṇimā, Amāvasyā, and the
// monthly Sankrānti (solar ingress) — plus the handful of major festivals that are cleanly
// derivable from tithi + paksha + the Sun's sidereal sign.
//
// Everything keys off the same ephemeris the rest of the app uses (astronomy-engine +
// Lahiri ayanāṁśa). Each day is sampled once, near sunrise (~06:00 local), following the
// panchānga convention that the tithi prevailing at sunrise names the day. This is an
// approximation: sunrise is fixed rather than location-exact, and a tithi that begins and
// ends between two sunrises can be missed — fine for a 30-day informational almanac.
//
// COPY RULE: every description is INFORMATIONAL — it describes what tradition observes, it
// never instructs the reader to fast, eat, or do anything, and makes no health claims.
import * as Astronomy from 'astronomy-engine';

const norm = (x: number) => ((x % 360) + 360) % 360;

function lahiriAyanamsa(date: Date): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525.0;
  return 23.85337 + 1.396042 * T + 0.000308 * T * T;
}

// Sidereal sign names (indices 0..11 = Aries..Pisces) and their Sanskrit rāśi names.
const RASHI = ['Meṣa', 'Vṛṣabha', 'Mithuna', 'Karka', 'Siṃha', 'Kanyā', 'Tulā', 'Vṛścika', 'Dhanu', 'Makara', 'Kumbha', 'Mīna'];

// Sun/Moon elongation → tithi index (0..29). 0..14 = Śukla (waxing), 15..29 = Kṛṣṇa (waning).
function skyOn(date: Date): { tithiNum: number; sunSign: number } {
  const a = lahiriAyanamsa(date);
  const sunLon = Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Sun, date, true)).elon;
  const moonLon = Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Moon, date, true)).elon;
  const elong = norm(moonLon - sunLon);
  const tithiNum = Math.floor(elong / 12);
  const sunSign = Math.floor(norm(sunLon - a) / 30);
  return { tithiNum, sunSign };
}

// Sample a day at ~06:00 local (sunrise approximation).
const sampleAt = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 6, 0, 0);

export type ObservanceKind = 'ekadashi' | 'purnima' | 'amavasya' | 'sankranti' | 'festival';

export type Observance = {
  key: string;            // stable per (kind + date)
  name: string;
  kind: ObservanceKind;
  date: Date;             // local midnight of the day
  dateLabel: string;      // "Sat, Aug 15"
  daysAway: number;       // 0 = today
  significance: string;   // one paragraph, informational
  practice: string;       // "Traditionally observed with …" — informational, never prescriptive
};

// ---- copy for the recurring markers -------------------------------------------
const EKADASHI = {
  significance:
    'Ekādaśī is the eleventh lunar day of each fortnight, held across many traditions as an especially sattvic, devotional window dedicated to Viṣṇu. Falling twice a lunar month, it is regarded as a natural pause in the cycle — a day associated with lightness, clarity, and turning inward.',
  practice:
    'Traditionally observed with fasting or a lighter diet, extra prayer, and the reciting of Viṣṇu’s names; many keep it as a quiet day of devotion and reflection.',
};
const PURNIMA = {
  significance:
    'Pūrṇimā, the full Moon, is considered a high point of the lunar month — the mind and emotions are seen as fullest and most receptive. Many festivals and vows are traditionally anchored to it, and it is long associated with completion, gratitude, and devotion.',
  practice:
    'Traditionally marked by prayer, charity, moonlit worship, and readings of sacred texts; a number of communities observe a fast or dedicate the day to a chosen deity.',
};
const AMAVASYA = {
  significance:
    'Amāvasyā, the new Moon, closes the lunar month — a dark, quiet turning point traditionally set aside for remembering ancestors (pitṛ) and for inner renewal before the next cycle begins.',
  practice:
    'Traditionally observed with remembrance of forebears, charity, and quiet reflection; some keep it as a day of rest and simple, inward practice.',
};

// A solar ingress. The famous one — the Sun entering Makara (Capricorn) — carries festival
// weight; the others are given a shared, gentle solar-turn description.
function sankrantiCopy(signIdx: number): { name: string; significance: string; practice: string } {
  if (signIdx === 9) {
    return {
      name: 'Makara Sankrānti',
      significance:
        'Makara Sankrānti marks the Sun’s turn into Makara (Capricorn) and the beginning of its northward course (uttarāyaṇa) — one of the most widely celebrated solar festivals, welcomed across India under many names as a time of light, harvest, and fresh beginnings.',
      practice:
        'Traditionally celebrated with offerings to the Sun, sesame and jaggery sweets, kite-flying, bathing at sacred rivers, and acts of charity.',
    };
  }
  return {
    name: `${RASHI[signIdx]} Sankrānti`,
    significance:
      `The Sun enters ${RASHI[signIdx]}, a Sankrānti — the monthly solar ingress from one sign to the next. These turning points are traditionally treated as auspicious junctures, marking the rhythm of the solar year.`,
    practice:
      'Traditionally observed with offerings to the Sun, charity, and a bath at first light; a gentle moment to set intentions for the month ahead.',
  };
}

// ---- festivals cleanly derivable from tithi + paksha + Sun sign ---------------
// Matched on (tithiNum, sunSign). tithiNum: 0=Śukla Pratipada … 10=Śukla Ekādaśī …
// 14=Pūrṇimā, 15=Kṛṣṇa Pratipada … 22=Kṛṣṇa Aṣṭamī … 28=Kṛṣṇa Caturdaśī, 29=Amāvasyā.
type Festival = { key: string; name: string; tithiNum: number; sunSign: number; significance: string; practice: string };
const FESTIVALS: Festival[] = [
  {
    key: 'ganesh-chaturthi', name: 'Gaṇeśa Chaturthī', tithiNum: 3, sunSign: 4, // Śukla Caturthī, Sun in Siṃha (Bhādrapada)
    significance:
      'Gaṇeśa Chaturthī celebrates the birth of Gaṇeśa, the remover of obstacles and lord of beginnings. Falling on the fourth waxing day of Bhādrapada, it opens a joyful multi-day festival welcoming Gaṇeśa into home and community.',
    practice:
      'Traditionally observed by installing and honouring Gaṇeśa images, offering modak and flowers, singing devotional songs, and a ceremonial farewell (visarjana) at the close.',
  },
  {
    key: 'janmashtami', name: 'Kṛṣṇa Janmāṣṭamī', tithiNum: 22, sunSign: 4, // Kṛṣṇa Aṣṭamī, Sun in Siṃha (Bhādrapada)
    significance:
      'Janmāṣṭamī marks the birth of Kṛṣṇa, celebrated on the eighth waning day of Bhādrapada. It is one of the most beloved festivals of devotion, remembering Kṛṣṇa’s life, teachings, and play.',
    practice:
      'Traditionally observed with night-long devotion, singing and storytelling of Kṛṣṇa’s life, a midnight celebration of his birth, and — in many places — joyful community events.',
  },
  {
    key: 'navaratri', name: 'Śāradā Navarātri (begins)', tithiNum: 0, sunSign: 5, // Śukla Pratipada, Sun in Kanyā (Āśvina)
    significance:
      'Śāradā Navarātri opens on the first waxing day of Āśvina — nine nights honouring the Divine Mother in her many forms. It is a period of devotion, dance, and renewal, culminating in the celebration of the triumph of good.',
    practice:
      'Traditionally observed over nine nights with worship of the Goddess, devotional music and dance (garbā / daṇḍiyā), and — for many — fasting or a simplified diet.',
  },
  {
    key: 'diwali', name: 'Dīpāvalī (Lakṣmī Pūjā)', tithiNum: 29, sunSign: 6, // Amāvasyā, Sun in Tulā (Kārtika)
    significance:
      'Dīpāvalī, the festival of lights, falls on the Kārtika new Moon. The most luminous festival of the year, it celebrates the return of light over darkness and welcomes Lakṣmī, goddess of abundance and grace, into cleaned and brightened homes.',
    practice:
      'Traditionally observed by lighting rows of lamps (dīpa), honouring Lakṣmī, decorating with rangoli, exchanging sweets, and gathering with family.',
  },
  {
    key: 'maha-shivaratri', name: 'Mahā Śivarātri', tithiNum: 28, sunSign: 10, // Kṛṣṇa Caturdaśī, Sun in Kumbha (Māgha/Phālguna)
    significance:
      'Mahā Śivarātri, the “great night of Śiva,” falls on the fourteenth waning day as the Sun moves through Kumbha. It is a solemn, devotional night traditionally kept in honour of Śiva — a time of stillness, mantra, and inner awakening.',
    practice:
      'Traditionally observed with a night-long vigil, chanting of Śiva mantras, offerings at the Śiva liṅga, and — for many — fasting and meditation through the night.',
  },
  {
    key: 'vasant-panchami', name: 'Vasant Pañchamī', tithiNum: 4, sunSign: 9, // Śukla Pañchamī, Sun in Makara (Māgha)
    significance:
      'Vasant Pañchamī, on the fifth waxing day of Māgha, welcomes the first stirrings of spring and honours Sarasvatī — goddess of knowledge, music, and the arts. It is a bright, hopeful day long linked with learning and fresh beginnings.',
    practice:
      'Traditionally observed by honouring Sarasvatī, wearing yellow, starting a child’s first lessons, and celebrating study, music, and the arts.',
  },
  // NOTE: the other requested festivals are NOT added — none verify cleanly across 2026–2028
  // with a single (tithi, Sun-sign) rule. Karva Chauth, Guru Pūrṇimā, Rakṣā Bandhan, Holī,
  // Rām Navamī, Hanumān Jayantī, and Vijayadaśamī all sit close to a sidereal saṅkrānti and
  // land on different sides of it in different years (and 2027 is an adhika-māsa year), so a
  // fixed Sun-sign mislabels or misses them. See the phase-3 verification tables.
];

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const label = (d: Date) => `${DOW[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}`;

// Compute observances in [from, from+days). One entry per day at most for the base markers,
// with festivals taking priority over the plain marker they coincide with.
export function computeObservances(from: Date = new Date(), days = 30): Observance[] {
  const out: Observance[] = [];
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let prevSunSign = skyOn(sampleAt(new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1))).sunSign;
  let lastMarkerKey = ''; // dedupe a marker repeating on consecutive sampled days

  for (let i = 0; i < days; i++) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const { tithiNum, sunSign } = skyOn(sampleAt(day));
    const tIdx = tithiNum % 15;
    const base = { date: day, dateLabel: label(day), daysAway: i };

    // Sankrānti — the Sun changed sidereal sign since yesterday (independent of tithi).
    if (sunSign !== prevSunSign) {
      const c = sankrantiCopy(sunSign);
      out.push({ key: `sankranti-${sunSign}-${day.toDateString()}`, name: c.name, kind: 'sankranti', ...base, significance: c.significance, practice: c.practice });
    }
    prevSunSign = sunSign;

    // Festival (takes the day if one matches), else the plain lunar marker.
    const fest = FESTIVALS.find((f) => f.tithiNum === tithiNum && f.sunSign === sunSign);
    if (fest) {
      out.push({ key: `${fest.key}-${day.toDateString()}`, name: fest.name, kind: 'festival', ...base, significance: fest.significance, practice: fest.practice });
      lastMarkerKey = fest.key;
    } else {
      let marker: { kind: ObservanceKind; name: string; copy: { significance: string; practice: string } } | null = null;
      if (tIdx === 10) marker = { kind: 'ekadashi', name: tithiNum < 15 ? 'Ekādaśī · Śukla' : 'Ekādaśī · Kṛṣṇa', copy: EKADASHI };
      else if (tithiNum === 14) marker = { kind: 'purnima', name: 'Pūrṇimā · Full Moon', copy: PURNIMA };
      else if (tithiNum === 29) marker = { kind: 'amavasya', name: 'Amāvasyā · New Moon', copy: AMAVASYA };
      if (marker) {
        const dedupeKey = `${marker.kind}-${marker.name}`;
        if (dedupeKey !== lastMarkerKey) {
          out.push({ key: `${marker.kind}-${day.toDateString()}`, name: marker.name, kind: marker.kind, ...base, significance: marker.copy.significance, practice: marker.copy.practice });
          lastMarkerKey = dedupeKey;
        }
      } else {
        lastMarkerKey = '';
      }
    }
  }
  return out;
}

// Today's observance, if any (for the hub header + Home cosmic-events line).
export function todayObservance(date: Date = new Date()): Observance | null {
  const list = computeObservances(date, 1);
  return list.find((o) => o.daysAway === 0) ?? null;
}
