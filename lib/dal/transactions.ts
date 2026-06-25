import { getServerClient } from '@/lib/supabase/server';

export interface ReconStats {
  autoMatched: number;
  needsReview: number;
  duplicates: number;
  netInflow: number;
}

export interface ReviewRow {
  id: string;
  occurred_at: string;
  source: string;
  counterparty: string | null;
  category: string;
  amount: number;
  direction: 'in' | 'out';
  ai_confidence: number | null;
  ai_reason: string | null;
}

export async function getReconStats(businessId: string, from: string, to: string): Promise<ReconStats> {
  const sb = getServerClient();
  const { data, error } = await sb
    .from('transactions')
    .select('status, direction, amount')
    .eq('business_id', businessId)
    .gte('occurred_at', from)
    .lte('occurred_at', to);
  if (error) throw error;
  const rows = (data ?? []) as { status: string; direction: 'in' | 'out'; amount: number }[];
  return {
    autoMatched: rows.filter((r) => r.status === 'auto_matched' || r.status === 'confirmed').length,
    needsReview: rows.filter((r) => r.status === 'unmatched' || r.status === 'auto_matched').length,
    duplicates: rows.filter((r) => r.status === 'duplicate').length,
    netInflow: rows.reduce((a, r) => a + (r.direction === 'in' ? Number(r.amount) : -Number(r.amount)), 0),
  };
}

export async function listNeedsReview(businessId: string): Promise<ReviewRow[]> {
  const sb = getServerClient();
  const { data, error } = await sb
    .from('transactions')
    .select('id, occurred_at, source, counterparty, category, amount, direction, ai_confidence, ai_reason')
    .eq('business_id', businessId)
    .in('status', ['unmatched', 'auto_matched'])
    .lt('ai_confidence', 0.85)
    .order('occurred_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ReviewRow[];
}
