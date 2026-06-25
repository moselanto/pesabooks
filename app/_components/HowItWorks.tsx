const STEPS = [
  { n: 1, t: 'Sign up', d: 'Phone, business name, KRA PIN — under a minute.' },
  { n: 2, t: 'Connect M-Pesa', d: 'So PesaBooks can read and sort your payments.' },
  { n: 3, t: 'Text to invoice', d: 'One message issues a KRA invoice; receipt to your customer.' },
  { n: 4, t: 'Books run themselves', d: 'Profit, expenses, and tax — always current.' },
];

export default function HowItWorks() {
  return (
    <section className="section" id="how">
      <div className="section-head">
        <span className="eyebrow">How it works</span>
        <h2>A bookkeeper, an invoice machine, and a tax assistant — in your WhatsApp.</h2>
      </div>
      <div className="steps">
        {STEPS.map((s) => (
          <div className="step" key={s.n}>
            <div className="step-num">{s.n}</div>
            <b>{s.t}</b>
            <p>{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
