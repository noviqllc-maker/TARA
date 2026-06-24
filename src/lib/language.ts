// src/lib/language.ts — the language Tara AI replies in (persisted on-device).
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'tara.lang.v1';

export const LANGUAGES = [
  { code: 'English',  native: 'English' },
  { code: 'Hindi',    native: 'हिन्दी' },
  { code: 'Tamil',    native: 'தமிழ்' },
  { code: 'Telugu',   native: 'తెలుగు' },
  { code: 'Bengali',  native: 'বাংলা' },
  { code: 'Marathi',  native: 'मराठी' },
  { code: 'Spanish',  native: 'Español' },
  { code: 'French',   native: 'Français' },
];

export async function getLanguage(): Promise<string> {
  return (await AsyncStorage.getItem(KEY)) || 'English';
}
export async function setLanguage(code: string): Promise<void> {
  await AsyncStorage.setItem(KEY, code);
}
