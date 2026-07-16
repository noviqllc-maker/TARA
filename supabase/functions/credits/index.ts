// supabase/functions/credits/index.ts
// Server-authoritative Ask Tara question credits. The device NEVER sets a balance —
// it can only read it and request atomic changes here. Uses the service-role key for
// the DB and the RevenueCat SECRET key to independently verify purchases.
//
// Deploy:  supabase functions deploy credits --no-verify-jwt
// Secrets: supabase secrets set REVENUECAT_SECRET_KEY=sk_...   (RevenueCat REST secret)
//          (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically)
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RC_SECRET = Deno.env.get('REVENUECAT_SECRET_KEY') ?? '';

// Authoritative product → credits mapping. MUST match App Store Connect / RevenueCat.
const CREDIT_PRODUCTS: Record<string, number> = {
  ask_credits_5: 5,
  ask_credits_10: 10,
  ask_credits_25: 25,
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { action, appUserId } = await req.json();
    if (!appUserId || typeof appUserId !== 'string') return json({ error: 'appUserId required' }, 400);

    // BALANCE — grants the 5-credit signup bonus exactly once, then returns the balance.
    if (action === 'balance') {
      const { data, error } = await db.rpc('ensure_user_credits', { p_user_id: appUserId });
      if (error) return json({ error: 'db_error', detail: error.message }, 500);
      return json({ balance: data ?? 0 });
    }

    // DECREMENT — the ONLY way a question is authorized. Atomic; rejects at 0.
    if (action === 'decrement') {
      await db.rpc('ensure_user_credits', { p_user_id: appUserId }); // make sure the row/bonus exists
      const { data, error } = await db.rpc('decrement_credit', { p_user_id: appUserId });
      if (error) return json({ error: 'db_error', detail: error.message }, 500);
      if (data === -1) return json({ ok: false, balance: 0, error: 'no_credits' }, 402);
      return json({ ok: true, balance: data });
    }

    // REDEEM — verify the purchase directly with RevenueCat, then credit uncredited
    // transactions (idempotent by store transaction id). Never trusts the client.
    if (action === 'redeem') {
      if (!RC_SECRET) return json({ error: 'server_not_configured' }, 500);
      const rc = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
        headers: { Authorization: `Bearer ${RC_SECRET}` },
      });
      if (!rc.ok) return json({ error: 'revenuecat_error', status: rc.status }, 502);
      const sub = await rc.json();
      const nonSubs = sub?.subscriber?.non_subscriptions ?? {};

      let added = 0;
      for (const productId of Object.keys(CREDIT_PRODUCTS)) {
        const amount = CREDIT_PRODUCTS[productId];
        const txns: any[] = nonSubs[productId] ?? [];
        for (const t of txns) {
          const txnId = String(t?.store_transaction_id ?? t?.id ?? '');
          if (!txnId) continue;
          const { data: credited, error } = await db.rpc('redeem_purchase', {
            p_txn_id: txnId, p_user_id: appUserId, p_product_id: productId, p_amount: amount,
          });
          if (error) return json({ error: 'db_error', detail: error.message }, 500);
          if (credited) added += amount;
        }
      }

      const { data: bal } = await db.rpc('ensure_user_credits', { p_user_id: appUserId });
      return json({ balance: bal ?? 0, added });
    }

    return json({ error: 'unknown_action' }, 400);
  } catch (e) {
    return json({ error: 'bad_request', detail: String(e).slice(0, 200) }, 400);
  }
});
