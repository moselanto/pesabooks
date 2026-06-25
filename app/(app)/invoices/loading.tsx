export default function Loading() {
  return (
    <>
      <div className="app-top">
        <div>
          <h3>Invoices</h3>
          <div className="sub">Loading…</div>
        </div>
      </div>
      <div className="kpis">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="kpi" style={{ height: 78 }} />
        ))}
      </div>
      <div className="panel" style={{ height: 240 }} />
    </>
  );
}
