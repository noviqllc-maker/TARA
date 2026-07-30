-- Practice Hub — server persistence for daily japa practice (one row per user + day), so a
-- user's completion history + streak survives a reinstall. All free; no entitlement gating.
--
-- UUID-keyed like daily_checkin / ask_history: policies use `auth.uid() = user_id` with NO
-- ::text cast (that cast is only for the text-keyed user_credits family). ON DELETE CASCADE
-- ties rows to the auth user, so account deletion removes them.

create table if not exists public.practice_log (
  user_id     uuid not null references auth.users(id) on delete cascade,
  entry_date  date not null,
  japa_rounds int  not null default 0,   -- completed mālās (×108) that day
  updated_at  timestamptz not null default now(),
  primary key (user_id, entry_date)
);

alter table public.practice_log enable row level security;

drop policy if exists "read own practice"   on public.practice_log;
drop policy if exists "insert own practice" on public.practice_log;
drop policy if exists "update own practice" on public.practice_log;
drop policy if exists "delete own practice" on public.practice_log;
create policy "read own practice"   on public.practice_log for select using (auth.uid() = user_id);
create policy "insert own practice" on public.practice_log for insert with check (auth.uid() = user_id);
create policy "update own practice" on public.practice_log for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own practice" on public.practice_log for delete using (auth.uid() = user_id);
