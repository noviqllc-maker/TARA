-- Feedback & data-persistence: (1) thumbs feedback on Ask Tara answers, (2/3) a server
-- store for the Daily Check-in (mood journal + "how accurate was Tara") keyed by user+date.
--
-- ask_history is UUID-keyed (see 20260719120000): its working insert/select/delete policies
-- use `auth.uid() = user_id` with NO cast — so the new UPDATE policy matches that, NOT the
-- ::text cast used for the (text-keyed) user_credits family.

-- 1. Answer feedback: 1 = 👍, -1 = 👎, null = no rating. One rating per answer, changeable.
alter table public.ask_history add column if not exists feedback smallint;

drop policy if exists "update own history" on public.ask_history;
create policy "update own history" on public.ask_history
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2/3. Daily check-in — one row per (user, date). Upserted on save; restored on open, so it
-- survives reinstall. Holds the mood journal (mood/energy/stress/notes) AND the accuracy
-- rating ("Accurate" / "Somewhat Accurate" / "Not Accurate").
create table if not exists public.daily_checkin (
  user_id     uuid not null references auth.users(id) on delete cascade,
  entry_date  date not null,
  mood        text,
  energy      int,
  stress      int,
  notes       text,
  accuracy    text,
  updated_at  timestamptz not null default now(),
  primary key (user_id, entry_date)
);

alter table public.daily_checkin enable row level security;

drop policy if exists "read own checkin"   on public.daily_checkin;
drop policy if exists "insert own checkin" on public.daily_checkin;
drop policy if exists "update own checkin" on public.daily_checkin;
drop policy if exists "delete own checkin" on public.daily_checkin;
create policy "read own checkin"   on public.daily_checkin for select using (auth.uid() = user_id);
create policy "insert own checkin" on public.daily_checkin for insert with check (auth.uid() = user_id);
create policy "update own checkin" on public.daily_checkin for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own checkin" on public.daily_checkin for delete using (auth.uid() = user_id);
