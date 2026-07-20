-- Ask Tara question history — server-side, survives reinstall. RLS so a user can only
-- read and write their own rows. Deleting the auth user cascades these away.
create table if not exists public.ask_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  question    text not null,
  answer      text not null,
  factor      text,
  created_at  timestamptz not null default now()
);

alter table public.ask_history enable row level security;

create policy "read own history"   on public.ask_history for select using (auth.uid() = user_id);
create policy "insert own history"  on public.ask_history for insert with check (auth.uid() = user_id);
create policy "delete own history"  on public.ask_history for delete using (auth.uid() = user_id);

create index if not exists ask_history_user_created_idx
  on public.ask_history (user_id, created_at desc);
