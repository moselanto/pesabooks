import { getActiveBusinessId } from '@/lib/server/tenant';
import { listCustomers } from '@/lib/dal/customers';
import { fmtKES } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function CustomersPage({ searchParams }: { searchParams: { q?: string } }) {
  const businessId = await getActiveBusinessId();
  if (!businessId) {
    return (
      <div className="empty">
        <h4>No business yet</h4>
        <p>Finish onboarding to start adding customers.</p>
      </div>
    );
  }

  const customers = await listCustomers(businessId, searchParams.q);
  const outstanding = customers.reduce((a, c) => a + c.outstanding, 0);

  return (
    <>
      <div className="app-top">
        <div>
          <h3>Customers</h3>
          <div className="sub">
            {customers.length} customers · {fmtKES(outstanding)} outstanding
          </div>
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="empty">
          <h4>No customers yet</h4>
          <p>Customers are added automatically when you issue invoices to them.</p>
        </div>
      ) : (
        <div className="panel">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Invoiced</th>
                <th>Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <b>{c.name}</b>
                  </td>
                  <td>{c.phone ?? '—'}</td>
                  <td>{fmtKES(c.invoiced)}</td>
                  <td>
                    {c.outstanding > 0 ? (
                      <span className="badge pend">{fmtKES(c.outstanding)}</span>
                    ) : (
                      <span className="badge ok">Settled</span>
                    )}
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
