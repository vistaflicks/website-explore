import { useState, useEffect } from 'react'
import { navLinks } from '../data/movies'
import './Header.css'

export default function Header() {
  const [hidden, setHidden] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    let lastY = window.scrollY
    const onScroll = () => {
      const cur = window.scrollY
      setHidden(cur > lastY && cur > 80)
      lastY = cur <= 0 ? 0 : cur
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <header className={`header${hidden ? ' header--hidden' : ''}`} id="header">
        <div className="header__inner">
          <a href="https://vistareels.com/" className="header__logo">
            <img src="/assets/Group-4-1.svg" alt="Vista Reels" />
          </a>

          <nav className="header__nav">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className={l.active ? 'active' : ''}
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="header__cta-wrap">
            <a href="https://vistareels.com/contact-us/" className="header__cta">
              Contact Us
            </a>
          </div>

          <button
            className="header__hamburger"
            aria-label="Menu"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <span /><span /><span />
          </button>
        </div>
      </header>

      <div className={`header__mobile-nav${mobileOpen ? ' open' : ''}`}>
        {navLinks.map((l) => (
          <a
            key={l.label}
            href={l.href}
            className={l.active ? 'active' : ''}
            onClick={() => setMobileOpen(false)}
          >
            {l.label}
          </a>
        ))}
        <a
          href="https://vistareels.com/contact-us/"
          className="header__cta"
          onClick={() => setMobileOpen(false)}
        >
          Contact Us
        </a>
      </div>
    </>
  )
}
