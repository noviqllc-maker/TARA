// src/lib/nav.ts
// Reset navigation so `routeName` is the SOLE screen at the root — nothing swipe-back-able
// beneath (used when LEAVING the authed app: sign-out / delete-account / delete-all-data).
//
// Why not the plain router imperative API? From a nested screen (settings) it can't reset
// the PARENT stack: router.replace only swaps the current top (the tabs stay beneath), and
// router.dismissAll (POP_TO_TOP) bubbles only to the focused NESTED stack. So we locate the
// navigator that actually OWNS `routeName` — the ROOT Stack — and reset THAT to a single
// route. The previous version climbed a fixed number of parents and OVERSHOT the root Stack
// into an expo-router wrapper navigator whose routeNames don't include the route, which is
// exactly why RESET was "not handled by any navigator". Selecting by routeNames fixes it.
import { router } from 'expo-router';

export function resetRoot(nav: any, routeName: string, fallbackHref: string) {
  try {
    let n: any = nav;
    for (let hop = 0; n && hop < 8; hop++) {
      const names: string[] | undefined = n.getState?.()?.routeNames;
      if (Array.isArray(names) && names.includes(routeName)) {
        // This navigator registers `routeName`, so RESET here is handled — no warning, and
        // the stack becomes exactly [routeName] (edge-swipe does nothing).
        n.reset({ index: 0, routes: [{ name: routeName }] });
        return;
      }
      n = n.getParent?.();
    }
  } catch { /* fall through to a plain replace */ }
  // Fallback (should not be needed): at least navigate there, even if the stack isn't reset.
  router.replace(fallbackHref as any);
}
