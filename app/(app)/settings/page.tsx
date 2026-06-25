import { getActiveBusinessId } from '@/lib/server/tenant';
import { getSubscription, listPayments, getBusiness } from '@/lib/dal/billing';
import { fmtKES, fmtDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

const PLAN_LABEL: Record<string, string> = { free: 'Free', starter: 'Starter', pro: 'Pro' };

export default async function SettingsPage() {
  const businessId = await getActiveBusinessId();
  if (!businessId) {
    return (
      <div className="empty">
        <h4>No business yet</h4>
        <p>Finish onboarding to manage your settings and billing.</p>
      </div>
    );
  }

  const [sub, payments, biz] = await Promise.all([
    getSubscription(businessId),
    listPayments(businessId),
    getBusiness(businessId),
  ]);

  return (
    <>
      <div className="app-top">
        <div>
          <h3>Settings</h3>
          <div className="sub">Business profile and billing</div>
        </div>
      </div>

      <div className="panel">
        <h4>Your plan</h4>
        <p style={{ fontSize: 14, margin: 0 }}>
          <b>{sub ? PLAN_LABEL[sub.plan] ?? sub.plan : 'Free'}</b>
          {sub?.current_period_end ? ` · renews ${fmtDate(sub.current_period_end)} via M-Pesa` : ''}
          {sub ? ` · ${sub.status}` : ''}
        </p>
      </div>

      <div className="panel">
        <h4>Business profile</h4>
        <table>
          <tbody>
            <tr>
              <td>Name</td>
              <td>
                <b>{biz.name}</b>
              </td>
            </tr>
            <tr>
              <td>KRA PIN</td>
              <td>{biz.kra_pin ?? '—'}</td>
            </tr>
            <tr>
              <td>Till / Paybill</td>
              <td>{biz.mpesa_till ?? biz.mpesa_paybill ?? '—'}</td>
            </tr>
            <tr>
              <td>Tax regime</td>
              <td>{String(biz.tax_regime).replace('_', ' ')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h4>Billing history</h4>
        {payments.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>No payments yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{fmtDate(p.created_at)}</td>
                  <td>{p.method.replace('_', ' ')}</td>
                  <td>{fmtKES(p.amount)}</td>
                  <td>
                    <span className={`badge ${p.status === 'success' ? 'ok' : p.status === 'failed' ? 'fail' : 'pend'}`}>
                      {p.status}
                    </span>
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
