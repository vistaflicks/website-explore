import { footerQuickLinks, footerMoreLinks, footerLegalLinks } from '../data/movies'
import './Footer.css'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer" id="footer">
      <div className="footer__inner">
        <div className="footer__top">
          {/* Brand */}
          <div className="footer__brand">
            <img className="footer__brand-logo" src="/assets/Group-4.svg" alt="Vista Reels" />
            <p className="footer__tagline">
              Your streaming guide for movies, TV shows & more.
              Discover what's streaming across all your favorite platforms — all in one place.
            </p>

            <div className="footer__india-logos">
              <img src="/assets/gov-login-img.png" alt="Government of India" className="footer__gov-logo" />
              <img src="/assets/make-in-india-logo-png_seeklogo-379725.png" alt="Make in India" className="footer__make-in-india-logo" />
            </div>

            <div className="footer__stores">
              <a
                href="https://play.google.com/store/apps/details?id=com.vistareels.app"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src="/assets/Group-9076-2.svg" alt="Get it on Google Play" />
              </a>
              <a
                href="https://apps.apple.com/in/app/vista-reel/id6746562815"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src="/assets/Group-9577.svg" alt="Download on App Store" />
              </a>
            </div>

            <div className="footer__social">
              <a href="#" aria-label="Instagram"><img src="/assets/Vector-40.svg" alt="Instagram" /></a>
              <a href="#" aria-label="LinkedIn"><img src="/assets/Link.svg" alt="LinkedIn" /></a>
              <a href="#" aria-label="Twitter"><img src="/assets/Link-1.svg" alt="Twitter" /></a>
              <a href="#" aria-label="YouTube"><img src="/assets/Link-2.svg" alt="YouTube" /></a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="footer__col-title">Company</h4>
            <div className="footer__links">
              {footerQuickLinks.map((l) => (
                <a key={l.label} href={l.href}>{l.label}</a>
              ))}
            </div>
          </div>

          {/* More */}
          <div>
            <h4 className="footer__col-title">Explore</h4>
            <div className="footer__links">
              {footerMoreLinks.map((l) => (
                <a key={l.label} href={l.href}>{l.label}</a>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="footer__col-title">Get in Touch</h4>
            <div className="footer__contact">
              <a href="mailto:vistaflicks@gmail.com">
                <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg>
                vistaflicks@gmail.com
              </a>
              <a href="tel:+918849414798">
                <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg>
                +91 88494 14798
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="footer__divider" />

      <div className="footer__bottom">
        <p className="footer__privacy">
          All external content including movie posters, show titles, logos, and trademarks
          remain the property of their respective rightful owners. Vista Reels does not claim
          ownership of any third-party content. This platform is a streaming discovery service
          and does not host or distribute copyrighted media.
        </p>

        <div className="footer__copyright-row">
          <span className="footer__copyright">
            © {currentYear} Vista Reels — The Streaming Discovery Platform
          </span>

          <div className="footer__legal-links">
            {footerLegalLinks.map((l, i) => (
              <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <a href={l.href}>{l.label}</a>
                {i < footerLegalLinks.length - 1 && <span className="dot" />}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
