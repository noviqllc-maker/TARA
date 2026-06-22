// app/calculator.tsx
// Standalone Vedic Calculator — enter ANY birth date, time and place and instantly
// compute a full sidereal chart (planets, navamsa, drishti, dasha + antardasha).
// Independent of the saved profile, so it doubles as a chart tool for anyone.
import React, { useState, useRef, useEffect } from 'react';
import { View, Pressable, Platform, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import Screen from '@/components/Screen';
import Field from '@/components/Field';
import { Text, Card, Eyebrow, GoldButton, GhostButton } from '@/components/ui';
import Disclaimer from '@/components/Disclaimer';
import { searchPlaces, geocodePlace, hasPlacesKey, fallbackGeo, Place } from '@/lib/places';
import { computeChart, BirthChart, PlanetPosition } from '@/lib/vedic';
import { colors, spacing, radius } from '@/theme';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function timeLabel(d: Date) {
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}
function timeValue(d: Date) {
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function Calculator() {
  // ---- form state ----
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState(() => { const d = new Date(); d.setHours(6, 0, 0, 0); return d; });
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');

  const [place, setPlace] = useState('');
  const [picked, setPicked] = useState<Place | null>(null);
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef<any>(null);
  const keyed = hasPlacesKey();

  const [computing, setComputing] = useState(false);
  const [chart, setChart] = useState<BirthChart | null>(null);
  const [error, setError] = useState('');

  // place autocomplete (mirrors the onboarding birthplace screen)
  useEffect(() => {
    if (picked || !keyed) return;
    if (debounce.current) clearTimeout(debounce.current);
    if (place.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      setResults(await searchPlaces(place));
      setSearching(false);
    }, 350);
    return () => debounce.current && clearTimeout(debounce.current);
  }, [place, picked, keyed]);

  const validDate = DATE_RE.test(date.trim());

  const onCalculate = async () => {
    setError('');
    setChart(null);
    setComputing(true);
    try {
      let geo = null;
      if (picked && keyed) geo = await geocodePlace(picked.placeId, date.trim());
      if (!geo) geo = fallbackGeo();
      const c = computeChart({
        date: date.trim(),
        time: timeValue(time),
        lat: geo.lat,
        lon: geo.lon,
        tzOffsetMinutes: geo.tzOffsetMinutes,
      });
      setChart(c);
    } catch {
      setError('Could not compute a chart from those details. Check the date format (YYYY-MM-DD).');
    } finally {
      setComputing(false);
    }
  };

  return (
    <Screen>
      <Animated.View entering={FadeInDown.duration(450)} style={{ marginTop: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Eyebrow>Vedic Calculator</Eyebrow>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text variant="tiny" color={colors.gold}>Close</Text>
          </Pressable>
        </View>
        <Text variant="h2" style={{ marginTop: 6 }}>Cast any birth chart</Text>
        <Text variant="tiny" style={{ marginTop: 8 }}>
          Enter a birth date, time and place — for yourself or anyone — to compute a full sidereal
          chart with navamsa, planetary aspects and dasha periods.
        </Text>
      </Animated.View>

      {/* ---- form ---- */}
      <Card style={{ marginTop: spacing.lg, gap: 14 }}>
        <View>
          <Text variant="eyebrow" color={colors.muted} style={{ marginBottom: 8 }}>Name (optional)</Text>
          <Field placeholder="Whose chart is this?" value={name} onChangeText={setName} />
        </View>

        <View>
          <Text variant="eyebrow" color={colors.muted} style={{ marginBottom: 8 }}>Birth date</Text>
          <Field
            placeholder="1994-09-23"
            value={date}
            onChangeText={(t) => { setDate(t); setChart(null); }}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
          />
          {date.length > 0 && !validDate && (
            <Text variant="tiny" color={colors.terra} style={{ marginTop: 6 }}>Use the format YYYY-MM-DD.</Text>
          )}
        </View>

        <View>
          <Text variant="eyebrow" color={colors.muted} style={{ marginBottom: 8 }}>Birth time</Text>
          <Pressable
            onPress={() => setShowPicker(true)}
            style={{
              backgroundColor: 'rgba(255,255,255,0.04)', borderColor: colors.line, borderWidth: 1,
              borderRadius: radius.md, paddingVertical: 14, alignItems: 'center',
            }}
          >
            <Text variant="serif" style={{ fontSize: 22 }}>{timeLabel(time)}</Text>
          </Pressable>
          {showPicker && (
            <View style={{ alignItems: 'center', marginTop: 4 }}>
              <DateTimePicker
                value={time}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
                themeVariant="dark"
                textColor={colors.cream}
                onChange={(_, d) => {
                  if (Platform.OS === 'android') setShowPicker(false);
                  if (d) { setTime(d); setChart(null); }
                }}
              />
            </View>
          )}
        </View>

        <View>
          <Text variant="eyebrow" color={colors.muted} style={{ marginBottom: 8 }}>Birth place</Text>
          <Field
            placeholder={keyed ? 'City, Country' : 'City, Country (defaults to IST if no Places key)'}
            value={place}
            onChangeText={(t) => { setPlace(t); setPicked(null); setChart(null); }}
            autoCapitalize="words"
          />
          {searching && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <ActivityIndicator color={colors.gold} size="small" />
              <Text variant="tiny">Searching…</Text>
            </View>
          )}
          {results.length > 0 && (
            <View style={{ marginTop: 10, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' }}>
              {results.map((r, i) => (
                <Pressable
                  key={r.placeId}
                  onPress={() => { setPlace(r.description); setPicked(r); setResults([]); }}
                  style={{
                    paddingVertical: 13, paddingHorizontal: 14,
                    borderTopWidth: i === 0 ? 0 : 1, borderTopColor: 'rgba(205,163,73,0.12)',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                  }}
                >
                  <Text variant="body" style={{ fontSize: 14 }}>{r.description}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {picked && <Text variant="tiny" color={colors.sage} style={{ marginTop: 8 }}>✓ Location set for an accurate ascendant</Text>}
        </View>
      </Card>

      <GoldButton
        label={computing ? 'Calculating…' : 'Calculate chart'}
        onPress={onCalculate}
        disabled={!validDate || computing}
        style={{ marginTop: spacing.lg }}
      />
      {error ? <Text variant="tiny" color={colors.terra} style={{ marginTop: 10 }}>{error}</Text> : null}

      {chart && <ChartResults name={name.trim()} chart={chart} />}

      <Disclaimer />
    </Screen>
  );
}

/* ---------------- results ---------------- */

function ChartResults({ name, chart }: { name: string; chart: BirthChart }) {
  const present = chart.dasha.find((d) => d.phase === 'present');
  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ marginTop: spacing.xl }}>
      <Eyebrow color={colors.lav}>{name ? `${name}'s Chart` : 'Result'}</Eyebrow>

      {/* key signs */}
      <View style={styles.grid}>
        {[
          ['Ascendant', `${chart.ascendant.sign} ${chart.ascendant.degree}`],
          ['Sun Sign', chart.sunSign],
          ['Moon Sign', chart.moonSign],
          ['Nakshatra', `${chart.nakshatra} (${chart.nakshatraPada})`],
        ].map(([k, v]) => (
          <Card key={k} style={styles.gridCard}>
            <Text variant="eyebrow" color={colors.muted} style={{ fontSize: 9.5 }}>{k}</Text>
            <Text variant="serif" style={{ fontSize: 15, marginTop: 5 }}>{v}</Text>
          </Card>
        ))}
      </View>

      {/* running period */}
      {chart.currentDasha ? (
        <Card solid glow style={{ marginTop: spacing.lg }}>
          <Eyebrow color={colors.gold}>Current Period</Eyebrow>
          <Text variant="serif" style={{ fontSize: 18, marginTop: 6 }}>{chart.currentDasha}</Text>
          {chart.currentAntardasha ? (
            <Text variant="tiny" color={colors.goldSoft} style={{ marginTop: 4 }}>{chart.currentAntardasha}</Text>
          ) : null}
        </Card>
      ) : null}

      {/* planets with rashi + navamsa */}
      <Card style={{ marginTop: spacing.lg }}>
        <Eyebrow>Planets — Rāśi (D1) & Navāṁśa (D9)</Eyebrow>
        <View style={{ marginTop: 8 }}>
          {chart.planets.map((pl: PlanetPosition) => (
            <View key={pl.name} style={styles.planetRow}>
              <Text variant="serif" style={{ fontSize: 14.5, width: 96 }}>{pl.glyph}  {pl.name}{pl.retrograde ? ' ℞' : ''}</Text>
              <Text variant="tiny" color={colors.goldSoft} style={{ flex: 1, textAlign: 'right' }}>
                {pl.sign} {pl.degree} · H{pl.house} · D9 {pl.navamsaSign}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      {/* graha drishti */}
      {chart.drishti.length > 0 && (
        <Card style={{ marginTop: spacing.lg }}>
          <Eyebrow>Graha Drishti (Aspects)</Eyebrow>
          <View style={{ marginTop: 10, gap: 7 }}>
            {chart.drishti.map((a, i) => (
              <Text key={`${a.from}-${a.house}-${i}`} variant="tiny" color={colors.cream} style={{ fontSize: 13 }}>
                • {a.from} aspects {a.targets.join(', ')} (house {a.house})
              </Text>
            ))}
          </View>
        </Card>
      )}

      {/* antardasha of the running mahadasha */}
      {present?.antardashas?.length ? (
        <Card style={{ marginTop: spacing.lg }}>
          <Eyebrow>{present.planet} Mahādasha — Antardashas</Eyebrow>
          <View style={{ marginTop: 10 }}>
            {present.antardashas.map((a, i) => (
              <View key={`${a.planet}-${i}`} style={styles.planetRow}>
                <Text
                  variant="serif"
                  style={{ fontSize: 14, color: a.phase === 'present' ? colors.gold : colors.cream }}
                >
                  {present.planet}–{a.planet}{a.phase === 'present' ? '  •' : ''}
                </Text>
                <Text variant="tiny" color={a.phase === 'present' ? colors.goldSoft : colors.muted}>
                  {a.start} – {a.end}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <GhostButton
        label="View full Dasha timeline →"
        onPress={() => router.push('/chart/timeline')}
        style={{ marginTop: spacing.lg }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  gridCard: { width: '47.5%' },
  planetRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(205,163,73,0.1)',
  },
});
