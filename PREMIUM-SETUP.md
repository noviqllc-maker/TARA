# Tara — Premium / Subscription Setup (RevenueCat)

Tara uses RevenueCat to handle Apple/Google in-app purchases, receipt validation, and
restore. The code is already wired (`src/hooks/useSubscription.tsx`, `app/paywall.tsx`,
free limit of 5 Tara AI questions). You just configure the accounts.

## Why RevenueCat
Apple and Google require digital subscriptions to use THEIR billing. RevenueCat is a thin
layer over both that gives one clean API, free up to ~$2.5k/month of revenue. It removes
the most error-prone part of shipping subscriptions.

## Steps

### A. Create the products in the stores
**App Store Connect** → your app → Subscriptions → create a group → add an auto-renewing
subscription:
- Product ID: `tara_premium_monthly`
- Price: $9.99/month
- Add a localized display name + description.

**Google Play Console** → your app → Monetize → Subscriptions → create:
- Product ID: `tara_premium_monthly`
- Base plan: monthly, $9.99, auto-renewing.

### B. RevenueCat
1. revenuecat.com → create project → add your iOS and Android apps (bundle id
   `org.tarawellness.app`).
2. Add your App Store Connect shared secret and Google service-account credentials
   (RevenueCat walks you through this).
3. Create an **Entitlement** named exactly **`premium`**.
4. Create **Products** pointing to `tara_premium_monthly` for each platform; attach them to
   the `premium` entitlement.
5. Create an **Offering** (the default "current" one) containing those packages.
6. Copy the **public SDK keys** (one for Apple, one for Google) into:
   `app.json` → `expo.extra.revenueCat.ios` and `.android`.

### C. Build & test
- Subscriptions only work in a **dev build or production build** (not Expo Go):
  `eas build --profile development --platform ios` then run it.
- Test with a **sandbox account** (iOS) or a **license tester** (Android).
- Verify: tap Upgrade on the paywall → purchase → app shows Premium, free AI limit removed.
- Test **Restore** on a second install.

## How the gate works in code
- Free users: 5 Tara AI questions, then the paywall (`FREE_LIMIT` in `app/(tabs)/tara.tsx`).
- `useSubscription().isPremium` unlocks features app-wide.
- If RevenueCat isn't configured yet, the app safely treats everyone as free — nothing
  crashes, the paywall explains setup is pending.

## App Store review tip
Reviewers WILL test the purchase. Make sure the sandbox product is "Ready to Submit" and
leave test instructions in the review notes (see store/STORE-LISTING.md).
