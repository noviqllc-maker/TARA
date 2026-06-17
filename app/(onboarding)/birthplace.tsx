// app/(onboarding)/birthplace.tsx
import React, { useState, useRef, useEffect } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import OnboardingShell from '@/components/OnboardingShell';
import Field from '@/components/Field';
import { Text } from '@/components/ui';
import { useProfile } from '@/hooks/useProfile';
import { searchPlaces, geocodePlace, hasPlacesKey, fallbackGeo, Place } from '@/lib/places';
import { colors, radius } from '@/theme';

export default function BirthPlaceScreen() {
  const { profile, update } = useProfile();
  const [v, setV] = useState(profile.birthPlace);
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [picked, setPicked] = useState<Place | null>(null);
  const debounce = useRef<any>(null);
  const keyed = hasPlacesKey();

  useEffect(() => {
    if (picked || !keyed) return;
    if (debounce.current) clearTimeout(debounce.current);
    if (v.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    debounce.current = setTimeout(async () => {
      setResults(await searchPlaces(v));
      setLoading(false);
    }, 350);
    return () => debounce.current && clearTimeout(debounce.current);
  }, [v, picked, keyed]);

  const choose = (place: Place) => {
    setV(place.description);
    setPicked(place);
    setResults([]);
  };

  const onContinue = async () => {
    setResolving(true);
    let geo = null;
    if (picked && keyed) {
      geo = await geocodePlace(picked.placeId, profile.birthDate || '2000-01-01');
    }
    if (!geo) geo = fallbackGeo(); // never block the user; chart still computes
    update({ birthPlace: v.trim(), lat: geo.lat, lon: geo.lon, tzOffsetMinutes: geo.tzOffsetMinutes });
    setResolving(false);
    router.push('/(onboarding)/wellness');
  };

  return (
    <OnboardingShell
      step={4} total={5}
      question="Where were you born?"
      helper={keyed ? 'Start typing your city and pick from the list.' : 'Type your city and country.'}
      disabled={!v.trim() || resolving}
      continueLabel={resolving ? 'Locating…' : 'Continue'}
      onContinue={onContinue}
    >
      <Field
        placeholder="City, Country"
        value={v}
        onChangeText={(t) => { setV(t); setPicked(null); }}
        autoFocus
      />

      {loading && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <ActivityIndicator color={colors.gold} size="small" />
          <Text variant="tiny">Searching…</Text>
        </View>
      )}

      {results.length > 0 && (
        <View style={{ marginTop: 10, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' }}>
          {results.map((r, i) => (
            <Pressable
              key={r.placeId}
              onPress={() => choose(r)}
              style={{
                paddingVertical: 14, paddingHorizontal: 16,
                borderTopWidth: i === 0 ? 0 : 1, borderTopColor: 'rgba(205,163,73,0.12)',
                backgroundColor: 'rgba(255,255,255,0.02)',
              }}
            >
              <Text variant="body" style={{ fontSize: 14 }}>{r.description}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {picked && (
        <Text variant="tiny" color={colors.sage} style={{ marginTop: 10 }}>✓ Location set for an accurate chart</Text>
      )}
    </OnboardingShell>
  );
}
