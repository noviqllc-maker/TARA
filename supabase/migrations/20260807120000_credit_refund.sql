-- Refund one Ask Tara authorization when the answer cannot be parsed/delivered, so a broken
-- model response never costs the user a credit. Mirrors decrement_credit /
-- increment_premium_ask exactly (auth.uid()::text, SECURITY DEFINER, search_path=public).
-- Both are user-favorable and floored, so a stray double-refund can never go negative.

-- refund_credit(): give one credit back to the caller. Returns the new balance, or -1 if the
-- caller has no credits row yet (shouldn't happen after ensure_user_credits).
create or replace function public.refund_credit()
returns int language plpgsql security definer set search_path = public as $$
declare uid text := auth.uid()::text; new_balance int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  update public.user_credits set balance = balance + 1, updated_at = now()
   where user_id = uid
  returning balance into new_balance;
  if not found then return -1; end if;
  return new_balance;
end; $$;

-- refund_premium_ask(): undo one increment of the current month's premium counter (floor 0).
-- Returns the REMAINING count after the refund (matches increment_premium_ask's return shape).
create or replace function public.refund_premium_ask()
returns int language plpgsql security definer set search_path = public as $$
declare uid text := auth.uid()::text; m text := to_char(now(), 'YYYY-MM'); cap int := public.premium_ask_cap(); c int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  update public.premium_ask_usage set count = greatest(0, count - 1), updated_at = now()
   where user_id = uid and month = m
  returning count into c;
  return greatest(0, cap - coalesce(c, 0));
end; $$;

revoke all on function public.refund_credit()      from public;
revoke all on function public.refund_premium_ask() from public;
grant execute on function public.refund_credit()      to authenticated;
grant execute on function public.refund_premium_ask() to authenticated;
