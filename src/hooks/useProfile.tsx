// src/hooks/useProfile.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pushKey } from '@/lib/sync';
import { PriorityKey } from '@/data/priorities';

export type Profile = {
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  lat?: number;
  lon?: number;
  tzOffsetMinutes?: number;
  wellnessConnected: string[];
  // The onboarding "what matters most right now" answer. Persists locally and, when signed
  // in, syncs to Supabase inside the profile blob (no separate column or write needed).
  userPriority?: PriorityKey;
  onboarded: boolean;
};

const DEFAULT: Profile = {
  name: '',
  birthDate: '',
  birthTime: '',
  birthPlace: '',
  lat: undefined,
  lon: undefined,
  tzOffsetMinutes: undefined,
  wellnessConnected: [],
  onboarded: false,
};

type Ctx = {
  profile: Profile;
  ready: boolean;
  update: (p: Partial<Profile>) => void;
  reset: () => void;
  reload: () => Promise<Profile>; // re-read from storage (e.g. after a sign-in restore)
};

const ProfileContext = createContext<Ctx>({} as Ctx);
const KEY = 'tara.profile.v1';

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile>(DEFAULT);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => { if (v) setProfile(JSON.parse(v)); })
      .finally(() => setReady(true));
  }, []);

  const persist = (p: Profile) => {
    setProfile(p);
    AsyncStorage.setItem(KEY, JSON.stringify(p)).catch(() => {});
    pushKey(KEY); // sync birth data to the account when signed in (no-op otherwise)
  };

  const update = (patch: Partial<Profile>) => persist({ ...profile, ...patch });
  const reset = () => persist(DEFAULT);

  // Re-read storage into state — used after a sign-in restores server data locally.
  const reload = async (): Promise<Profile> => {
    const v = await AsyncStorage.getItem(KEY);
    const p = v ? (JSON.parse(v) as Profile) : DEFAULT;
    setProfile(p);
    return p;
  };

  return (
    <ProfileContext.Provider value={{ profile, ready, update, reset, reload }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
