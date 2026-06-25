import { claimBatch, loadInvoiceContext, recordAccepted, recordFailure } from './db.ts';
import { submitToOscu, KraError } from './kra.ts';
import { nextAttemptAt, isRetryable } from './backoff.ts';

Deno.serve(async (req) => {
  // Only the cron/scheduler with the shared secret may invoke.
  if (req.headers.get('x-worker-secret') !== Deno.env.get('WORKER_SECRET')) {
    return new Response('forbidden', { status: 403 });
  }

  const batch = await claimBatch(20);
  const results: Record<string, string> = {};

  await Promise.all(
    // deno-lint-ignore no-explicit-any
    batch.map(async (sub: any) => {
      try {
        const ctx = await loadInvoiceContext(sub.business_id, sub.invoice_id);
        const out = await submitToOscu(ctx);
        await recordAccepted(sub.id, sub.business_id, sub.invoice_id, out);
        results[sub.id] = 'accepted';
      } catch (e) {
        const err = e instanceof KraError ? e : new KraError((e as Error).message, null);
        const retry = isRetryable(err.httpStatus, err.code);
        const next = retry ? nextAttemptAt(sub.attempts) : null;
        await recordFailure(sub.id, sub.business_id, sub.invoice_id, {
          attempts: sub.attempts, message: err.message, raw: err.raw, nextAttemptAt: next,
        });
        results[sub.id] = next ? 'retrying' : 'failed';
      }
    }),
  );

  return Response.json({ claimed: batch.length, results });
});
