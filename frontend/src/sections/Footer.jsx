import Logo from '../components/Logo'

const COLS = [
  { h: 'Product', links: ['Book a driver', 'Become a driver', 'Pricing', 'Live tracking'] },
  { h: 'Company', links: ['About', 'Careers', 'Blog', 'Contact'] },
  { h: 'Support', links: ['Help center', 'Safety', 'Terms', 'Privacy'] },
]

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Logo />
          <p className="footer-tag">Your driver. Your car. Your schedule.</p>
          <p className="footer-city">Made in Hyderabad ⚡</p>
        </div>
        {COLS.map((c) => (
          <div className="footer-col" key={c.h}>
            <h4>{c.h}</h4>
            {c.links.map((l) => (
              <a key={l} href="#" className="interactive">
                {l}
              </a>
            ))}
          </div>
        ))}
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} DriveSync. Demo project by Saketh.</span>
        <span className="footer-stack">Built with React · Node · Express · MongoDB · Socket.io</span>
      </div>
    </footer>
  )
}
