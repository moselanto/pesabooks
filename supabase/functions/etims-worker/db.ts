import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const sb = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

export async function claimBatch(limit = 20) {
  const { data, error } = await sb.rpc('claim_etims_batch', { p_limit: limit });
  if (error) throw error;
  return data ?? [];
}

export async function loadInvoiceContext(businessId: string, invoiceId: string) {
  const { data, error } = await sb.from('invoices')
    .select(
      'id, number, subtotal, vat_amount, total, currency, issued_at, customer_id, ' +
        'invoice_items(description, qty, unit_price, line_total), ' +
        'customers(name, kra_pin), ' +
        'businesses(name, kra_pin, mpesa_till, tax_regime)',
    )
    .eq('business_id', businessId).eq('id', invoiceId).single();
  if (error) throw error;
  return data;
}

export async function recordAccepted(
  id: string, businessId: string, invoiceId: string,
  res: { controlUnitNo: string; qrPayload: string; raw: unknown },
) {
  await sb.from('etims_submissions').update({
    status: 'accepted', control_unit_no: res.controlUnitNo, qr_payload: res.qrPayload,
    submitted_at: new Date().toISOString(), last_error: null, raw_response: res.raw,
  }).eq('id', id);
  await sb.from('invoices').update({ etims_status: 'accepted' }).eq('id', invoiceId);
  await sb.from('audit_log').insert({
    business_id: businessId, action: 'etims.accepted', entity: 'etims_submission', entity_id: id,
    meta: { control_unit_no: res.controlUnitNo },
  });
}

export async function recordFailure(
  id: string, businessId: string, invoiceId: string,
  opts: { attempts: number; message: string; raw?: unknown; nextAttemptAt: Date | null },
) {
  const giveUp = opts.nextAttemptAt === null;
  await sb.from('etims_submissions').update({
    status: giveUp ? 'failed' : 'retrying',
    last_error: opts.message.slice(0, 500),
    raw_response: opts.raw ?? null,
    next_attempt_at: (opts.nextAttemptAt ?? new Date()).toISOString(),
  }).eq('id', id);
  await sb.from('invoices').update({ etims_status: giveUp ? 'failed' : 'retrying' }).eq('id', invoiceId);
  if (giveUp) {
    await sb.from('audit_log').insert({
      business_id: businessId, action: 'etims.failed', entity: 'etims_submission', entity_id: id,
      meta: { attempts: opts.attempts, error: opts.message },
    });
  }
}
