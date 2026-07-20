// supabase/functions/rc-webhook/index.ts
// RevenueCat webhook → grants Ask Tara credits, keyed by event.app_user_id (which is
// the Supabase user id once the app calls Purchases.logIn(uid)). Idempotent via the
// same credit_purchases ledger the client redeem uses, so the two can't double-grant.
//
// Deploy:  supabase functions deploy rc-webhook --no-verify-jwt
// Secret:  supabase secrets set REVENUECAT_WEBHOOK_AUTH=<the Authorization header value
//          you set in the RevenueCat dashboard webhook config>   (optional but recommended)
// Point the RevenueCat dashboard webhook at:  <project>/functions/v1/rc-webhook
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const WEBHOOK_AUTH = Deno.env.get('REVENUECAT_WEBHOOK_AUTH') ?? ''; // shared secret (optional)

const CREDIT_PRODUCTS: Record<string, number> = {
  ask_credits_5: 5,
  ask_credits_10: 10,
  ask_credits_25: 25,
};
// Consumable purchase event types RevenueCat may send.
const PURCHASE_TYPES = new Set(['NON_RENEWING_PURCHASE', 'NON_SUBSCRIPTION_PURCHASE', 'INITIAL_PURCHASE']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok');
  try {
    if (WEBHOOK_AUTH && req.headers.get('Authorization') !== WEBHOOK_AUTH) {
      return json({ error: 'unauthorized' }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const e = (body?.event ?? {}) as Record<string, any>;
    const type = String(e.type ?? '');
    const appUserId = String(e.app_user_id ?? '');
    const productId = String(e.product_id ?? '');
    // Store transaction id — same key the client redeem uses (store_transaction_id).
    const txnId = String(e.transaction_id ?? e.id ?? '');

    // Log exactly what we receive (the ask in 1c).
    console.log('[rc-webhook] received', JSON.stringify({ type, app_user_id: appUserId, product_id: productId, transaction_id: txnId }));

    const amount = CREDIT_PRODUCTS[productId];
    if (!PURCHASE_TYPES.has(type) || !amount) return json({ ok: true, skipped: 'not a credit purchase' });
    if (!txnId) return json({ ok: true, skipped: 'no transaction id' });

    // Grants must key on the Supabase uid. If the purchase came in under an anonymous
    // RevenueCat id (i.e. logIn hadn't run), we can't attribute it — log and skip.
    if (!UUID_RE.test(appUserId)) {
      console.warn('[rc-webhook] app_user_id is not a Supabase uid (anonymous?) — cannot attribute:', appUserId);
      return json({ ok: true, skipped: 'non-uuid app_user_id' });
    }

    const { data: credited, error } = await db.rpc('redeem_purchase', {
      p_txn_id: txnId, p_user_id: appUserId, p_product_id: productId, p_amount: amount,
    });
    if (error) { console.error('[rc-webhook] redeem_purchase error:', error.message); return json({ error: 'db_error' }, 500); }

    console.log('[rc-webhook] credited=%s (+%d) for %s txn %s', credited, amount, appUserId, txnId);
    return json({ ok: true, credited });
  } catch (err) {
    console.error('[rc-webhook] bad request:', String(err));
    return json({ error: 'bad_request' }, 400);
  }
});
