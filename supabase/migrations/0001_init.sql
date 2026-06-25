-- =====================================================================
-- PesaBooks — 0001 init: multi-tenant schema + RLS
-- Auth: phone OTP via auth.users. Tenancy: businesses + memberships.
-- =====================================================================
create extension if not exists "pgcrypto";

-- ---------- Enums ----------
do $$ begin create type membership_role as enum ('owner','admin','accountant','staff'); exception when duplicate_object then null; end $$;
do $$ begin create type business_type as enum ('retail','services','vat_registered'); exception when duplicate_object then null; end $$;
do $$ begin create type tax_regime as enum ('turnover_tax','vat','exempt'); exception when duplicate_object then null; end $$;
do $$ begin create type plan_tier as enum ('free','starter','pro'); exception when duplicate_object then null; end $$;
do $$ begin create type sub_status as enum ('active','past_due','cancelled','trialing'); exception when duplicate_object then null; end $$;
do $$ begin create type txn_direction as enum ('in','out'); exception when duplicate_object then null; end $$;
do $$ begin create type txn_source as enum ('mpesa_till','mpesa_paybill','mpesa_send','mpesa_receive','cash','bank','card'); exception when duplicate_object then null; end $$;
do $$ begin create type txn_category as enum ('sale','purchase','utilities','transport','rent','salaries','personal','transfer','other','uncategorized'); exception when duplicate_object then null; end $$;
do $$ begin create type txn_status as enum ('unmatched','auto_matched','confirmed','excluded','duplicate'); exception when duplicate_object then null; end $$;
do $$ begin create type invoice_status as enum ('draft','issued','paid','overdue','void'); exception when duplicate_object then null; end $$;
do $$ begin create type etims_status as enum ('not_required','queued','submitting','accepted','failed','retrying'); exception when duplicate_object then null; end $$;
do $$ begin create type wa_msg_direction as enum ('inbound','outbound'); exception when duplicate_object then null; end $$;

-- ---------- Tables ----------
create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kra_pin text,
  business_type business_type not null default 'retail',
  tax_regime tax_regime not null default 'turnover_tax',
  mpesa_till text, mpesa_paybill text,
  phone text not null, county text,
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role membership_role not null default 'owner',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);
create index if not exists memberships_user_active_idx on memberships (user_id) where is_active;

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null, phone text, kra_pin text,
  created_at timestamptz not null default now()
);
create index if not exists customers_business_idx on customers (business_id);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  number text not null,
  status invoice_status not null default 'draft',
  etims_status etims_status not null default 'queued',
  subtotal numeric(14,2) not null default 0,
  vat_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  currency text not null default 'KES',
  issued_at timestamptz, due_at timestamptz,
  created_by uuid references auth.users(id),
  created_via text default 'dashboard',
  created_at timestamptz not null default now(),
  unique (business_id, number)
);
create index if not exists invoices_business_status_idx on invoices (business_id, status);
create index if not exists invoices_business_issued_idx on invoices (business_id, issued_at desc);

create table if not exists invoice_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  qty numeric(12,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0
);
create index if not exists invoice_items_invoice_idx on invoice_items (invoice_id);

create table if not exists etims_submissions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  status etims_status not null default 'queued',
  control_unit_no text, qr_payload text,
  submitted_at timestamptz, attempts int not null default 0,
  last_error text, raw_response jsonb,
  created_at timestamptz not null default now()
);
create index if not exists etims_business_status_idx on etims_submissions (business_id, status);
create index if not exists etims_invoice_idx on etims_submissions (invoice_id);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  direction txn_direction not null,
  source txn_source not null,
  category txn_category not null default 'uncategorized',
  status txn_status not null default 'unmatched',
  amount numeric(14,2) not null,
  counterparty text, mpesa_ref text, description text,
  occurred_at timestamptz not null,
  matched_invoice_id uuid references invoices(id) on delete set null,
  ai_confidence numeric(4,3), ai_reason text,
  created_at timestamptz not null default now(),
  unique (business_id, mpesa_ref)
);
create index if not exists txns_business_status_idx on transactions (business_id, status);
create index if not exists txns_business_time_idx on transactions (business_id, occurred_at desc);
create index if not exists txns_matched_invoice_idx on transactions (matched_invoice_id);

