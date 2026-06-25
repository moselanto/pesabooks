import { getServerClient } from '@/lib/supabase/server';

export interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  invoiced: number;
  outstanding: number;
}

// Lists customers with invoice aggregates computed in-app (simple + RLS-safe).
export async function listCustomers(businessId: string, search?: string): Promise<CustomerRow[]> {
  const sb = getServerClient();

  let cq = sb.from('customers').select('id, name, phone').eq('business_id', businessId).order('name');
  if (search) cq = cq.ilike('name', `%${search}%`);
  const { data: customers, error: cErr } = await cq;
  if (cErr) throw cErr;

  const { data: invoices, error: iErr } = await sb
    .from('invoices')
    .select('customer_id, total, status')
    .eq('business_id', businessId);
  if (iErr) throw iErr;

  const inv = (invoices ?? []) as { customer_id: string | null; total: number; status: string }[];
  return ((customers ?? []) as { id: string; name: string; phone: string | null }[]).map((c) => {
    const mine = inv.filter((i) => i.customer_id === c.id);
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      invoiced: mine.reduce((a, i) => a + Number(i.total), 0),
      outstanding: mine
        .filter((i) => i.status === 'issued' || i.status === 'overdue')
        .reduce((a, i) => a + Number(i.total), 0),
    };
  });
}
