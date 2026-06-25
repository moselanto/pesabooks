const TIERS = [
  {
    name: 'Free',
    price: 'KES 0',
    note: 'To get started',
    features: ['10 invoices / month', 'KRA eTIMS invoices', 'WhatsApp access'],
    hot: false,
  },
  {
    name: 'Starter',
    price: 'KES 500',
    per: '/mo',
    note: 'For growing shops',
    features: ['Unlimited invoices', 'AI bookkeeping', 'M-Pesa categorization', 'Reports'],
    hot: true,
  },
  {
    name: 'Pro',
    price: 'KES 1,500',
    per: '/mo',
    note: 'Full automation',
    features: ['Everything in Starter', 'M-Pesa reconciliation', 'One-tap tax filing', 'Accountant access'],
    hot: false,
  },
];

export default function Pricing() {
  return (
    <section className="section" id="pricing">
      <div className="section-head">
        <span className="eyebrow">Pricing</span>
        <h2>Small, fair, and paid with M-Pesa. No cards.</h2>
      </div>
      <div className="tiers">
        {TIERS.map((t) => (
          <div className={`tier${t.hot ? ' hot' : ''}`} key={t.name}>
            {t.hot && <span className="tier-badge">Most popular</span>}
            <b className="tier-name">{t.name}</b>
            <div className="tier-price">
              {t.price}
              {t.per && <span className="tier-per">{t.per}</span>}
            </div>
            <div className="tier-note">{t.note}</div>
            <ul className="tier-features">
              {t.features.map((f) => (
                <li key={f}>
                  <span className="tick">✓</span> {f}
                </li>
              ))}
            </ul>
            <a className={`btn ${t.hot ? 'btn-solid' : 'btn-outline'}`} href="#start">
              Start free
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
