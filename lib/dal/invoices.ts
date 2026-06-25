import { getServerClient } from '@/lib/supabase/server';

export interface InvoiceRow {
  id: string;
  number: string;
  status: string;
  etims_status: string;
  total: number;
  issued_at: string | null;
  customers: { name: string | null } | null;
}

export interface ListInvoiceFilters {
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export async function listInvoices(businessId: string, f: ListInvoiceFilters = {}) {
  const sb = getServerClient();
  const page = f.page ?? 0;
  const size = f.pageSize ?? 25;
  let q = sb
    .from('invoices')
    .select('id, number, status, etims_status, total, issued_at, customers(name)', { count: 'exact' })
    .eq('business_id', businessId)
    .order('issued_at', { ascending: false })
    .range(page * size, page * size + size - 1);
  if (f.status && f.status !== 'all') q = q.eq('status', f.status);
  if (f.from) q = q.gte('issued_at', f.from);
  if (f.to) q = q.lte('issued_at', f.to);
  if (f.search) q = q.ilike('number', `%${f.search}%`);
  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: (data ?? []) as unknown as InvoiceRow[], total: count ?? 0 };
}

export async function getInvoiceSummary(businessId: string, from: string, to: string) {
  const sb = getServerClient();
  const { data, error } = await sb
    .from('invoices')
    .select('status, total')
    .eq('business_id', businessId)
    .gte('issued_at', from)
    .lte('issued_at', to);
  if (error) throw error;
  const rows = (data ?? []) as { status: string; total: number }[];
  const sum = (s: string) =>
    rows.filter((r) => r.status === s).reduce((a, r) => a + Number(r.total), 0);
  return { paid: sum('paid'), pending: sum('issued'), overdue: sum('overdue') };
}
