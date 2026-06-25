import { getActiveBusinessId } from '@/lib/server/tenant';
import { getCurrentTaxPeriod, getSubmissionHealth } from '@/lib/dal/tax';
import { fmtKES, fmtDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function EtimsPage() {
  const businessId = await getActiveBusinessId();
  if (!businessId) {
    return (
      <div className="empty">
        <h4>No business yet</h4>
        <p>Finish onboarding to connect KRA and track tax.</p>
      </div>
    );
  }

  const [tax, health] = await Promise.all([
    getCurrentTaxPeriod(businessId),
    getSubmissionHealth(businessId),
  ]);

  return (
    <>
      <div className="app-top">
        <div>
          <h3>eTIMS &amp; Tax</h3>
          <div className="sub">KRA submission health and tax due</div>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi">
          <div className="lbl">Submitted to KRA</div>
          <div className="val" style={{ color: 'var(--green)' }}>{health.accepted}/{health.total}</div>
        </div>
        <div className="kpi">
          <div className="lbl">Pending / retrying</div>
          <div className="val">{health.pending}</div>
        </div>
        <div className="kpi">
          <div className="lbl">Failed</div>
          <div className="val" style={{ color: health.failed ? '#a11' : 'var(--ink)' }}>{health.failed}</div>
        </div>
        <div className="kpi">
          <div className="lbl">Tax due</div>
          <div className="val">{tax ? fmtKES(tax.tax_due) : 'KES 0'}</div>
        </div>
      </div>

      <div className="panel">
        <h4>Current tax period</h4>
        {tax ? (
          <table>
            <tbody>
              <tr>
                <td>Period</td>
                <td>
                  {fmtDate(tax.period_start)} – {fmtDate(tax.period_end)}
                </td>
              </tr>
              <tr>
                <td>Regime</td>
                <td>{tax.regime.replace('_', ' ')}</td>
              </tr>
              <tr>
                <td>Gross sales</td>
                <td>{fmtKES(tax.gross_sales)}</td>
              </tr>
              <tr>
                <td>Tax due</td>
                <td>
                  <b>{fmtKES(tax.tax_due)}</b>
                </td>
              </tr>
              <tr>
                <td>Status</td>
                <td>
                  <span className={`badge ${tax.filed ? 'ok' : 'pend'}`}>
                    {tax.filed ? 'Filed' : 'Due'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
            No tax period yet. It will appear once you start issuing invoices.
          </p>
        )}
      </div>
    </>
  );
}
