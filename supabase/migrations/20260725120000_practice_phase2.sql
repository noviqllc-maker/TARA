-- Practice Hub phase 2 — server persistence for the Evening Ritual and Sankalpa.
-- All free; no entitlement gating. UUID-keyed to auth.users with ON DELETE CASCADE, matching
-- daily_checkin / practice_log (policies use `auth.uid() = user_id`, no ::text cast).

-- 1. Evening Ritual — extend the existing per-day practice_log with the ritual's completion
--    flag and the optional one-line evening reflection.
alter table public.practice_log add column if not exists evening_done boolean not null default false;
alter table public.practice_log add column if not exists evening_note text;

-- 2. Sankalpa — a short intention set under an auspicious window, revisited at the next
--    window of the same type. Client-generated text id so upserts/updates round-trip cleanly.
create table if not exists public.sankalpa (
  id           text primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  window_type  text not null,               -- 'amavasya' | 'purnima' | 'sankranti' | 'ekadashi'
  window_label text not null,               -- display name of the window it was set under
  set_date     date not null,
  text         text not null,               -- the intention (short)
  state        text not null default 'active', -- active | reflected | renewed | completed
  reflect_note text,                         -- optional note added on revisit
  updated_at   timestamptz not null default now()
);

alter table public.sankalpa enable row level security;

drop policy if exists "read own sankalpa"   on public.sankalpa;
drop policy if exists "insert own sankalpa" on public.sankalpa;
drop policy if exists "update own sankalpa" on public.sankalpa;
drop policy if exists "delete own sankalpa" on public.sankalpa;
create policy "read own sankalpa"   on public.sankalpa for select using (auth.uid() = user_id);
create policy "insert own sankalpa" on public.sankalpa for insert with check (auth.uid() = user_id);
create policy "update own sankalpa" on public.sankalpa for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own sankalpa" on public.sankalpa for delete using (auth.uid() = user_id);

create index if not exists sankalpa_user_window_idx on public.sankalpa (user_id, window_type, set_date desc);
