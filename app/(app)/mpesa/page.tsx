import { getActiveBusinessId } from '@/lib/server/tenant';
import { getReconStats, listNeedsReview } from '@/lib/dal/transactions';
import { fmtKES, fmtDate, monthRange } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function MpesaPage() {
  const businessId = await getActiveBusinessId();
  if (!businessId) {
    return (
      <div className="empty">
        <h4>No business yet</h4>
        <p>Finish onboarding to start reconciling M-Pesa payments.</p>
      </div>
    );
  }

  const { from, to } = monthRange();
  const [stats, queue] = await Promise.all([
    getReconStats(businessId, from, to),
    listNeedsReview(businessId),
  ]);

  return (
    <>
      <div className="app-top">
        <div>
          <h3>M-Pesa reconciliation</h3>
          <div className="sub">This month</div>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi">
          <div className="lbl">Auto-matched</div>
          <div className="val" style={{ color: 'var(--green)' }}>{stats.autoMatched}</div>
        </div>
        <div className="kpi">
          <div className="lbl">Needs review</div>
          <div className="val" style={{ color: '#92660a' }}>{stats.needsReview}</div>
        </div>
        <div className="kpi">
          <div className="lbl">Duplicates</div>
          <div className="val">{stats.duplicates}</div>
        </div>
        <div className="kpi">
          <div className="lbl">Net inflow</div>
          <div className="val">{fmtKES(stats.netInflow)}</div>
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="empty">
          <h4>All caught up</h4>
          <p>Every M-Pesa transaction this month is categorized. Nice.</p>
        </div>
      ) : (
        <div className="panel">
          <h4>Needs your review ({queue.length})</h4>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Source</th>
                <th>Counterparty</th>
                <th>AI suggestion</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((t) => (
                <tr key={t.id}>
                  <td>{fmtDate(t.occurred_at)}</td>
                  <td>{t.source.replace('mpesa_', '').replace('_', ' ')}</td>
                  <td>{t.counterparty ?? '—'}</td>
                  <td>{t.category}</td>
                  <td style={{ color: t.direction === 'in' ? 'var(--green)' : 'var(--ink)' }}>
                    {t.direction === 'in' ? '+' : '-'}
                    {fmtKES(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
