export const fmtKES = (n: number) => 'KES ' + Number(n).toLocaleString('en-KE');

export const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' }) : '—';

export function monthRange() {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString(),
  };
}
