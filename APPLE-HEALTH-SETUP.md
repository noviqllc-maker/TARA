# Tara — Apple Health Integration

Tara now reads your real sleep, recovery, HRV, resting heart rate, steps, and active
energy from Apple Health, and blends them with your Vedic chart.

## How it works
- **`src/lib/health.ts`** — reads HealthKit metrics and maps raw data into Tara's wellness
  scores (sleep score, recovery score, HRV, RHR, steps).
- **`src/hooks/useHealth.tsx`** — app-wide health state; handles connect, permission, refresh,
  and remembers if you've connected.
- Wired into: the **Health & Wellness screen** (real rings + a Connect button), the
  **onboarding wellness step** (Apple Health connects for real), and **Tara AI** (the chat
  now receives your real body data as context).

## Important: needs a real build, not Expo Go
HealthKit is a native module, so it only works in a **development build** or a
**production build** — not in Expo Go, and only on **iPhone** (not Android, not simulator
for real data). Everywhere else the app safely falls back to placeholder numbers, so nothing
crashes; the Connect button just explains a dev build is needed.

## To test it
1. Make a development build:
   ```bash
   npm install --legacy-peer-deps
   npx expo prebuild --clean
   eas build --profile development --platform ios
   ```
   (or `npx expo run:ios` on a Mac with Xcode and a connected iPhone)
2. Open the dev build on your iPhone.
3. Go to Health & Wellness → tap **Connect**. iOS shows the Health permission sheet.
4. Approve the categories. Tara pulls your data and the rings update to your real numbers.

## What it reads (read-only — Tara never writes to Health)
- Sleep analysis → sleep score + hours
- Heart Rate Variability (SDNN) → HRV + recovery
- Resting Heart Rate → RHR + recovery
- Step Count → steps
- Active Energy Burned → active energy

## Apple review notes
- The Health usage description is set in `app.json` (the config plugin adds the required
  `NSHealthShareUsageDescription` to Info.plist and the HealthKit entitlement).
- Apple requires that health data is used only as described and not for advertising — Tara's
  privacy policy and data-safety answers already state this.

## Other wearables (Oura, WHOOP, Fitbit, Garmin)
These show in onboarding as "coming soon." Most of their data also flows into Apple Health /
Google Health Connect, so connecting Apple Health often already captures them. Direct
integrations can be added later via each provider's API.
