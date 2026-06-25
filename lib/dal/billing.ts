import { getServerClient } from '@/lib/supabase/server';

export interface Subscription {
  plan: string;
  status: string;
  current_period_end: string | null;
}

export interface PaymentRow {
  id: string;
  amount: number;
  method: string;
  status: string;
  created_at: string;
}

export async function getSubscription(businessId: string): Promise<Subscription | null> {
  const sb = getServerClient();
  const { data, error } = await sb
    .from('subscriptions')
    .select('plan, status, current_period_end')
    .eq('business_id', businessId)
    .maybeSingle();
  if (error) throw error;
  return (data as Subscription) ?? null;
}

export async function listPayments(businessId: string): Promise<PaymentRow[]> {
  const sb = getServerClient();
  const { data, error } = await sb
    .from('payments')
    .select('id, amount, method, status, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PaymentRow[];
}

export async function getBusiness(businessId: string) {
  const sb = getServerClient();
  const { data, error } = await sb
    .from('businesses')
    .select('name, kra_pin, mpesa_till, mpesa_paybill, tax_regime')
    .eq('id', businessId)
    .single();
  if (error) throw error;
  return data;
}
