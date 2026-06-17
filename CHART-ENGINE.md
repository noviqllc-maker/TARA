# Tara — Real Vedic Chart Engine

Every user now gets their OWN chart, computed from their birth date, time, and place.

## How it works
- **`src/lib/vedic.ts`** — the engine. Uses `astronomy-engine` (pure JS, runs in
  React Native) to get real planetary positions, applies the **Lahiri ayanamsa** to
  convert to the sidereal (Vedic) zodiac, then derives:
  - Ascendant (Lagna) from local sidereal time + birth latitude
  - All 9 grahas (Sun→Saturn + Rahu/Ketu) with sign, house, degree, retrograde
  - Moon's **Nakshatra** + pada
  - Full **Vimśottarī Daśā** timeline (past / present / future), from the Moon's exact position
  - Sun sign, Moon sign, ruling planet, chart highlights
- **`src/hooks/useChart.ts`** — computes the chart from the saved profile (memoized).
- **`src/lib/places.ts`** — Google Places autocomplete + geocoding + timezone, so the
  birthplace becomes real lat/lon/timezone for an accurate ascendant.
- **`src/lib/numerology.ts`** — life path number + Chinese zodiac from the birth date.

## Wired into
- **Chart tab** — real planets, signs, nakshatra, ascendant, highlights, tappable meanings
- **Life Timeline** — real dasha periods with your current period highlighted
- **Profile** — real Sun/Moon/Rising/Nakshatra/Ruling planet/Life path/Zodiac
- **Home** — cosmic weather shows your real nakshatra + current dasha
- **Tara AI** — the chat now receives your real chart as context, so answers are personalized

## Accuracy notes
- Positions use the Lahiri ayanamsa (the most common Vedic standard) and whole-sign houses.
- Rahu/Ketu use the mean lunar node.
- Accurate to within a fraction of a degree — suitable for a consumer app. For
  research-grade precision you'd later swap in the Swiss Ephemeris, but this needs no
  native modules and runs everywhere.
- **Birth time + place matter:** the ascendant and houses depend on them. With the Google
  Places key set, the birthplace resolves to exact coordinates and historical timezone.
  Without a key, it falls back to a default location so a chart still computes.

## Still mock (next steps)
- Daily *transits* / panchanga / moon-phase on the Home & Insights screens (today's sky).
- Wellness numbers (need real Apple Health / wearable integration).
