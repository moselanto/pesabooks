import { getServerClient } from '@/lib/supabase/server';

export interface ProfitAndLoss {
  income: number;
  expenses: number;
  net: number;
  byCategory: { category: string; amount: number }[];
}

export async function getProfitAndLoss(businessId: string, from: string, to: string): Promise<ProfitAndLoss> {
  const sb = getServerClient();
  const { data, error } = await sb
    .from('transactions')
    .select('direction, category, amount, status')
    .eq('business_id', businessId)
    .gte('occurred_at', from)
    .lte('occurred_at', to)
    .neq('status', 'excluded');
  if (error) throw error;
  const rows = (data ?? []) as { direction: 'in' | 'out'; category: string; amount: number }[];

  const income = rows.filter((r) => r.direction === 'in').reduce((a, r) => a + Number(r.amount), 0);
  const expenses = rows.filter((r) => r.direction === 'out').reduce((a, r) => a + Number(r.amount), 0);

  const catMap = new Map<string, number>();
  for (const r of rows.filter((x) => x.direction === 'out')) {
    catMap.set(r.category, (catMap.get(r.category) ?? 0) + Number(r.amount));
  }
  const byCategory = [...catMap.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  return { income, expenses, net: income - expenses, byCategory };
}
