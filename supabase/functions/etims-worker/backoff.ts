export const MAX_ATTEMPTS = 8;

// Exponential backoff with jitter: ~30s, 1m, 2m, 4m, 8m, 16m, 32m, then give up.
export function nextAttemptAt(attempts: number): Date | null {
  if (attempts >= MAX_ATTEMPTS) return null;
  const baseSeconds = 30 * Math.pow(2, attempts - 1);
  const jitter = Math.random() * 0.3 * baseSeconds;
  return new Date(Date.now() + (baseSeconds + jitter) * 1000);
}

// Validation errors are permanent; downtime/rate-limit/network are retryable.
export function isRetryable(status: number | null, code?: string): boolean {
  if (status === null) return true;
  if (status >= 500) return true;
  if (status === 429) return true;
  if (status === 408) return true;
  if (code && ['INVALID_PIN', 'INVALID_ITEM', 'DUPLICATE_INVOICE'].includes(code)) return false;
  return false;
}
