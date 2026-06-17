# Tara — What was fixed & how to run

This build fixes the four issues from your screenshots and updates the project to Expo SDK 54
(matching your Expo Go app).

## What changed
1. **"TARA" wordmark + loading text now render correctly.** Fonts (Fraunces + Outfit) are now
   BUNDLED inside the app (`assets/fonts/`) and loaded before the UI shows — no more blocky
   letters or misaligned text. The old version tried to load fonts over the network and failed.
2. **Birth time is now a native time picker.** Tap the big time chip and spin the dial — no typing.
3. **Birthplace now supports Google Places autocomplete** (see key setup below). Until a key is
   added, it's a clean text field so it never looks broken.
4. **App icon** is now set to the Tara star logo.

## Run it
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npx expo start --clear
```
Then scan the QR with Expo Go.

## Add your Google Places API key (for birthplace autocomplete)
1. Go to console.cloud.google.com → create/select a project.
2. Enable **Places API**.
3. Create an API key (APIs & Services → Credentials).
4. Open `app.json` and paste it here:
   ```json
   "extra": { "googlePlacesApiKey": "YOUR_KEY_HERE" }
   ```
5. Restart: `npx expo start --clear`. Typing a city will now show live suggestions.

> Note: the Places API is a paid Google service (it has a free monthly credit). Restrict the
> key to the Places API and your app's bundle ID in the Google console before shipping.
