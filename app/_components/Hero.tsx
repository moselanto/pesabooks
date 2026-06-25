export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-copy">
          <div className="hero-brand">
            <div className="hero-mark">P</div>
            <b>PesaBooks</b>
          </div>
          <span className="hero-pill">Built for M-Pesa · KRA eTIMS ready</span>
          <h1>
            Your books, <span className="hl">done for you</span> — right inside WhatsApp.
          </h1>
          <p className="hero-sub">
            Text your sales and PesaBooks issues legal KRA invoices, sorts your M-Pesa
            payments, and tracks your tax — automatically. No accountant. No software to learn.
          </p>
          <div className="hero-cta">
            <a className="btn btn-primary" href="#start">Start free on WhatsApp</a>
            <a className="btn btn-ghost" href="#how">See how it works</a>
          </div>
          <div className="hero-trust">
            <span><span className="tick">✓</span> Free to start</span>
            <span><span className="tick">✓</span> Pay with M-Pesa</span>
            <span><span className="tick">✓</span> First invoice in 60 seconds</span>
          </div>
        </div>

        <div className="hero-mock">
          <div className="wa">
            <div className="wa-hd">
              <div className="wa-pic">P</div>
              <div>
                <b>PesaBooks AI</b>
                <span>online</span>
              </div>
            </div>
            <div className="wa-body">
              <div className="msg out">
                Invoice J. Otieno 3200 for cooking oil
                <div className="tm">9:10 AM</div>
              </div>
              <div className="msg in">
                Issuing a KRA invoice:<br />J. Otieno · KES 3,200. Confirm?
                <div className="tm">9:10 AM</div>
              </div>
              <div className="quick">
                <span className="q">Yes, issue it</span>
              </div>
              <div className="msg rcpt">
                <div className="qr" />
                <b>INV-0063 · KES 3,200</b>
                <br />
                <span className="rcpt-meta">KRA verified · receipt sent</span>
                <div className="tm">9:11 AM</div>
              </div>
              <div className="msg in">
                Done. I&apos;ll record the M-Pesa payment automatically when it lands.
                <div className="tm">9:11 AM</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
