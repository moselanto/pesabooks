import { sb, audit } from './db.ts';

// Called from /stk/callback with Safaricom's STK result body.
// deno-lint-ignore no-explicit-any
export async function handleStkCallback(body: any) {
  const cb = body?.Body?.stkCallback;
  if (!cb) return;
  const checkoutId = cb.CheckoutRequestID as string;
  const ok = cb.ResultCode === 0;

  const { data: reqRow } = await sb.from('stk_requests')
    .select('*').eq('checkout_request_id', checkoutId).maybeSingle();
  if (!reqRow) return;

  let mpesaRef: string | null = null;
  let amount = Number(reqRow.amount);
  if (ok) {
    const items = cb.CallbackMetadata?.Item ?? [];
    // deno-lint-ignore no-explicit-any
    mpesaRef = items.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value ?? null;
    // deno-lint-ignore no-explicit-any
    amount = Number(items.find((i: any) => i.Name === 'Amount')?.Value ?? amount);
  }

  await sb.from('stk_requests').update({ status: ok ? 'success' : 'failed' })
    .eq('checkout_request_id', checkoutId);

  await sb.from('payments').insert({
    business_id: reqRow.business_id, amount, method: 'mpesa_stk',
    mpesa_ref: mpesaRef, status: ok ? 'success' : 'failed',
    paid_at: ok ? new Date().toISOString() : null,
  });

  if (ok) {
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    await sb.from('subscriptions').upsert(
      {
        business_id: reqRow.business_id, plan: reqRow.plan, status: 'active',
        current_period_end: periodEnd.toISOString().slice(0, 10),
      },
      { onConflict: 'business_id' },
    );
    await audit(reqRow.business_id, 'subscription.activated', reqRow.business_id, { plan: reqRow.plan, amount });
  } else {
    await audit(reqRow.business_id, 'payment.failed', reqRow.business_id, { checkoutId });
  }
}
