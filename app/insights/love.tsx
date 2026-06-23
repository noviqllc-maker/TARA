// app/insights/love.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, Pressable, Platform, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import Screen from '@/components/Screen';
import { Text, Card, Eyebrow, GoldButton, GhostButton } from '@/components/ui';
import SubHeader from '@/components/SubHeader';
import Ring from '@/components/Ring';
import Field from '@/components/Field';
import Disclaimer from '@/components/Disclaimer';
import { love } from '@/data/mock';
import { useDailyEnergy } from '@/hooks/useDailyEnergy';
import { useChart } from '@/hooks/useChart';
import { useProfile } from '@/hooks/useProfile';
import { computeChart } from '@/lib/vedic';
import { searchPlaces, geocodePlace, hasPlacesKey, fallbackGeo, Place } from '@/lib/places';
import { gunaMilan, personMoonFromChart, KOOTA_META, GunaResult } from '@/lib/compatibility';
import { colors, fonts, radius, spacing } from '@/theme';

const pad = (s: string) => s.padStart(2, '0');
const fmtTime = (d: Date) => `${pad(String(d.getHours()))}:${pad(String(d.getMinutes()))}`;
function timeLabel(d: Date) {
  let h = d.getHours();
  const m = pad(String(d.getMinutes()));
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}

function List({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <Card style={{ marginBottom: 12 }}>
      <Eyebrow color={color}>{title}</Eyebrow>
      <View style={{ marginTop: 8, gap: 6 }}>
        {items.map((x) => <Text key={x} variant="tiny" color={colors.cream} style={{ fontSize: 13 }}>• {x}</Text>)}
      </View>
    </Card>
  );
}

