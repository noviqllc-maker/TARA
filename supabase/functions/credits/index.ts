// supabase/functions/credits/index.ts
// Purchase redemption for Ask Tara credits. This is the ONE credit operation that
// needs a secret (the RevenueCat V1 REST key) + the service role, so it lives here;
// balance/decrement are RLS-protected client RPCs (see the migration).
//
// The caller is identified by their Supabase JWT (never a client-supplied id). We
// verify the purchase directly with RevenueCat and credit uncredited transactions
// idempotently.
//
// Deploy:  supabase functions deploy credits --no-verify-jwt
// Secret:  supabase secrets set REVENUECAT_SECRET_KEY=<RevenueCat V1 secret key>
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RC_SECRET = Deno.env.get('REVENUECAT_SECRET_KEY') ?? ''; // RevenueCat V1 secret key

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
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    if (!RC_SECRET) return json({ error: 'server_not_configured' }, 500);

    // Identify the caller from their Supabase JWT — never trust a client-sent id.
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'missing_token' }, 401);
    const { data: userData, error: userErr } = await db.auth.getUser(token);
    const uid = userData?.user?.id;
    if (userErr || !uid) return json({ error: 'invalid_token' }, 401);

    // RevenueCat V1: read the subscriber and their non-subscription (consumable) txns.
    const rc = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(uid)}`, {
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
          p_txn_id: txnId, p_user_id: uid, p_product_id: productId, p_amount: amount,
        });
        if (error) return json({ error: 'db_error', detail: error.message }, 500);
        if (credited) added += amount;
      }
    }

    const { data: row } = await db.from('user_credits').select('balance').eq('user_id', uid).maybeSingle();
    return json({ balance: row?.balance ?? 0, added });
  } catch (e) {
    return json({ error: 'bad_request', detail: String(e).slice(0, 200) }, 400);
  }
});
