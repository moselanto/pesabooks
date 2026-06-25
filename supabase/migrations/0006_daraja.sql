-- =====================================================================
-- PesaBooks — 0006: Daraja / M-Pesa callback support. Depends on 0001–0005.
-- =====================================================================

create table if not exists mpesa_shortcodes (
  shortcode text primary key,
  business_id uuid not null references businesses(id) on delete cascade,
  kind text not null default 'till'
);
create index if not exists mpesa_shortcodes_business_idx on mpesa_shortcodes (business_id);

create table if not exists stk_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  checkout_request_id text unique,
  merchant_request_id text,
  plan plan_tier not null,
  amount numeric(14,2) not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
create index if not exists stk_requests_business_idx on stk_requests (business_id);

create or replace function resolve_shortcode(p_shortcode text)
returns table (business_id uuid)
language sql security definer set search_path = public as $$
  select business_id from mpesa_shortcodes where shortcode = p_shortcode limit 1;
$$;

revoke all on function resolve_shortcode(text) from public, authenticated;

-- transactions.unique(business_id, mpesa_ref) from 0001 makes C2B inserts idempotent.
alter table mpesa_shortcodes enable row level security;
alter table stk_requests enable row level security;
