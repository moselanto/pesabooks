import { listOpenInvoices } from './db.ts';

// Match an inflow to an open invoice. Order of confidence:
// 1) account ref == invoice number, 2) exact amount + matching phone, 3) exact amount, single candidate.
export async function findInvoiceMatch(
  businessId: string,
  p: { amount: number; payerPhone: string | null; accountRef?: string | null },
): Promise<{ invoiceId: string | null; confident: boolean }> {
  const open = await listOpenInvoices(businessId);
  if (open.length === 0) return { invoiceId: null, confident: false };

  if (p.accountRef) {
    // deno-lint-ignore no-explicit-any
    const byRef = open.find((i: any) => i.number.toLowerCase() === p.accountRef!.trim().toLowerCase());
    if (byRef) return { invoiceId: byRef.id, confident: true };
  }

  // deno-lint-ignore no-explicit-any
  const exact = open.filter((i: any) => Math.abs(Number(i.total) - p.amount) < 1);

  if (p.payerPhone) {
    const tail = p.payerPhone.replace(/\D/g, '').slice(-9);
    // deno-lint-ignore no-explicit-any
    const byPhone = exact.find((i: any) => (i.customers?.phone ?? '').replace(/\D/g, '').endsWith(tail));
    if (byPhone) return { invoiceId: byPhone.id, confident: true };
  }

  if (exact.length === 1) return { invoiceId: exact[0].id, confident: true };
  return { invoiceId: null, confident: false };
}