create table if not exists tax_periods (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  period_start date not null, period_end date not null,
  regime tax_regime not null,
  gross_sales numeric(14,2) not null default 0,
  tax_due numeric(14,2) not null default 0,
  filed boolean not null default false, filed_at timestamptz,
  unique (business_id, period_start, period_end, regime)
);
create index if not exists tax_periods_business_idx on tax_periods (business_id, period_start desc);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  plan plan_tier not null default 'free',
  status sub_status not null default 'active',
  current_period_end date,
  created_at timestamptz not null default now(),
  unique (business_id)
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  subscription_id uuid references subscriptions(id) on delete set null,
  amount numeric(14,2) not null,
  method text not null default 'mpesa_stk',
  mpesa_ref text, status text not null default 'pending',
  paid_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists payments_business_status_idx on payments (business_id, status);

create table if not exists wa_identities (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  wa_phone text not null, user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (wa_phone)
);
create index if not exists wa_identities_business_idx on wa_identities (business_id);

create table if not exists wa_messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  direction wa_msg_direction not null,
  wa_phone text not null, body text, intent text, payload jsonb,
  created_at timestamptz not null default now()
);
create index if not exists wa_messages_business_time_idx on wa_messages (business_id, created_at desc);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  actor uuid references auth.users(id),
  action text not null, entity text, entity_id uuid, meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_business_time_idx on audit_log (business_id, created_at desc);

-- ---------- Helpers ----------
create or replace function auth_business_ids()
returns setof uuid language sql stable security definer set search_path = public, auth as $$
  select business_id from memberships where user_id = auth.uid() and is_active = true
$$;

create or replace function has_role(b uuid, roles membership_role[])
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists(select 1 from memberships
    where business_id = b and user_id = auth.uid() and is_active and role = any(roles))
$$;

create or replace function next_invoice_number(b uuid)
returns text language plpgsql security definer set search_path = public as $$
declare n int; begin
  select count(*) + 1 into n from invoices where business_id = b;
  return 'INV-' || lpad(n::text, 4, '0');
end $$;

-- ---------- RLS ----------
alter table businesses enable row level security;
alter table memberships enable row level security;
alter table customers enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table etims_submissions enable row level security;
alter table transactions enable row level security;
alter table tax_periods enable row level security;
alter table subscriptions enable row level security;
alter table payments enable row level security;
alter table wa_identities enable row level security;
alter table wa_messages enable row level security;
alter table audit_log enable row level security;

drop policy if exists biz_select on businesses;
create policy biz_select on businesses for select using (id in (select auth_business_ids()));
drop policy if exists biz_update on businesses;
create policy biz_update on businesses for update
  using (has_role(id, array['owner','admin']::membership_role[]))
  with check (has_role(id, array['owner','admin']::membership_role[]));

drop policy if exists mem_select on memberships;
create policy mem_select on memberships for select
  using (user_id = auth.uid() or business_id in (select auth_business_ids()));
drop policy if exists mem_admin_write on memberships;
create policy mem_admin_write on memberships for all
  using (has_role(business_id, array['owner','admin']::membership_role[]))
  with check (has_role(business_id, array['owner','admin']::membership_role[]));

do $$
declare t text;
begin
  foreach t in array array[
    'customers','invoices','invoice_items','etims_submissions','transactions',
    'tax_periods','subscriptions','payments','wa_identities','wa_messages','audit_log'
  ] loop
    execute format('drop policy if exists tenant_select on %I;', t);
    execute format($f$create policy tenant_select on %I for select using (business_id in (select auth_business_ids()));$f$, t);
    execute format('drop policy if exists tenant_insert on %I;', t);
    execute format($f$create policy tenant_insert on %I for insert with check (business_id in (select auth_business_ids()));$f$, t);
    execute format('drop policy if exists tenant_update on %I;', t);
    execute format($f$create policy tenant_update on %I for update using (business_id in (select auth_business_ids())) with check (business_id in (select auth_business_ids()));$f$, t);
    execute format('drop policy if exists tenant_delete on %I;', t);
    execute format($f$create policy tenant_delete on %I for delete using (business_id in (select auth_business_ids()));$f$, t);
  end loop;
end $$;

drop policy if exists tax_file_update on tax_periods;
create policy tax_file_update on tax_periods for update
  using (has_role(business_id, array['owner','admin','accountant']::membership_role[]))
  with check (has_role(business_id, array['owner','admin','accountant']::membership_role[]));

-- audit_log: insert-only from client paths; block updates/deletes (no policy = denied).
drop policy if exists tenant_update on audit_log;
drop policy if exists tenant_delete on audit_log;
