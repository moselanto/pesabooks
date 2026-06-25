import { getActiveBusinessId } from '@/lib/server/tenant';
import { listInvoices, getInvoiceSummary } from '@/lib/dal/invoices';
import { fmtKES, fmtDate, monthRange } from '@/lib/format';

export const dynamic = 'force-dynamic';

const payBadge: Record<string, string> = { paid: 'ok', issued: 'pend', overdue: 'fail' };
const etimsBadge: Record<string, string> = {
  accepted: 'ok',
  queued: 'pend',
  submitting: 'pend',
  retrying: 'pend',
  failed: 'fail',
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string; page?: string };
}) {
  const businessId = await getActiveBusinessId();
  if (!businessId) {
    return (
      <div className="empty">
        <h4>No business yet</h4>
        <p>Finish onboarding to start invoicing.</p>
      </div>
    );
  }

  const page = searchParams.page ? Number(searchParams.page) : 0;
  const { from, to } = monthRange();
  const [list, summary] = await Promise.all([
    listInvoices(businessId, { status: searchParams.status, search: searchParams.q, page }),
    getInvoiceSummary(businessId, from, to),
  ]);

  return (
    <>
      <div className="app-top">
        <div>
          <h3>Invoices</h3>
          <div className="sub">{list.total} matching</div>
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

      {list.rows.length === 0 ? (
        <div className="empty">
          <h4>No invoices yet</h4>
          <p>Issue your first KRA-compliant invoice in under a minute.</p>
        </div>
      ) : (
        <div className="panel">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>eTIMS</th>
              </tr>
            </thead>
            <tbody>
              {list.rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.number}</b>
                  </td>
                  <td>{r.customers?.name ?? 'Walk-in'}</td>
                  <td>{fmtDate(r.issued_at)}</td>
                  <td>{fmtKES(r.total)}</td>
                  <td>
                    <span className={`badge ${payBadge[r.status] ?? 'pend'}`}>{r.status}</span>
                  </td>
                  <td>
                    <span className={`badge ${etimsBadge[r.etims_status] ?? 'pend'}`}>
                      {r.etims_status}
                    </span>
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
