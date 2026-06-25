import { getActiveBusinessId } from '@/lib/server/tenant';
import { getInvoiceSummary } from '@/lib/dal/invoices';
import { fmtKES, monthRange } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const businessId = await getActiveBusinessId();
  if (!businessId) {
    return (
      <div className="empty">
        <h4>No business yet</h4>
        <p>Finish onboarding to start issuing invoices and tracking your books.</p>
      </div>
    );
  }

  const { from, to } = monthRange();
  const summary = await getInvoiceSummary(businessId, from, to);

  return (
    <>
      <div className="app-top">
        <div>
          <h3>Welcome back</h3>
          <div className="sub">Here is your business this month.</div>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi">
          <div className="lbl">Paid</div>
          <div className="val">{fmtKES(summary.paid)}</div>
        </div>
        <div className="kpi">
          <div className="lbl">Pending</div>
          <div className="val">{fmtKES(summary.pending)}</div>
        </div>
        <div className="kpi">
          <div className="lbl">Overdue</div>
          <div className="val">{fmtKES(summary.overdue)}</div>
        </div>
        <div className="kpi">
          <div className="lbl">eTIMS submitted</div>
          <div className="val">100%</div>
        </div>
      </div>

      <div className="panel">
        <h4>Quick actions</h4>
        <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
          Issue an invoice, import your M-Pesa statement, or check what needs review on the
          M-Pesa and eTIMS pages.
        </p>
      </div>
    </>
  );
}
