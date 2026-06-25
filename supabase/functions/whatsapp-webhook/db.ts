import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const sb = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

export async function resolveBusiness(waPhone: string): Promise<string | null> {
  const { data } = await sb.rpc('resolve_wa_business', { p_wa_phone: waPhone });
  const row = Array.isArray(data) ? data[0] : data;
  return row?.business_id ?? null;
}

export async function logMessage(
  businessId: string | null, waPhone: string,
  direction: 'inbound' | 'outbound', body: string, intent?: string, payload?: unknown,
) {
  if (!businessId) return;
  await sb.from('wa_messages').insert({ business_id: businessId, wa_phone: waPhone, direction, body, intent, payload });
}

export async function getSession(waPhone: string) {
  const { data } = await sb.from('wa_sessions').select('*').eq('wa_phone', waPhone).maybeSingle();
  return data ?? { wa_phone: waPhone, business_id: null, state: 'idle', context: {} };
}

export async function setSession(
  waPhone: string,
  patch: { business_id?: string | null; state?: string; context?: unknown },
) {
  await sb.from('wa_sessions').upsert({ wa_phone: waPhone, updated_at: new Date().toISOString(), ...patch });
}

// deno-lint-ignore no-explicit-any
export async function createInvoice(businessId: string, items: any[], customerId?: string | null) {
  const { data, error } = await sb.rpc('create_invoice', {
    p_business_id: businessId, p_customer_id: customerId ?? null, p_items: items, p_via: 'whatsapp',
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function createBusinessForWa(userId: string, name: string, phone: string, kraPin?: string) {
  const { data, error } = await sb.rpc('create_business_with_owner', {
    p_user_id: userId, p_name: name, p_phone: phone, p_kra_pin: kraPin ?? null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  await sb.from('wa_identities').insert({ business_id: row.business_id, wa_phone: phone, user_id: userId });
  return row.business_id as string;
}
