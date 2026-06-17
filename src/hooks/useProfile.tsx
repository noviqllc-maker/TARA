// src/hooks/useProfile.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Profile = {
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  lat?: number;
  lon?: number;
  tzOffsetMinutes?: number;
  wellnessConnected: string[];
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
  };

  const update = (patch: Partial<Profile>) => persist({ ...profile, ...patch });
  const reset = () => persist(DEFAULT);

  return (
    <ProfileContext.Provider value={{ profile, ready, update, reset }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
