// src/lib/privacy.ts — on-device privacy controls.
import AsyncStorage from '@react-native-async-storage/async-storage';

const REMEMBER_KEY = 'tara.privacy.rememberChat.v1';
const CHAT_KEY = 'tara.chat.v1';

// Default ON (chat memory was always on before this setting existed).
export async function getRememberChat(): Promise<boolean> {
  const v = await AsyncStorage.getItem(REMEMBER_KEY);
  return v === null ? true : v === '1';
}
export async function setRememberChat(on: boolean): Promise<void> {
  await AsyncStorage.setItem(REMEMBER_KEY, on ? '1' : '0');
  if (!on) await AsyncStorage.removeItem(CHAT_KEY); // forget existing memory immediately
}
export async function clearChatHistory(): Promise<void> {
  await AsyncStorage.removeItem(CHAT_KEY);
}
// Remove every Tara key (profile, chat, usage, health, language, prefs).
export async function wipeLocalData(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const mine = keys.filter((k) => k.startsWith('tara.'));
  if (mine.length) await AsyncStorage.multiRemove(mine);
}
