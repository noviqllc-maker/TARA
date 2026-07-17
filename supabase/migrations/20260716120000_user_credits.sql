-- Ask Tara credits + per-user data, keyed to the Supabase AUTH user (uuid).
-- Server-authoritative balance; RLS so a user can only ever touch their own rows.
-- Balance mutations go through SECURITY DEFINER functions that read auth.uid(), so
-- the client can never set a balance directly. FKs to auth.users cascade on delete
-- (account deletion removes all of a user's data automatically).

create table if not exists public.user_credits (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  balance                int  not null default 0 check (balance >= 0),
  granted_signup_bonus   boolean not null default false,
  updated_at             timestamptz not null default now()
);

-- Idempotency ledger: one row per credited RevenueCat store transaction.
create table if not exists public.credit_purchases (
  txn_id      text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  product_id  text not null,
  amount      int  not null,
  created_at  timestamptz not null default now()
);

-- Per-user app data mirrored from the device (birth data/profile, journal, cached
-- reports, chat). One row per (user, key); value is the JSON blob from local storage.
create table if not exists public.user_data (
  user_id     uuid not null references auth.users(id) on delete cascade,
  key         text not null,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_credits    enable row level security;
alter table public.credit_purchases enable row level security;
alter table public.user_data        enable row level security;

-- Read-only own access on credit tables (no direct writes — see functions below).
create policy "read own credits"   on public.user_credits    for select using (auth.uid() = user_id);
create policy "read own purchases" on public.credit_purchases for select using (auth.uid() = user_id);
-- user_data: the authenticated client fully manages its own rows (sync).
create policy "crud own data"      on public.user_data       for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Grant the 5-credit signup bonus EXACTLY ONCE per auth user, then return the balance.
-- Reinstalls resolve to the SAME auth user (Apple id), so the bonus never re-grants.
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

-- Atomically authorize one question for the CALLER (auth.uid()). Returns the new
-- balance, or -1 to reject (0 balance). Race-safe via UPDATE ... WHERE balance > 0.
create or replace function public.decrement_credit()
returns int language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); new_balance int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  update public.user_credits set balance = balance - 1, updated_at = now()
   where user_id = uid and balance > 0
  returning balance into new_balance;
  if not found then return -1; end if;
  return new_balance;
end; $$;

grant execute on function public.ensure_user_credits() to authenticated;
grant execute on function public.decrement_credit()   to authenticated;

-- Credit a verified purchase EXACTLY ONCE (called by the credits edge function with
-- the service role, after it verifies the txn with RevenueCat). Not client-callable.
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
