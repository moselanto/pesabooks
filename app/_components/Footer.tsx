export default function Footer() {
  return (
    <footer className="footer" id="start">
      <div className="footer-cta">
        <h2>Start free on WhatsApp today.</h2>
        <p>Issue your first KRA invoice in 60 seconds. No card, no setup fees.</p>
        <a className="btn btn-solid" href="#">Get started</a>
      </div>
      <div className="footer-base">
        <div className="footer-brand">
          <div className="footer-mark">P</div>
          <b>PesaBooks</b>
        </div>
        <nav className="footer-nav">
          <a href="#how">How it works</a>
          <a href="#pricing">Pricing</a>
          <a href="#">Privacy</a>
          <a href="#">Contact</a>
        </nav>
        <div className="footer-copy">© {new Date().getFullYear()} PesaBooks · Nairobi, Kenya</div>
      </div>
    </footer>
  );
}
