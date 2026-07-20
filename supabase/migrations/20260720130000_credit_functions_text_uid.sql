-- Fix 42883 "operator does not exist: text = uuid" in the credit RPCs.
--
-- public.user_credits.user_id is TEXT in the deployed database (it pre-existed from an
-- older schema, and the rc-webhook writes event.app_user_id into it as text). The
-- previous functions declared `uid uuid := auth.uid()` and compared `user_id = uid`,
-- i.e. text = uuid, which Postgres rejects. Re-create both client RPCs comparing and
-- inserting against auth.uid() CAST TO TEXT so every reference to the text column lines
-- up. Behaviour is otherwise identical (5-credit signup grant once; int balance;
-- decrement returns new balance or -1 for insufficient).
--
-- Scope: only ensure_user_credits() and decrement_credit() compare user_id to auth.uid().
--   - redeem_purchase(p_user_id uuid) is unchanged: it only INSERTs (uuid → text
--     assignment cast is implicit and already works — the webhook wrote balance=140),
--     never compares user_id to auth.uid().
--   - credit_purchases is touched only by redeem_purchase (service role); its RLS is
--     never evaluated by a client query, so no text/uuid comparison runs there.
--   - ask_history is a new uuid-keyed table; client queries compare uuid = uuid.
-- The stored text is the canonical lowercase dashed uuid form in every path (auth.uid()
-- ::text and the webhook's uuid → text insert both produce it), so rows line up.

-- ensure_user_credits(): no-arg client read. Grants the 5-credit signup bonus once, then
-- returns the current balance as int (what useCredits.loadBalance destructures).
create or replace function public.ensure_user_credits()
returns int language plpgsql security definer set search_path = public as $$
declare uid text := auth.uid()::text; bal int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  insert into public.user_credits (user_id, balance, granted_signup_bonus)
  values (uid, 5, true)
  on conflict (user_id) do nothing;
  select balance into bal from public.user_credits where user_id = uid;
  return bal;
end; $$;

-- decrement_credit(): no-arg client spend. Atomically spends one credit for auth.uid()
-- only if balance > 0; returns the new balance, or -1 when there is nothing to spend.
create or replace function public.decrement_credit()
returns int language plpgsql security definer set search_path = public as $$
declare uid text := auth.uid()::text; new_balance int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  update public.user_credits set balance = balance - 1, updated_at = now()
   where user_id = uid and balance > 0
  returning balance into new_balance;
  if not found then return -1; end if;   -- 0 balance → reject, distinct from an error
  return new_balance;
end; $$;

-- CREATE OR REPLACE preserves grants, but re-assert them so this migration is self-contained.
revoke all on function public.ensure_user_credits() from public;
revoke all on function public.decrement_credit()    from public;
grant execute on function public.ensure_user_credits() to authenticated;
grant execute on function public.decrement_credit()   to authenticated;
