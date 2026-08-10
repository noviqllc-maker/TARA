// src/components/NotificationRefresher.tsx
// Headless: on each app open (mount + foreground) refresh the next 3 daily
// notifications so their bodies stay current. No-ops when permission isn't granted.
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useChart } from '@/hooks/useChart';
import { useProfile } from '@/hooks/useProfile';
import { refreshDailyNotifications } from '@/lib/notifications';

export default function NotificationRefresher() {
  const chart = useChart();
  const { profile, ready } = useProfile();

  useEffect(() => {
    if (!ready) return;
    const run = () => { refreshDailyNotifications(chart, profile.birthDate, profile.userPriorities ?? []).catch(() => {}); };
    run();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') run(); });
    return () => sub.remove();
  }, [ready, chart, profile.birthDate]);

  return null;
}