export default function Love() {
  const energy = useDailyEnergy();
  const loveScore = energy.snapshot.find((s) => s.label === 'Love')?.value ?? love.score;

  const userChart = useChart();
  const { profile } = useProfile();
  const keyed = hasPlacesKey();

  // ---- Partner birth details ----
  const [name, setName] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  const [time, setTime] = useState(() => { const d = new Date(); d.setHours(6, 0, 0, 0); return d; });
  const [showPicker, setShowPicker] = useState(false);

  const [placeText, setPlaceText] = useState('');
  const [picked, setPicked] = useState<Place | null>(null);
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef<any>(null);

  // Role assignment (Varna & Gana are directional). Defaults to "you = bride".
  const [youAre, setYouAre] = useState<'bride' | 'groom'>('bride');

  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<GunaResult | null>(null);

  // Any edit invalidates a shown result — spec: no stale result.
  const dirty = () => { if (result) setResult(null); };

  // Places autocomplete
  useEffect(() => {
    if (picked || !keyed) return;
    if (debounce.current) clearTimeout(debounce.current);
    if (placeText.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      setResults(await searchPlaces(placeText));
      setSearching(false);
    }, 350);
    return () => debounce.current && clearTimeout(debounce.current);
  }, [placeText, picked, keyed]);

  const onlyDigits = (t: string, max: number) => t.replace(/[^0-9]/g, '').slice(0, max);
  const onDay = (t: string) => { dirty(); const v = onlyDigits(t, 2); setDay(v); if (v.length === 2) monthRef.current?.focus(); };
  const onMonth = (t: string) => { dirty(); const v = onlyDigits(t, 2); setMonth(v); if (v.length === 2) yearRef.current?.focus(); };
  const onYear = (t: string) => { dirty(); setYear(onlyDigits(t, 4)); };

  const dN = parseInt(day, 10), mN = parseInt(month, 10), yN = parseInt(year, 10);
  const currentYear = new Date().getFullYear();
  const dateValid = dN >= 1 && dN <= 31 && mN >= 1 && mN <= 12 && year.length === 4 && yN >= 1900 && yN <= currentYear;
  const canCalculate =
    !!userChart && name.trim().length > 0 && dateValid && placeText.trim().length > 0 && !calculating;

  const onCalculate = async () => {
    if (!userChart) return;
    setCalculating(true);
    const birthDate = `${year}-${pad(month)}-${pad(day)}`;
    const birthTime = fmtTime(time);

    // Resolve partner's place → coordinates + timezone.
    let lat: number | undefined, lon: number | undefined, tz: number | undefined;
    if (picked && keyed) {
      const g = await geocodePlace(picked.placeId, birthDate);
      if (g) { lat = g.lat; lon = g.lon; tz = g.tzOffsetMinutes; }
    }
    if (lat == null) { const f = fallbackGeo(); lat = f.lat; lon = f.lon; tz = f.tzOffsetMinutes; }

    try {
      const partnerChart = computeChart({ date: birthDate, time: birthTime, lat: lat!, lon: lon!, tzOffsetMinutes: tz! });
      const userMoon = personMoonFromChart(userChart);
      const partnerMoon = personMoonFromChart(partnerChart);
      // A = bride, B = groom.
      const A = youAre === 'bride' ? userMoon : partnerMoon;
      const B = youAre === 'bride' ? partnerMoon : userMoon;
      A.role = 'bride'; B.role = 'groom';
      setResult(gunaMilan(A, B));
    } catch {
      setResult(null);
    }
    setCalculating(false);
  };

  return (
    <Screen>
      <SubHeader eyebrow="Love & Relationships" title="Your Connection Energy" />

      <Card solid glow style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <Ring value={loveScore} label="Harmony" color={colors.rose} />
        <Text variant="tiny" style={{ marginTop: 10, textAlign: 'center' }}>{love.influence}</Text>
      </Card>

      <List title="Strengths" items={love.strengths} color={colors.sage} />
      <List title="Challenges" items={love.challenges} color={colors.rose} />
      <List title="Growth Opportunities" items={love.growth} color={colors.goldSoft} />

      <Card style={{ marginBottom: spacing.lg }}>
        <Eyebrow>Personalized Advice</Eyebrow>
        <Text variant="serif" style={{ fontSize: 15.5, marginTop: 8 }}>{love.advice}</Text>
      </Card>

      {/* ---- Guna Milan compatibility ---- */}
      <Card style={{ marginBottom: spacing.lg, gap: 16 }}>
        <View>
          <Eyebrow>Compatibility · Guṇa Milan</Eyebrow>
          <Text variant="tiny" style={{ marginTop: 6 }}>
            Enter your partner's birth details for a real Ashtakoota (36-point) match — computed from both Moons.
          </Text>
        </View>

        <View>
          <Text variant="eyebrow" color={colors.muted} style={styles.label}>Partner's Name</Text>
          <Field value={name} onChangeText={(t) => { dirty(); setName(t); }} placeholder="Their name" autoCapitalize="words" />
        </View>

        <View>
          <Text variant="eyebrow" color={colors.muted} style={styles.label}>Birth Date</Text>
          <View style={styles.dateRow}>
            <View style={{ flex: 1 }}>
              <TextInput value={day} onChangeText={onDay} placeholder="DD" placeholderTextColor={colors.mutedDim}
                keyboardType="number-pad" maxLength={2} style={styles.dateField} />
            </View>
            <View style={{ flex: 1 }}>
              <TextInput ref={monthRef} value={month} onChangeText={onMonth} placeholder="MM" placeholderTextColor={colors.mutedDim}
                keyboardType="number-pad" maxLength={2} style={styles.dateField} />
            </View>
            <View style={{ flex: 1.5 }}>
              <TextInput ref={yearRef} value={year} onChangeText={onYear} placeholder="YYYY" placeholderTextColor={colors.mutedDim}
                keyboardType="number-pad" maxLength={4} style={styles.dateField} />
            </View>
          </View>
          {!dateValid && (day || month || year) ? (
            <Text variant="tiny" color={colors.terra} style={{ marginTop: 8 }}>Enter a valid day, month and 4-digit year.</Text>
          ) : null}
        </View>

        <View>
          <Text variant="eyebrow" color={colors.muted} style={styles.label}>Birth Time</Text>
          <Pressable onPress={() => setShowPicker((s) => !s)} style={styles.timeChip}>
            <Text variant="serif" style={{ fontSize: 20 }}>{timeLabel(time)}</Text>
          </Pressable>
          {showPicker && (
            <View style={{ alignItems: 'center', marginTop: 4 }}>
              <DateTimePicker
                value={time} mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
                themeVariant="dark" textColor={colors.cream}
                onChange={(_, d) => { dirty(); if (Platform.OS === 'android') setShowPicker(false); if (d) setTime(d); }}
              />
            </View>
          )}
        </View>

        <View>
          <Text variant="eyebrow" color={colors.muted} style={styles.label}>Birth Place</Text>
          <Field
            value={placeText}
            onChangeText={(t) => { dirty(); setPlaceText(t); setPicked(null); }}
            placeholder="City, Country"
            autoCapitalize="words"
          />
          {searching && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <ActivityIndicator color={colors.gold} size="small" />
              <Text variant="tiny">Searching…</Text>
            </View>
          )}
          {results.length > 0 && (
            <View style={styles.results}>
              {results.map((r, i) => (
                <Pressable key={r.placeId} onPress={() => { setPlaceText(r.description); setPicked(r); setResults([]); }}
                  style={{ paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: 'rgba(205,163,73,0.12)' }}>
                  <Text variant="body" style={{ fontSize: 14 }}>{r.description}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {picked && <Text variant="tiny" color={colors.sage} style={{ marginTop: 8 }}>✓ Location set for an accurate chart</Text>}
        </View>

        {/* Role assignment — Varna & Gana depend on who is bride vs groom. */}
        <View>
          <Text variant="eyebrow" color={colors.muted} style={styles.label}>You are</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(['bride', 'groom'] as const).map((role) => {
              const active = youAre === role;
              return (
                <Pressable key={role} onPress={() => { dirty(); setYouAre(role); }}
                  style={[styles.roleChip, active && styles.roleChipActive]}>
                  <Text variant="tiny" color={active ? '#1a1018' : colors.muted} style={{ fontWeight: active ? '600' : '400', textTransform: 'capitalize' }}>
                    {role}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {!userChart && (
          <Text variant="tiny" color={colors.terra}>
            Complete your own birth details in Profile first — your Moon is needed for the match.
          </Text>
        )}

        <GoldButton
          label={calculating ? 'Calculating…' : 'Calculate Compatibility'}
          onPress={onCalculate}
          disabled={!canCalculate}
        />

        {result && (
          <View style={{ marginTop: 4 }}>
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <Ring value={result.total} max={36} label="Guṇa / 36" color={colors.lav} size={120} />
              <Text variant="serif" style={{ marginTop: 10, fontSize: 17 }}>
                {result.total} / 36 — {result.rating}
              </Text>
              <Text variant="tiny" color={colors.muted} style={{ marginTop: 6, textAlign: 'center', lineHeight: 18 }}>
                {result.tone}
              </Text>
            </View>

            {/* 8-koota breakdown */}
            <View style={styles.breakdown}>
              {KOOTA_META.map((k, i) => {
                const v = result.breakdown[k.key];
                return (
                  <View key={k.key} style={[styles.kRow, i === KOOTA_META.length - 1 && { borderBottomWidth: 0 }]}>
                    <Text variant="body" style={{ fontSize: 13.5 }}>{k.label}</Text>
                    <Text variant="body" color={v === 0 ? colors.terra : colors.goldSoft} style={{ fontSize: 13.5, fontWeight: '600' }}>
                      {v} / {k.max}
                    </Text>
                  </View>
                );
              })}
            </View>

            {(result.doshas.nadi || result.doshas.bhakoot) && (
              <View style={{ marginTop: 12, gap: 6 }}>
                {result.doshas.nadi && (
                  <Text variant="tiny" color={colors.terra}>
                    ✦ Nadi dosha — same Nadi scores zero; the most serious of the doshas. Remedies can soften its effect.
                  </Text>
                )}
                {result.doshas.bhakoot && (
                  <Text variant="tiny" color={colors.terra}>
                    ✦ Bhakoot dosha — the Moon-sign positions sit in a strained relationship.
                  </Text>
                )}
                <Pressable onPress={() => router.push('/(tabs)/profile')} style={{ marginTop: 2 }}>
                  <Text variant="tiny" color={colors.gold}>Explore Dosha Remedies →</Text>
                </Pressable>
              </View>
            )}

            <Text variant="tiny" color={colors.mutedDim} style={{ marginTop: 14, fontSize: 10.5, lineHeight: 15 }}>
              Tara uses the classic Ashtakoota method ({youAre === 'bride' ? 'you as bride' : 'you as groom'}). Guna Milan conventions vary between astrologers; treat this as guidance, not a verdict.
            </Text>
          </View>
        )}
      </Card>

      <GhostButton
        label="Ask a relationship question →"
        onPress={() => router.push({ pathname: '/(tabs)/tara', params: { category: 'Relationships' } })}
      />
      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 8, marginLeft: 2 },
  dateRow: { flexDirection: 'row', gap: 12 },
  dateField: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.04)', borderColor: colors.line, borderWidth: 1,
    borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 12,
    color: colors.cream, fontFamily: fonts.sans, fontSize: 18, textAlign: 'center',
  },
  timeChip: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderColor: colors.line, borderWidth: 1,
    borderRadius: radius.md, paddingVertical: 14, alignItems: 'center',
  },
  results: { marginTop: 10, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  roleChip: {
    flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card,
  },
  roleChipActive: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  breakdown: {
    borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14,
  },
  kRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(205,163,73,0.1)',
  },
});
