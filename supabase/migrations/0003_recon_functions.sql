-- =====================================================================
-- PesaBooks — 0003: reconciliation RPCs. Depends on 0001 + 0002.
-- =====================================================================

create or replace function confirm_transaction(
  p_business_id uuid, p_txn_id uuid, p_category txn_category,
  p_invoice_id uuid default null, p_exclude boolean default false
)
returns void language plpgsql security definer set search_path = public, auth as $$
declare v_uid uuid := auth.uid(); v_new_status txn_status;
begin
  if v_uid is not null and not exists (
    select 1 from memberships where business_id = p_business_id and user_id = v_uid and is_active
  ) then
    raise exception 'not a member of business %', p_business_id using errcode = '42501';
  end if;

  if not exists (select 1 from transactions where id = p_txn_id and business_id = p_business_id) then
    raise exception 'transaction % not found for business %', p_txn_id, p_business_id;
  end if;

  v_new_status := case when p_exclude then 'excluded'::txn_status else 'confirmed'::txn_status end;

  update transactions
  set category = case when p_exclude then 'personal'::txn_category else p_category end,
      status = v_new_status, matched_invoice_id = p_invoice_id
  where id = p_txn_id and business_id = p_business_id;

  if p_invoice_id is not null then
    update invoices set status = 'paid'
    where id = p_invoice_id and business_id = p_business_id and status in ('issued','overdue');
  end if;

  insert into audit_log (business_id, actor, action, entity, entity_id, meta)
  values (p_business_id, v_uid, 'txn.confirmed', 'transaction', p_txn_id,
          jsonb_build_object('category', p_category, 'excluded', p_exclude, 'invoice_id', p_invoice_id));
end; $$;

create or replace function confirm_all_suggested(
  p_business_id uuid, p_min_confidence numeric default 0.85
)
returns integer language plpgsql security definer set search_path = public, auth as $$
declare v_uid uuid := auth.uid(); v_count int;
begin
  if v_uid is not null and not exists (
    select 1 from memberships where business_id = p_business_id and user_id = v_uid and is_active
  ) then
    raise exception 'not a member of business %', p_business_id using errcode = '42501';
  end if;

  with upd as (
    update transactions set status = 'confirmed'
    where business_id = p_business_id and status in ('unmatched','auto_matched')
      and ai_confidence >= p_min_confidence and category <> 'uncategorized'
    returning id
  ) select count(*) into v_count from upd;

  insert into audit_log (business_id, actor, action, entity, entity_id, meta)
  values (p_business_id, v_uid, 'txn.bulk_confirmed', 'transaction', null,
          jsonb_build_object('count', v_count, 'min_confidence', p_min_confidence));

  return v_count;
end; $$;

revoke all on function confirm_transaction(uuid, uuid, txn_category, uuid, boolean) from public;
grant execute on function confirm_transaction(uuid, uuid, txn_category, uuid, boolean) to authenticated;
revoke all on function confirm_all_suggested(uuid, numeric) from public;
grant execute on function confirm_all_suggested(uuid, numeric) to authenticated;
