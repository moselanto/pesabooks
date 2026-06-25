-- =====================================================================
-- PesaBooks — 0004: eTIMS worker support. Depends on 0001–0003.
-- =====================================================================

alter table etims_submissions
  add column if not exists next_attempt_at timestamptz not null default now();

create index if not exists etims_claimable_idx
  on etims_submissions (status, next_attempt_at)
  where status in ('queued','retrying');

-- Atomically claim up to p_limit due rows, flip to 'submitting', return them.
create or replace function claim_etims_batch(p_limit int default 20)
returns setof etims_submissions
language plpgsql security definer set search_path = public as $$
begin
  return query
  with due as (
    select id from etims_submissions
    where status in ('queued','retrying') and next_attempt_at <= now()
    order by next_attempt_at asc
    limit p_limit
    for update skip locked
  )
  update etims_submissions e
  set status = 'submitting', attempts = e.attempts + 1
  from due where e.id = due.id
  returning e.*;
end; $$;

revoke all on function claim_etims_batch(int) from public, authenticated;
