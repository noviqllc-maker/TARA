# Deploy checklist — Supabase server code (credits, history, RevenueCat webhook)

Server code (Supabase migrations + edge functions) is **not** shipped by a Metro
reload or an app rebuild. It only goes live when you push migrations and deploy the
functions. Skipping this makes a purchase **charge but never grant** — a confusing,
money-involved failure. Run this whenever `supabase/migrations/**` or
`supabase/functions/**` changed.

Project ref: **`daiqcbbegstszrwypkac`**
Base URL: `https://daiqcbbegstszrwypkac.supabase.co`

---

## 1. Link check (deploying to the wrong project fails silently)

```bash
supabase projects list                       # confirm the linked ref
# if not linked to the right one:
supabase link --project-ref daiqcbbegstszrwypkac
```

## 2. Secrets BEFORE functions (so they boot with the values available)

```bash
supabase secrets list                        # shows NAMES only, not values
```

- **`REVENUECAT_SECRET_KEY`** — RevenueCat dashboard → your project → API Keys →
  **Secret keys (V1, starts `sk_`)**. Used by the `credits` function's redeem
  fast-path. If `secrets list` already shows it, skip re-setting.
  ```bash
  supabase secrets set REVENUECAT_SECRET_KEY=sk_xxxxxxxxxxxxxxxxxxxx
  ```
- **`REVENUECAT_WEBHOOK_AUTH`** — you invent this; any long random string. Same value
  goes into RevenueCat in step 4.
  ```bash
  openssl rand -hex 32                        # copy the output
  supabase secrets set REVENUECAT_WEBHOOK_AUTH=<that-output>
  ```

## 3. Push DB + deploy functions

```bash
supabase db push
supabase functions deploy credits        --no-verify-jwt
supabase functions deploy rc-webhook     --no-verify-jwt
supabase functions deploy delete-account --no-verify-jwt
```

`db push` applies both migrations:
- `20260716120000_user_credits.sql` — auth-keyed `user_credits`, `credit_purchases`,
  `user_data` + RLS + `ensure_user_credits` / `decrement_credit` / `redeem_purchase`.
- `20260719120000_ask_history.sql` — `ask_history` (RLS, own rows).

**On `--no-verify-jwt`:** required for `rc-webhook` (RevenueCat can't send a Supabase
JWT). Safe for `credits` and `delete-account` because they **verify the JWT inside the
function** — each reads the `Authorization: Bearer` token, calls `auth.getUser(token)`,
returns **401** on missing/invalid, and derives the user id from the verified token
(never a client-supplied id). With the gateway check off, that internal verification is
the only thing stopping anonymous calls to a credit/deletion endpoint — confirmed
present:
- `credits/index.ts` → `getUser(token)` + 401, grants key on the verified `uid`.
- `delete-account/index.ts` → `getUser(token)` + 401, deletes only that `uid`'s rows.

## 4. Point RevenueCat at the webhook

RevenueCat dashboard → your project → **Integrations → Webhooks → Add webhook**:

- **URL:** `https://daiqcbbegstszrwypkac.supabase.co/functions/v1/rc-webhook`
- **Authorization header:** the exact `REVENUECAT_WEBHOOK_AUTH` value from step 2.
- **Environment:** make sure **sandbox events are not filtered out** (for tonight's
  testing). The handler does **not** reject `environment: "SANDBOX"` — it gates only on
  event type (purchase), product id (a credit pack), a UUID `app_user_id`, and a
  transaction id. So sandbox purchases will grant.

## 5. Verify the pipe before touching the app

RevenueCat webhook page → **Send test event** / recent-deliveries view → confirm it
returns **200**. If it errors, read **Supabase dashboard → Edge Functions → rc-webhook
→ Logs** — every payload is logged (`[rc-webhook] received …`), plus the grant result
or the skip reason. Debugging here is far faster than through a real purchase.

## 6. End-to-end money test

1. **Sign in** → check RC logs show the **Supabase UID** as the app user id (not an
   anonymous `xxxxxxxx-…` that isn't your uid).
2. **Burn credits** down to 0 → the out-of-credits screen appears.
3. **Buy `ask_credits_5`** → balance lands (success state) and you return to the
   question page with the pending question preserved.
4. **Reinstall** (delete app → reinstall → sign in) → **balance + Past questions
   survive**, and there is **no re-grant** of the signup bonus.

---

## Notes / gotchas

- **Double-grant guard:** `rc-webhook` and the `credits` redeem fast-path both call the
  idempotent `redeem_purchase`, keyed by the **App Store store transaction id**
  (`event.transaction_id` vs REST `store_transaction_id`). These match for the App
  Store, so no double credit. If they ever diverge, drop the client redeem tick in
  `useCredits.buy` and rely on the webhook alone.
- **Identity linkage:** the app calls `Purchases.logIn(uid)` on **every** session
  (sign-in *and* restore). If RC logs still show an anonymous id, a purchase can't be
  attributed — recheck that fix (`src/hooks/useAuth.tsx` → `linkRevenueCat`).
- **Env config:** the client also needs `EXPO_PUBLIC_SUPABASE_URL` /
  `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env` and a Metro restart (`npx expo start -c`),
  and a native build (`npx expo run:ios`) for `expo-apple-authentication`.
