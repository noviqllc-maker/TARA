-- Ask Tara question credits — SERVER-AUTHORITATIVE balance.
-- The device never sets the balance; it only reads it and requests atomic changes
-- through the `credits` edge function (service role). RLS denies all direct client
-- access; the service role bypasses RLS.

create table if not exists public.user_credits (
  user_id                text primary key,          -- RevenueCat app_user_id (anonymous or account)
  balance                int  not null default 0 check (balance >= 0),
  granted_signup_bonus   boolean not null default false,
  updated_at             timestamptz not null default now()
);

-- Idempotency ledger: one row per credited RevenueCat store transaction, so the
-- same purchase can never be credited twice (even if redeem is called repeatedly).
create table if not exists public.credit_purchases (
  txn_id      text primary key,                     -- RevenueCat store_transaction_id
  user_id     text not null,
  product_id  text not null,
  amount      int  not null,
  created_at  timestamptz not null default now()
);

alter table public.user_credits    enable row level security;
alter table public.credit_purchases enable row level security;
-- No policies → no anon/authenticated access. Only the service role (edge fn) reaches these.

-- Grant the 5-credit signup bonus EXACTLY ONCE per user_id. Reinstalls that reuse the
-- same RevenueCat id hit the ON CONFLICT no-op, so the bonus is never re-granted.
create or replace function public.ensure_user_credits(p_user_id text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare bal int;
begin
  insert into public.user_credits (user_id, balance, granted_signup_bonus)
  values (p_user_id, 5, true)
  on conflict (user_id) do nothing;

  select balance into bal from public.user_credits where user_id = p_user_id;
  return bal;
end;
$$;

-- Atomically authorize one question: decrement iff balance > 0. Returns the new
-- balance, or -1 to signal rejection (no credits). The single UPDATE ... WHERE
-- balance > 0 is race-safe under concurrent calls.
create or replace function public.decrement_credit(p_user_id text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare new_balance int;
begin
  update public.user_credits
     set balance = balance - 1, updated_at = now()
   where user_id = p_user_id and balance > 0
  returning balance into new_balance;

  if not found then
    return -1;  -- 0 balance (or unknown user) → reject
  end if;
  return new_balance;
end;
$$;

-- Credit a verified purchase EXACTLY ONCE. Inserts the transaction into the ledger;
-- only if that insert is new (not a duplicate) does it add the credits. Returns true
-- when credited, false when the transaction was already processed.
create or replace function public.redeem_purchase(
  p_txn_id text, p_user_id text, p_product_id text, p_amount int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.credit_purchases (txn_id, user_id, product_id, amount)
  values (p_txn_id, p_user_id, p_product_id, p_amount)
  on conflict (txn_id) do nothing;

  if not found then
    return false;  -- already credited
  end if;

  insert into public.user_credits (user_id, balance, granted_signup_bonus)
  values (p_user_id, p_amount, false)
  on conflict (user_id)
    do update set balance = public.user_credits.balance + p_amount, updated_at = now();

  return true;
end;
$$;
