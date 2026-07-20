-- Premium Ask Tara fair-use cap: 100 questions per calendar month.
--
-- Premium users bypass the credit decrement; instead each question atomically increments
-- a per-user, per-month counter. At 100 the RPC returns -1 (a "fair-use reached" signal
-- the client distinguishes from out-of-credits). Keyed on auth.uid()::text — the same
-- TEXT/uuid cast pattern as decrement_credit (user_credits.user_id is TEXT in this DB).

create table if not exists public.premium_ask_usage (
  user_id     text not null,
  month       text not null,            -- 'YYYY-MM' (server calendar month, UTC)
  count       int  not null default 0 check (count >= 0),
  updated_at  timestamptz not null default now(),
  primary key (user_id, month)
);

alter table public.premium_ask_usage enable row level security;
-- Read-own (writes go only through the SECURITY DEFINER RPCs below).
create policy "read own premium usage" on public.premium_ask_usage
  for select using (auth.uid()::text = user_id);

-- Monthly cap. Single source of truth for both RPCs.
create or replace function public.premium_ask_cap() returns int
  language sql immutable as $$ select 100 $$;

-- Remaining questions this month for the caller (read-only; for display).
-- Returns cap when no row yet; never negative.
create or replace function public.premium_ask_status()
returns int language plpgsql security definer set search_path = public as $$
declare uid text := auth.uid()::text; m text := to_char(now(), 'YYYY-MM'); c int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select count into c from public.premium_ask_usage where user_id = uid and month = m;
  return greatest(0, public.premium_ask_cap() - coalesce(c, 0));
end; $$;

-- Atomically authorize ONE premium question for the current calendar month. Increments
-- only while under the cap; returns the REMAINING count after this question, or -1 when
-- the cap is already reached (nothing incremented). Race-safe via the conditional
-- ON CONFLICT ... WHERE.
create or replace function public.increment_premium_ask()
returns int language plpgsql security definer set search_path = public as $$
declare uid text := auth.uid()::text; m text := to_char(now(), 'YYYY-MM'); cap int := public.premium_ask_cap(); c int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  insert into public.premium_ask_usage (user_id, month, count)
  values (uid, m, 1)
  on conflict (user_id, month)
    do update set count = public.premium_ask_usage.count + 1, updated_at = now()
    where public.premium_ask_usage.count < cap
  returning count into c;
  if c is null then return -1; end if;   -- at/over cap → nothing updated
  return greatest(0, cap - c);           -- remaining after this question
end; $$;

revoke all on function public.premium_ask_status()    from public;
revoke all on function public.increment_premium_ask() from public;
grant execute on function public.premium_ask_status()    to authenticated;
grant execute on function public.increment_premium_ask() to authenticated;
