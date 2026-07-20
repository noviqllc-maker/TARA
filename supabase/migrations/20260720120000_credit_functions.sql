-- Re-establish the credit RPCs the client depends on.
--
-- The functions ensure_user_credits() and decrement_credit() were added to
-- 20260716120000_user_credits.sql AFTER that migration had already been applied to the
-- remote DB, so `supabase db push` never (re-)created them: the client's
-- supabase.rpc('ensure_user_credits') / rpc('decrement_credit') calls fail with PGRST202
-- ("function not found"), which the app was reading as a 0 balance / "out of credits".
-- The user_credits table and redeem_purchase() already exist (the rc-webhook writes 140
-- via redeem_purchase), so this migration only (re-)creates the functions. Everything is
-- idempotent (`create table if not exists`, `create or replace`), so it is safe to run on
-- top of the current state and will NOT touch existing balances.
--
-- All three functions are SECURITY DEFINER + `set search_path = public`, keyed on the
-- SAME row shape the webhook writes: public.user_credits(user_id uuid, balance int,
-- granted_signup_bonus bool). Client calls take NO arguments and identify the caller via
-- auth.uid(); redeem_purchase is service-role only (never granted to authenticated).

-- Safety net: ensure the tables exist with the exact shape the functions/webhook use.
-- No-ops when they already exist (they do), so existing rows/balances are untouched.
create table if not exists public.user_credits (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  balance                int  not null default 0 check (balance >= 0),
  granted_signup_bonus   boolean not null default false,
  updated_at             timestamptz not null default now()
);

create table if not exists public.credit_purchases (
  txn_id      text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  product_id  text not null,
  amount      int  not null,
  created_at  timestamptz not null default now()
);

-- ensure_user_credits(): called with NO args by the client on every balance read
-- (useCredits.loadBalance, useAuth on sign-in). Grants the 5-credit signup bonus EXACTLY
-- ONCE per auth user (the app has no other free-grant path), then returns the current
-- balance as an int — which is exactly what the client destructures (`typeof data ===
-- 'number'`). Reinstalls resolve to the same auth user, so the bonus never re-grants.
create or replace function public.ensure_user_credits()
returns int language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); bal int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  insert into public.user_credits (user_id, balance, granted_signup_bonus)
  values (uid, 5, true)
  on conflict (user_id) do nothing;
  select balance into bal from public.user_credits where user_id = uid;
  return bal;
end; $$;

-- decrement_credit(): called with NO args to authorize ONE question for auth.uid().
-- Atomically spends a credit only if balance > 0 (race-safe via UPDATE ... WHERE
-- balance > 0). Returns the NEW balance on success, or -1 when there was nothing to
-- spend — the client treats -1 as "out of credits" and any thrown error as a distinct
-- failure (see useCredits.authorize).
create or replace function public.decrement_credit()
returns int language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); new_balance int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  update public.user_credits set balance = balance - 1, updated_at = now()
   where user_id = uid and balance > 0
  returning balance into new_balance;
  if not found then return -1; end if;   -- 0 balance → reject, distinct from an error
  return new_balance;
end; $$;

-- redeem_purchase(): credit a verified purchase EXACTLY ONCE, keyed by the App Store
-- store transaction id. Called by the rc-webhook and the credits edge function with the
-- service role (never client-callable). Re-created here identically so all three RPCs
-- live in one applied migration and hit the SAME user_credits row shape. Returns true if
-- it credited, false if the txn was already credited (idempotent).
create or replace function public.redeem_purchase(
  p_txn_id text, p_user_id uuid, p_product_id text, p_amount int
) returns boolean language plpgsql security definer set search_path = public as $$
begin
  insert into public.credit_purchases (txn_id, user_id, product_id, amount)
  values (p_txn_id, p_user_id, p_product_id, p_amount)
  on conflict (txn_id) do nothing;
  if not found then return false; end if;  -- already credited
  insert into public.user_credits (user_id, balance, granted_signup_bonus)
  values (p_user_id, p_amount, false)
  on conflict (user_id)
    do update set balance = public.user_credits.balance + p_amount, updated_at = now();
  return true;
end; $$;

-- Lock down execution: the two client RPCs are callable only by authenticated users
-- (identity comes from auth.uid() inside the function, never a client argument).
-- redeem_purchase stays service-role only — revoked from public, granted to no client role.
revoke all on function public.ensure_user_credits()  from public;
revoke all on function public.decrement_credit()     from public;
revoke all on function public.redeem_purchase(text, uuid, text, int) from public;
grant execute on function public.ensure_user_credits() to authenticated;
grant execute on function public.decrement_credit()   to authenticated;
