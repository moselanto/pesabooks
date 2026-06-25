import Link from 'next/link';
import './dashboard.css';

const NAV = [
  { href: '/dashboard', label: 'Home' },
  { href: '/invoices', label: 'Invoices' },
  { href: '/mpesa', label: 'M-Pesa' },
  { href: '/etims', label: 'eTIMS & Tax' },
  { href: '/reports', label: 'Reports' },
  { href: '/settings', label: 'Settings' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="app-side">
        <div className="app-brand">
          <div className="app-mark">P</div>
          <div>
            <b>PesaBooks</b>
            <span>AI Bookkeeper</span>
          </div>
        </div>
        <nav className="app-nav">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}>
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <section className="app-content">{children}</section>
    </div>
  );
}
