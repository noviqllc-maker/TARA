// supabase/functions/delete-account/index.ts
// Account deletion (App Review guideline 5.1.1). Identifies the caller from their
// Supabase JWT, then deletes the auth user with the service role. All of the user's
// rows (user_credits, credit_purchases, user_data) are removed via ON DELETE CASCADE.
// The client also calls Purchases.logOut() around this.
//
// Deploy: supabase functions deploy delete-account --no-verify-jwt
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'missing_token' }, 401);
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    const uid = userData?.user?.id;
    if (userErr || !uid) return json({ error: 'invalid_token' }, 401);

    // Belt-and-suspenders: remove data rows explicitly, then delete the auth user
    // (which also cascades). Either alone suffices; both keeps it clean if FKs change.
    await admin.from('user_data').delete().eq('user_id', uid);
    await admin.from('credit_purchases').delete().eq('user_id', uid);
    await admin.from('user_credits').delete().eq('user_id', uid);
    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) return json({ error: 'delete_failed', detail: delErr.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: 'bad_request', detail: String(e).slice(0, 200) }, 400);
  }
});
