// src/hooks/usePanchangExplained.ts
// Today's panchāṅga explained for the user's chart. Renders the deterministic chart-tied
// version instantly, then upgrades to the cached/AI version when getPanchangExplained resolves
// (which fires the Claude call at most once per user per day).
import { useEffect, useState } from 'react';
import { useChart } from '@/hooks/useChart';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { getPanchangExplained, deterministicPanchang } from '@/lib/panchangExplain';
import { PanchangExplained } from '@/lib/ai';

// Premium-only. Free users get { data: null } and NO AI call is made (so it costs nothing).
export function usePanchangExplained(): { data: PanchangExplained | null; source: string } {
  const chart = useChart();
  const { profile } = useProfile();
  const { session } = useAuth();
  const { isPremium } = useSubscription();
  const uid = session?.user?.id || profile.name || 'anon';
  const dayKey = new Date().toDateString();

  const [state, setState] = useState<{ data: PanchangExplained | null; source: string }>(() => ({
    data: isPremium && chart ? deterministicPanchang(chart, new Date()) : null,
    source: isPremium ? 'loading' : 'locked',
  }));

  useEffect(() => {
    if (!isPremium) { setState({ data: null, source: 'locked' }); return; }
    let cancelled = false;
    // Instant deterministic first, so the card is never blank while the AI call is in flight.
    setState({ data: chart ? deterministicPanchang(chart, new Date()) : null, source: 'loading' });
    getPanchangExplained(uid, profile.name, chart, new Date()).then((r) => { if (!cancelled) setState(r); });
    return () => { cancelled = true; };
  }, [uid, chart, dayKey, isPremium]);

  return state;
}
