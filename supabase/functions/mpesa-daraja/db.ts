import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const sb = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

export async function resolveShortcode(shortcode: string): Promise<string | null> {
  const { data } = await sb.rpc('resolve_shortcode', { p_shortcode: shortcode });
  const row = Array.isArray(data) ? data[0] : data;
  return row?.business_id ?? null;
}

export async function insertTransaction(t: {
  businessId: string; direction: 'in' | 'out'; source: string;
  amount: number; counterparty: string | null; mpesaRef: string;
  description: string; occurredAt: string;
  category: string; status: string; aiConfidence: number | null; aiReason: string | null;
  matchedInvoiceId?: string | null;
}) {
  const { data, error } = await sb.from('transactions')
    .upsert(
      {
        business_id: t.businessId, direction: t.direction, source: t.source,
        amount: t.amount, counterparty: t.counterparty, mpesa_ref: t.mpesaRef,
        description: t.description, occurred_at: t.occurredAt,
        category: t.category, status: t.status,
        ai_confidence: t.aiConfidence, ai_reason: t.aiReason,
        matched_invoice_id: t.matchedInvoiceId ?? null,
      },
      { onConflict: 'business_id,mpesa_ref', ignoreDuplicates: true },
    )
    .select('id').maybeSingle();
  if (error) throw error;
  return data?.id ?? null; // null => duplicate (already processed)
}

export async function listOpenInvoices(businessId: string) {
  const { data } = await sb.from('invoices')
    .select('id, number, total, customer_id, customers(name, phone)')
    .eq('business_id', businessId).in('status', ['issued', 'overdue']);
  return data ?? [];
}

export async function markInvoicePaid(businessId: string, invoiceId: string) {
  await sb.from('invoices').update({ status: 'paid' })
    .eq('business_id', businessId).eq('id', invoiceId).in('status', ['issued', 'overdue']);
}

export async function audit(businessId: string, action: string, entityId: string | null, meta: unknown) {
  await sb.from('audit_log').insert({ business_id: businessId, action, entity_id: entityId, meta });
}
