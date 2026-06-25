-- =====================================================================
-- PesaBooks — 0005: WhatsApp support. Depends on 0001–0004.
-- =====================================================================

create table if not exists wa_sessions (
  wa_phone text primary key,
  business_id uuid references businesses(id) on delete cascade,
  state text not null default 'idle',
  context jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function resolve_wa_business(p_wa_phone text)
returns table (business_id uuid)
language sql security definer set search_path = public as $$
  select business_id from wa_identities where wa_phone = p_wa_phone limit 1;
$$;

revoke all on function resolve_wa_business(text) from public, authenticated;

-- Written only by the service-role webhook; RLS on with no client policies = client-denied.
alter table wa_sessions enable row level security;
