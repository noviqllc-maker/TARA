// src/lib/nav.ts
// Navigation helpers for making a screen the SOLE stack root (nothing swipe-back-able
// beneath it). expo-router's router.replace only swaps the top of the stack — it leaves
// everything beneath — so leaving the authed app (sign-out / delete / reset) needs a real
// reset of the root navigator, not a replace.
import { router } from 'expo-router';

// Reset the ROOT stack so `routeName` becomes the only screen. `nav` is the navigation
// object from useNavigation() on the calling screen; getParent() climbs to the root stack
// (the caller lives in a nested stack — settings/onboarding). Falls back to a plain
// replace if the root navigator can't be reached, so this never regresses behaviour.
export function resetRoot(nav: any, routeName: string, fallbackHref: string) {
  try {
    let root = nav;
    // Climb to the outermost navigator so the reset clears the tabs (and any pushed
    // screens) that sit beneath the current nested stack.
    for (let hop = 0; hop < 4 && root?.getParent?.(); hop++) root = root.getParent();
    if (root?.reset) {
      root.reset({ index: 0, routes: [{ name: routeName }] });
      return;
    }
  } catch { /* fall through to the safe replace */ }
  router.replace(fallbackHref as any);
}
