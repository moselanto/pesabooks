import { resolveShortcode, insertTransaction, markInvoicePaid, audit } from './db.ts';
import { categorize } from './categorize.ts';
import { findInvoiceMatch } from './match.ts';
import { handleStkCallback } from './billing.ts';

// Optional allowlist: only accept callbacks from Safaricom IP ranges (set in env).
function ipAllowed(req: Request): boolean {
  const allow = (Deno.env.get('DARAJA_ALLOWED_IPS') ?? '').split(',').filter(Boolean);
  if (allow.length === 0) return true;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  return allow.includes(ip);
}

// Daraja TransTime is yyyyMMddHHmmss in EAT.
function parseDarajaDate(s?: string): string | null {
  if (!s || s.length !== 14) return null;
  const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}+03:00`;
  const d = new Date(iso);
  return isNaN(+d) ? null : d.toISOString();
}

Deno.serve(async (req) => {
  if (!ipAllowed(req)) return new Response('forbidden', { status: 403 });
  const url = new URL(req.url);
  const path = url.pathname.split('/').pop(); // confirm | validate | callback
  const body = await req.json().catch(() => ({}));

  // C2B validation (optional).
  if (path === 'validate') {
    return Response.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }

  // C2B confirmation: a real customer payment landed.
  if (path === 'confirm') {
    const shortcode = String(body.BusinessShortCode ?? body.ShortCode ?? '');
    const businessId = await resolveShortcode(shortcode);
    if (!businessId) return Response.json({ ResultCode: 0, ResultDesc: 'Accepted' });

    const amount = Number(body.TransAmount ?? 0);
    const mpesaRef = String(body.TransID ?? '');
    const payerPhone = body.MSISDN ? String(body.MSISDN) : null;
    const payerName = [body.FirstName, body.MiddleName, body.LastName].filter(Boolean).join(' ') || null;
    const accountRef = body.BillRefNumber ? String(body.BillRefNumber) : null;
    const occurredAt = parseDarajaDate(body.TransTime) ?? new Date().toISOString();

    const cat = await categorize({
      direction: 'in', counterparty: payerName, source: 'mpesa_till', amount, description: accountRef ?? '',
    });
    const match = await findInvoiceMatch(businessId, { amount, payerPhone, accountRef });

    const txnId = await insertTransaction({
      businessId, direction: 'in', source: 'mpesa_till', amount,
      counterparty: payerName ?? payerPhone, mpesaRef, description: accountRef ?? 'M-Pesa payment',
      occurredAt, category: match.invoiceId ? 'sale' : cat.category,
      status: match.invoiceId ? 'auto_matched' : (cat.confidence >= 0.85 ? 'auto_matched' : 'unmatched'),
      aiConfidence: cat.confidence, aiReason: match.invoiceId ? 'Matched to open invoice' : cat.reason,
      matchedInvoiceId: match.invoiceId,
    });

    if (txnId && match.invoiceId) {
      await markInvoicePaid(businessId, match.invoiceId);
      await audit(businessId, 'payment.matched', txnId, { invoiceId: match.invoiceId, amount });
    }

    return Response.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }

  // STK push result: subscription billing.
  if (path === 'callback') {
    await handleStkCallback(body);
    return Response.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }

  return new Response('not found', { status: 404 });
});
