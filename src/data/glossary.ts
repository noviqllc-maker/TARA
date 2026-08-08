// src/data/glossary.ts
// "Tara Explains" glossary: every Vedic term the app surfaces, mapped to a plain-English,
// jargon-free, roughly 20-word explanation. Keys are lowercase with underscores for spaces
// (e.g. "graha drishti" -> "graha_drishti"); look terms up through getExplanation, which
// normalizes the input. Deterministic data, no AI.

export const GLOSSARY: Record<string, string> = {
  // ---- The nine grahas (planets) ----
  sun: 'Your core identity, will, and life direction. The center of who you are.',
  moon: 'Your emotions, instincts, and inner nature. How you feel and respond to life.',
  mercury: 'How you think, learn, and communicate. Your curiosity and mental style.',
  venus: 'Love, beauty, and magnetism. What you value, enjoy, and are drawn to.',
  mars: 'Your drive, courage, and energy. How you take action and assert yourself.',
  jupiter: 'Growth, wisdom, and good fortune. Your sense of meaning and where you expand.',
  saturn: 'Discipline and patience. Where you build lasting strength through effort and time.',
  rahu: 'Ambition and hunger. What pulls you forward toward new, unfamiliar experiences.',
  ketu: 'Spiritual release and wisdom. What you are learning to let go of.',
  graha: 'A planet in Vedic astrology. The nine grahas each shape a different part of life.',

  // ---- The twelve houses (bhavas) ----
  house_1: 'You: your identity, body, and how you approach life. Your starting point.',
  house_2: 'Money, values, speech, and family. What you own, earn, and treasure.',
  house_3: 'Courage, siblings, and communication. Your efforts, skills, and short journeys.',
  house_4: 'Home, mother, roots, and inner peace. Your emotional foundation and comfort.',
  house_5: 'Romance, creativity, and children. What brings you joy and self-expression.',
  house_6: 'Health, work, and obstacles. Daily routines and the challenges you overcome.',
  house_7: 'Partnerships and marriage. How you relate to others and form close bonds.',
  house_8: 'Transformation, shared resources, and the hidden. Deep change and mystery.',
  house_9: 'Higher learning, travel, and fortune. Your beliefs and your soul purpose.',
  house_10: 'Career, status, and public life. What you are known for in the world.',
  house_11: 'Gains, friends, and hopes. Your networks and the rewards of your work.',
  house_12: 'Rest, retreat, and letting go. Solitude, spirituality, and the subconscious.',

  // ---- Signs and the framework ----
  rashi: 'A zodiac sign; there are twelve. Your Moon sign is your emotional Rashi.',
  lagna: 'Your rising sign, or life direction. The sign on the eastern horizon at birth.',
  ascendant: 'The sign rising in the east at your birth. It shapes your whole chart.',
  navamsa: 'A deeper layer of your chart. Shows your soul intention and hidden talents.',
  kundli: 'Your birth chart: a map of the sky at the exact moment you were born.',
  jyotish: 'Vedic astrology itself. The ancient science of light that reads the sky.',
  ayanamsa: 'The small correction that aligns the chart to the real stars, not the seasons.',
  sidereal: 'The star-based zodiac Vedic astrology uses, fixed to the actual constellations.',
  tropical: 'The season-based zodiac Western astrology uses, tied to the equinoxes.',

  // ---- The Moon and the panchanga (almanac) ----
  nakshatra: 'A lunar mansion; one of 27 the Moon passes through. Like your emotional nature.',
  nakshatra_pada: 'A quarter of a Nakshatra. It refines your Moon nature into finer detail.',
  tithi: 'A lunar day; there are 30 each month. Each carries its own energy and purpose.',
  paksha: 'The two-week lunar half. Shukla is the waxing bright half; Krishna the waning dark.',
  vara: 'The weekday and its ruling planet. It colors the mood and best uses of the day.',
  karana: 'Half of a lunar day. A finer timing unit within the panchanga almanac.',
  yoga: 'A special planetary combination that brings a specific gift, talent, or challenge.',
  panchanga: 'The Vedic almanac: the day tithi, nakshatra, weekday, and two other qualities.',
  hora: 'A planetary hour. Each hour of the day is ruled by a different planet.',
  amavasya: 'The New Moon. Darkness and stillness; a time to plant seeds and set intentions.',
  purnima: 'The Full Moon. Illumination and fullness; a time to harvest and see clearly.',
  ekadashi: 'The eleventh lunar day. Auspicious for fasting, new intentions, and spiritual practice.',
  sankranti: 'The Sun moving into a new sign. A turning point marking seasonal change.',

  // ---- Dasha (life cycles) ----
  dasha: 'Your current life cycle. The Mahadasha is the main one, lasting several years.',
  mahadasha: 'A long life chapter, 6 to 20 years, ruled by one planet. Your current life season.',
  antardasha: 'A sub-period inside a Mahadasha. The current sub-theme within your larger chapter.',
  pratyantardasha: 'A sub-period inside an Antardasha. An even finer layer of planetary timing.',

  // ---- Aspects and relationships ----
  aspect: 'A planet influencing another planet or house. Like an energetic conversation across the chart.',
  drishti: 'A planet gaze. How a planet sees and affects other houses from where it sits.',
  graha_drishti: 'How planets see each other across the chart. Their gazes shape your day.',
  conjunction: 'Two planets sitting close together. Their energies fuse and strengthen each other.',
  opposition: 'Two planets facing each other across the chart. A pull between two opposite needs.',
  retrograde: 'A planet appearing to move backward. Its energy turns inward; you rethink that area.',
  combustion: 'A planet too close to the Sun. Its light is dimmed and its effect weakened.',
  exaltation: 'A planet in its strongest sign. It expresses its best qualities with ease.',
  debilitation: 'A planet in its weakest sign. It struggles to express itself and needs support.',
  own_sign: 'A planet sitting in a sign it rules. Comfortable and strong, like being at home.',
  moolatrikona: 'A planet favorite portion of its own sign, where it is especially strong.',

  // ---- Special points and house groups ----
  atmakaraka: 'The soul planet: the one at the highest degree. It signifies your deepest purpose.',
  amatyakaraka: 'The career and mind planet, second highest by degree. It guides your work path.',
  yogakaraka: 'A planet that brings power and success by ruling two lucky houses at once.',
  kendra: 'The angular houses 1, 4, 7, and 10. Pillars of strength and visible action.',
  trikona: 'The trine houses 1, 5, and 9. Houses of fortune, wisdom, and grace.',
  dusthana: 'The difficult houses 6, 8, and 12. Areas of challenge, loss, and growth.',
  upachaya: 'The growing houses 3, 6, 10, and 11. They improve steadily over time with effort.',

  // ---- Transits and well-known patterns ----
  transit: 'A planet current position in the sky and how it affects your birth chart today.',
  gochara: 'The movement of planets now, read against your Moon. The basis of daily forecasts.',
  sade_sati: 'Saturn seven-and-a-half year passage around your Moon. A demanding but maturing period.',
  kala_sarpa: 'A pattern with all planets between Rahu and Ketu. It intensifies life lessons.',
  mangal_dosha: 'A Mars placement said to affect marriage timing and harmony. Often remedied simply.',

  // ---- Yogas (fortunate combinations) ----
  raja_yoga: 'A combination bringing status, power, and success. A royal blessing in the chart.',
  dhana_yoga: 'A wealth combination. Placements that support earning, saving, and prosperity.',
  gaja_kesari_yoga: 'A bond between Jupiter and the Moon that grants wisdom, respect, and good fortune.',
  neecha_bhanga: 'A cancellation that heals a weak planet, turning an early struggle into later strength.',

  // ---- Timing windows (muhurta) ----
  muhurta: 'Choosing an auspicious moment to begin something important, guided by the panchanga.',
  rahukalam: 'The inauspicious daily window of about 90 minutes. Avoid starting important things then.',
  abhijit: 'The most auspicious daily window, 44 minutes around solar noon. Best for big decisions.',
  yamaganda: 'An inauspicious daily window. Like Rahukalam, a time to pause rather than launch.',
  gulika: 'An inauspicious daily window linked to Saturn. Best avoided for new beginnings.',
  brahma_muhurta: 'The sacred window before sunrise. Ideal for meditation, prayer, and study.',
  choghadiya: 'A simple daily timing system dividing the day into good and difficult slots.',

  // ---- Compatibility (Guna Milan / Ashtakoot) ----
  guna_milan: 'The match score between two charts, out of 36 points, used for compatibility.',
  ashtakoot: 'The eight factors compared between two people to measure marriage compatibility.',
  varna: 'A compatibility factor comparing spiritual and work temperament between two people.',
  vashya: 'A compatibility factor measuring mutual attraction and natural influence.',
  tara_koota: 'A compatibility factor comparing birth stars for health and shared destiny.',
  yoni: 'A compatibility factor using animal symbols to gauge instinct and intimacy.',
  graha_maitri: 'A compatibility factor comparing the friendship between the two Moon rulers.',
  gana: 'A compatibility factor comparing temperament: gentle, human, or fierce natures.',
  bhakoot: 'A compatibility factor weighing emotional and financial harmony between partners.',
  nadi: 'A compatibility factor tied to health and lineage. The most heavily weighted koota.',

  // ---- Life aims and inner concepts ----
  karma: 'Action and its consequences. What you do now shapes what comes to you later.',
  dharma: 'Your right path and duty. Living in tune with your true nature and purpose.',
  artha: 'Material wellbeing: wealth, work, and security. One of life four healthy aims.',
  kama: 'Desire and enjoyment: love, pleasure, and beauty. One of life four healthy aims.',
  moksha: 'Liberation and inner freedom. Release from the cycle of striving and fear.',
  ishta_devata: 'Your chosen guiding deity. The form of the divine that supports your spiritual path.',
  guna: 'A quality of nature: sattva calm, rajas activity, or tamas inertia. The three flavors of energy.',
  dosha: 'An imbalance or flaw in the chart. Often softened with simple, deliberate remedies.',
  mantra: 'A sacred sound or phrase, repeated to steady the mind and invite a planet blessing.',
  japa: 'The practice of repeating a mantra, often counted on beads, to focus and calm the mind.',
  sankalpa: 'A heartfelt intention or vow set before practice, giving your effort direction.',
};

// Look up a term, tolerant of spacing and case. "Graha Drishti" -> GLOSSARY.graha_drishti.
export function getExplanation(term: string): string | undefined {
  return GLOSSARY[term.toLowerCase().trim().replace(/\s+/g, '_')];
}
