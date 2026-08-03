-- Practice Hub phase 3 — server persistence for Mauna (kept silence). All free; no gating.
-- Extends the existing per-day practice_log (UUID-keyed to auth.users, ON DELETE CASCADE).
-- Svādhyāya (Teaching of the Day) needs no server storage — the teaching for any date is
-- recomputed deterministically, so there's nothing to persist for it here.

alter table public.practice_log add column if not exists mauna_done boolean not null default false;
