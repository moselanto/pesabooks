import { getServerClient } from '@/lib/supabase/server';

export interface TaxPeriod {
  id: string;
  period_start: string;
  period_end: string;
  regime: string;
  gross_sales: number;
  tax_due: number;
  filed: boolean;
}

export async function getCurrentTaxPeriod(businessId: string): Promise<TaxPeriod | null> {
  const sb = getServerClient();
  const { data, error } = await sb
    .from('tax_periods')
    .select('*')
    .eq('business_id', businessId)
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as TaxPeriod) ?? null;
}

export async function listTaxPeriods(businessId: string): Promise<TaxPeriod[]> {
  const sb = getServerClient();
  const { data, error } = await sb
    .from('tax_periods')
    .select('*')
    .eq('business_id', businessId)
    .order('period_start', { ascending: false });
  if (error) throw error;
  return (data ?? []) as TaxPeriod[];
}

export interface SubmissionHealth {
  total: number;
  accepted: number;
  failed: number;
  pending: number;
}

export async function getSubmissionHealth(businessId: string): Promise<SubmissionHealth> {
  const sb = getServerClient();
  const { data, error } = await sb
    .from('etims_submissions')
    .select('status')
    .eq('business_id', businessId);
  if (error) throw error;
  const rows = (data ?? []) as { status: string }[];
  return {
    total: rows.length,
    accepted: rows.filter((r) => r.status === 'accepted').length,
    failed: rows.filter((r) => r.status === 'failed').length,
    pending: rows.filter((r) => ['queued', 'submitting', 'retrying'].includes(r.status)).length,
  };
}
