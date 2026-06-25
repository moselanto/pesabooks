'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="empty">
      <h4>Something went wrong</h4>
      <p>{error.message || 'We could not load this page.'}</p>
      <button className="btn btn-solid" style={{ maxWidth: 200, margin: '16px auto 0' }} onClick={reset}>
        Try again
      </button>
    </div>
  );
}
