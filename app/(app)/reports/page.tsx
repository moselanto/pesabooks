import { getActiveBusinessId } from '@/lib/server/tenant';
import { getProfitAndLoss } from '@/lib/dal/reports';
import { listTaxPeriods } from '@/lib/dal/tax';
import { fmtKES, fmtDate, monthRange } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const businessId = await getActiveBusinessId();
  if (!businessId) {
    return (
      <div className="empty">
        <h4>No business yet</h4>
        <p>Finish onboarding to see your reports.</p>
      </div>
    );
  }

  const { from, to } = monthRange();
  const [pl, taxPeriods] = await Promise.all([
    getProfitAndLoss(businessId, from, to),
    listTaxPeriods(businessId),
  ]);

  return (
    <>
      <div className="app-top">
        <div>
          <h3>Reports</h3>
          <div className="sub">This month</div>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi">
          <div className="lbl">Income</div>
          <div className="val" style={{ color: 'var(--green)' }}>{fmtKES(pl.income)}</div>
        </div>
        <div className="kpi">
          <div className="lbl">Expenses</div>
          <div className="val">{fmtKES(pl.expenses)}</div>
        </div>
        <div className="kpi">
          <div className="lbl">Net profit</div>
          <div className="val">{fmtKES(pl.net)}</div>
        </div>
        <div className="kpi">
          <div className="lbl">Margin</div>
          <div className="val">{pl.income ? Math.round((pl.net / pl.income) * 100) : 0}%</div>
        </div>
      </div>

      <div className="panel">
        <h4>Expenses by category</h4>
        {pl.byCategory.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>No expenses recorded this month.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Amount</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {pl.byCategory.map((c) => (
                <tr key={c.category}>
                  <td>{c.category}</td>
                  <td>{fmtKES(c.amount)}</td>
                  <td>{pl.expenses ? Math.round((c.amount / pl.expenses) * 100) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <h4>Tax history</h4>
        {taxPeriods.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>No tax periods yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Regime</th>
                <th>Gross sales</th>
                <th>Tax due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {taxPeriods.map((t) => (
                <tr key={t.id}>
                  <td>
                    {fmtDate(t.period_start)} – {fmtDate(t.period_end)}
                  </td>
                  <td>{t.regime.replace('_', ' ')}</td>
                  <td>{fmtKES(t.gross_sales)}</td>
                  <td>{fmtKES(t.tax_due)}</td>
                  <td>
                    <span className={`badge ${t.filed ? 'ok' : 'pend'}`}>{t.filed ? 'Filed' : 'Due'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
