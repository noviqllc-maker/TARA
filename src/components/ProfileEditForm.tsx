// src/components/ProfileEditForm.tsx
// Inline editor for the user's core birth details. On save it resolves the place to
// coordinates/timezone, RE-RUNS the full Vedic chart computation to validate the new
// inputs, then persists those inputs. Because useChart derives the chart (and the
// numerology fields derive from birthDate) directly from these saved inputs, every
// downstream field — Nakshatra/pada, signs, dasha, life path — refreshes automatically.
import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, Pressable, Platform, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Field from '@/components/Field';
import { Text, Card, Eyebrow, GoldButton, GhostButton } from '@/components/ui';
import { useProfile } from '@/hooks/useProfile';
import { searchPlaces, geocodePlace, hasPlacesKey, fallbackGeo, Place } from '@/lib/places';
import { computeChart } from '@/lib/vedic';
import { colors, fonts, radius, spacing } from '@/theme';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const pad = (s: string) => s.padStart(2, '0');
const fmtTime = (d: Date) => `${pad(String(d.getHours()))}:${pad(String(d.getMinutes()))}`;
function timeLabel(d: Date) {
  let h = d.getHours();
  const m = pad(String(d.getMinutes()));
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}

export default function ProfileEditForm({ onDone }: { onDone: () => void }) {
  const { profile, update } = useProfile();
  const keyed = hasPlacesKey();

  // Seed every field from the saved profile.
  const saved = DATE_RE.exec(profile.birthDate || '');
  const [name, setName] = useState(profile.name);
  const [day, setDay] = useState(saved ? saved[3] : '');
  const [month, setMonth] = useState(saved ? saved[2] : '');
  const [year, setYear] = useState(saved ? saved[1] : '');
  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  const [time, setTime] = useState(() => {
    const d = new Date();
    const m = /^(\d{1,2}):(\d{2})/.exec(profile.birthTime || '');
    if (m) d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
    else d.setHours(6, 0, 0, 0);
    return d;
  });
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');

  const [placeText, setPlaceText] = useState(profile.birthPlace);
  const [picked, setPicked] = useState<Place | null>(null);
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef<any>(null);
  const [saving, setSaving] = useState(false);

  // Places autocomplete (only when the text changed and nothing is picked yet).
  useEffect(() => {
    if (picked || !keyed) return;
    if (debounce.current) clearTimeout(debounce.current);
    if (placeText.trim().length < 2 || placeText.trim() === profile.birthPlace) { setResults([]); return; }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      setResults(await searchPlaces(placeText));
      setSearching(false);
    }, 350);
    return () => debounce.current && clearTimeout(debounce.current);
  }, [placeText, picked, keyed]);

  const onlyDigits = (t: string, max: number) => t.replace(/[^0-9]/g, '').slice(0, max);
  const onDay = (t: string) => { const v = onlyDigits(t, 2); setDay(v); if (v.length === 2) monthRef.current?.focus(); };
  const onMonth = (t: string) => { const v = onlyDigits(t, 2); setMonth(v); if (v.length === 2) yearRef.current?.focus(); };
  const onYear = (t: string) => setYear(onlyDigits(t, 4));

  const dN = parseInt(day, 10), mN = parseInt(month, 10), yN = parseInt(year, 10);
  const currentYear = new Date().getFullYear();
  const dateValid = dN >= 1 && dN <= 31 && mN >= 1 && mN <= 12 && year.length === 4 && yN >= 1900 && yN <= currentYear;
  const canSave = name.trim().length > 0 && dateValid && !saving;

  const onSave = async () => {
    setSaving(true);
    const birthDate = `${year}-${pad(month)}-${pad(day)}`;
    const birthTime = fmtTime(time);

    // 1) Resolve place → coordinates + timezone. Keep existing coords if unchanged.
    let lat = profile.lat, lon = profile.lon, tz = profile.tzOffsetMinutes, birthPlace = profile.birthPlace;
    if (picked && keyed) {
      const g = await geocodePlace(picked.placeId, birthDate);
      if (g) { lat = g.lat; lon = g.lon; tz = g.tzOffsetMinutes; birthPlace = placeText.trim(); }
    } else if (placeText.trim() && placeText.trim() !== profile.birthPlace) {
      birthPlace = placeText.trim();
      if (lat == null) { const f = fallbackGeo(); lat = f.lat; lon = f.lon; tz = f.tzOffsetMinutes; }
    }

    // 2) Re-run the FULL chart computation with the new inputs (validates them; this is
    //    the exact same call useChart makes when it re-derives on the next render).
    try {
      computeChart({
        date: birthDate, time: birthTime,
        lat: lat ?? 20.59, lon: lon ?? 78.96, tzOffsetMinutes: tz ?? 330,
      });
    } catch {
      Alert.alert('Could not compute chart', 'Please double-check the birth date, time and place.');
      setSaving(false);
      return;
    }

    // 3) Persist the new birth inputs → useChart + numerology re-derive everything.
    update({ name: name.trim(), birthDate, birthTime, birthPlace, lat, lon, tzOffsetMinutes: tz });
    setSaving(false);
    onDone();
  };

  return (
    <Card style={{ marginBottom: spacing.lg, gap: 16 }}>
      <Eyebrow>Edit Birth Details</Eyebrow>

      <View>
        <Text variant="eyebrow" color={colors.muted} style={styles.label}>Name</Text>
        <Field value={name} onChangeText={setName} placeholder="Your name" />
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
        <Pressable onPress={() => setShowPicker(true)} style={styles.timeChip}>
          <Text variant="serif" style={{ fontSize: 20 }}>{timeLabel(time)}</Text>
        </Pressable>
        {showPicker && (
          <View style={{ alignItems: 'center', marginTop: 4 }}>
            <DateTimePicker
              value={time} mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
              themeVariant="dark" textColor={colors.cream}
              onChange={(_, d) => { if (Platform.OS === 'android') setShowPicker(false); if (d) setTime(d); }}
            />
          </View>
        )}
      </View>

      <View>
        <Text variant="eyebrow" color={colors.muted} style={styles.label}>Birth Place</Text>
        <Field
          value={placeText}
          onChangeText={(t) => { setPlaceText(t); setPicked(null); }}
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

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
        <GhostButton label="Cancel" onPress={onDone} style={{ flex: 1 }} />
        <GoldButton label={saving ? 'Saving…' : 'Save'} onPress={onSave} disabled={!canSave} style={{ flex: 1 }} />
      </View>
    </Card>
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
});
