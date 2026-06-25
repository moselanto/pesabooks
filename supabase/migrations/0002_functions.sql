-- =====================================================================
-- PesaBooks — 0002: core RPCs (create_business_with_owner, create_invoice)
-- Depends on 0001.
-- =====================================================================

create or replace function create_business_with_owner(
  p_user_id uuid, p_name text, p_phone text, p_kra_pin text default null
)
returns table (business_id uuid)
language plpgsql security definer set search_path = public, auth as $$
declare v_business_id uuid;
begin
  if p_user_id is null or coalesce(trim(p_name),'') = '' or coalesce(trim(p_phone),'') = '' then
    raise exception 'user_id, name and phone are required';
  end if;

  insert into businesses (name, phone, kra_pin)
  values (trim(p_name), trim(p_phone), nullif(trim(coalesce(p_kra_pin,'')), ''))
  returning id into v_business_id;

  insert into memberships (business_id, user_id, role, is_active)
  values (v_business_id, p_user_id, 'owner', true);

  insert into subscriptions (business_id, plan, status)
  values (v_business_id, 'free', 'active')
  on conflict (business_id) do nothing;

  insert into audit_log (business_id, actor, action, entity, entity_id, meta)
  values (v_business_id, p_user_id, 'business.created', 'business', v_business_id,
          jsonb_build_object('name', p_name));

  return query select v_business_id;
end; $$;

create or replace function create_invoice(
  p_business_id uuid, p_customer_id uuid, p_items jsonb, p_via text default 'dashboard'
)
returns table (invoice_id uuid, number text)
language plpgsql security definer set search_path = public, auth as $$
declare
  v_uid uuid := auth.uid();
  v_invoice_id uuid; v_number text;
  v_subtotal numeric(14,2) := 0;
  v_item jsonb; v_qty numeric(12,2); v_price numeric(14,2); v_line numeric(14,2);
  v_regime tax_regime;
begin
  if v_uid is not null and not exists (
    select 1 from memberships where business_id = p_business_id and user_id = v_uid and is_active
  ) then
    raise exception 'not a member of business %', p_business_id using errcode = '42501';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'at least one line item is required';
  end if;

  select tax_regime into v_regime from businesses where id = p_business_id;
  if v_regime is null then raise exception 'business % not found', p_business_id; end if;

  v_number := next_invoice_number(p_business_id);

  insert into invoices (business_id, customer_id, number, status, etims_status, created_by, created_via, issued_at)
  values (p_business_id, p_customer_id, v_number, 'issued', 'queued', v_uid, coalesce(p_via,'dashboard'), now())
  returning id into v_invoice_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := coalesce((v_item->>'qty')::numeric, 1);
    v_price := coalesce((v_item->>'unit_price')::numeric, 0);
    v_line := round(v_qty * v_price, 2);
    v_subtotal := v_subtotal + v_line;
    insert into invoice_items (business_id, invoice_id, description, qty, unit_price, line_total)
    values (p_business_id, v_invoice_id, coalesce(v_item->>'description','Item'), v_qty, v_price, v_line);
  end loop;

  update invoices
  set subtotal = v_subtotal,
      vat_amount = case when v_regime = 'vat' then round(v_subtotal * 0.16, 2) else 0 end,
      total = case when v_regime = 'vat' then round(v_subtotal * 1.16, 2) else v_subtotal end
  where id = v_invoice_id;

  insert into etims_submissions (business_id, invoice_id, status, attempts)
  values (p_business_id, v_invoice_id, 'queued', 0);

  insert into audit_log (business_id, actor, action, entity, entity_id, meta)
  values (p_business_id, v_uid, 'invoice.issued', 'invoice', v_invoice_id,
          jsonb_build_object('number', v_number, 'via', p_via, 'subtotal', v_subtotal));

  return query select v_invoice_id, v_number;
end; $$;

revoke all on function create_invoice(uuid, uuid, jsonb, text) from public;
grant execute on function create_invoice(uuid, uuid, jsonb, text) to authenticated;
revoke all on function create_business_with_owner(uuid, text, text, text) from public, authenticated;
