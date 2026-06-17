# Tara — Launch Guide (code is ready; these are the account/deploy steps)

The app code is publish-ready. The steps below are the things that must happen on YOUR
accounts (no one can do them for you). Work top to bottom. Budget ~half a day total.

────────────────────────────────────────
## 0. Run it locally first
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npx expo start --clear
```
NOTE: Premium (RevenueCat) and live purchases need a DEV BUILD, not Expo Go. In Expo Go,
the app runs fine but Premium stays locked and the AI uses its built-in fallback replies.

────────────────────────────────────────
## 1. AI backend — Supabase (fixes the security blocker)
1. Create a free account at supabase.com → New Project.
2. Install CLI:  `npm install -g supabase`
3. From the project folder:
   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-YOUR_KEY
   supabase functions deploy tara-ai --no-verify-jwt
   ```
4. Copy the function URL (looks like
   `https://YOUR_REF.supabase.co/functions/v1/tara-ai`) and paste it into
   `app.json` → `expo.extra.taraAiUrl`.

Now the AI runs securely — the Anthropic key lives only on Supabase, never in the app.

────────────────────────────────────────
## 2. Birthplace search — Google Places
1. console.cloud.google.com → new project → enable **Places API** + **Geocoding API** +
   **Time Zone API**.
2. Create an API key, restrict it to those APIs.
3. Paste into `app.json` → `expo.extra.googlePlacesApiKey`.

────────────────────────────────────────
## 3. Premium subscriptions — RevenueCat  (see PREMIUM-SETUP.md for detail)
1. Create a free RevenueCat account (revenuecat.com).
2. In App Store Connect AND Google Play, create an auto-renewing subscription product
   priced at $9.99/month (e.g. product id `tara_premium_monthly`).
3. In RevenueCat: add your apps, create an **entitlement called `premium`**, attach the
   product, and put it in the **current Offering**.
4. Copy your RevenueCat **public** API keys → `app.json` → `expo.extra.revenueCat.ios`
   and `.android`.

────────────────────────────────────────
## 4. Developer accounts
- Apple Developer Program — $99/year (developer.apple.com). Enroll as Noviq LLC (org).
- Google Play Console — $25 one-time (play.google.com/console). Enroll as Noviq LLC (org)
  to skip the new-personal-account testing requirement.

────────────────────────────────────────
## 5. Build & submit
```bash
npm install -g eas-cli
eas login
eas build:configure          # sets expo.extra.eas.projectId
eas build --platform ios --profile production
eas build --platform android --profile production
```
Fill in `eas.json` → submit → production with your Apple ID / team / ASC app id, and your
Google service-account JSON. Then:
```bash
eas submit --platform ios --profile production --latest
eas submit --platform android --profile production --latest
```

────────────────────────────────────────
## 6. Store listings
- Use `store/STORE-LISTING.md` for name, description, keywords, and the Data-Safety answers.
- Host `store/PRIVACY-POLICY.md` at a public URL (GitHub Pages or your site) and put that
  URL in both stores. Fill in [DATE] and [YOUR_EMAIL] first.
- Add screenshots (capture from your device: intro, chart, Tara AI, insights, paywall).
- Submit for review. Apple ~1–3 days, Google ~hours–3 days.

────────────────────────────────────────
## What's real vs. still mock (be honest in your listing)
REAL: birth chart, planets, houses, nakshatra, dashas, life timeline, daily moon
phase / panchanga / personal transits, Tara AI (once backend deployed), subscriptions.
STILL MOCK: the wellness numbers (sleep/recovery/HRV) until you wire Apple Health /
wearables. The wellness screens are built and labeled — connect real data when ready, or
mark "coming soon" at launch.
