// src/hooks/usePremiumNudge.ts
// Single source of truth for "should this free user see a premium nudge right now?"
// Rules, all in one place:
//   • Premium users (active 'premium' entitlement) NEVER see a nudge.
//   • A dismissed/seen nudge stays hidden until its cooldown (in days) elapses.
//   • Optional once-per-session gating for the subtle in-session banner.
// Dismissals/cooldowns persist in AsyncStorage (never localStorage).
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSubscription } from './useSubscription';

const DAY = 86_400_000;
const keyFor = (id: string) => `tara.nudge.${id}`;

// Per app-session memory (resets on cold start = a new session).
const shownThisSession = new Set<string>();

type Options = {
  cooldownDays?: number;   // min days between appearances (default 3)
  oncePerSession?: boolean; // show at most once per session (default false)
  markOnShow?: boolean;     // start the cooldown as soon as it appears (banner), not only on dismiss
};

export function usePremiumNudge(id: string, opts: Options = {}) {
  const { cooldownDays = 3, oncePerSession = false, markOnShow = false } = opts;
  const { isPremium, loading } = useSubscription();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (loading) return;                 // wait until premium state is known
      if (isPremium) { if (alive) setVisible(false); return; } // premium = completely clean
      if (oncePerSession && shownThisSession.has(id)) { if (alive) setVisible(false); return; }

      const raw = await AsyncStorage.getItem(keyFor(id));
      const seenAt = raw ? parseInt(raw, 10) || 0 : 0;
      const cooled = Date.now() - seenAt >= cooldownDays * DAY;
      if (!alive) return;

      setVisible(cooled);
      if (cooled && markOnShow) {
        shownThisSession.add(id);
        AsyncStorage.setItem(keyFor(id), String(Date.now())).catch(() => {});
      }
    })();
    return () => { alive = false; };
  }, [id, isPremium, loading, cooldownDays, oncePerSession, markOnShow]);

  const dismiss = useCallback(() => {
    shownThisSession.add(id);
    setVisible(false);
    AsyncStorage.setItem(keyFor(id), String(Date.now())).catch(() => {});
  }, [id]);

  return { visible, dismiss };
}
