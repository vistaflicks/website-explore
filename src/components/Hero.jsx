import { useState, useEffect, useRef, useCallback } from 'react'
import { heroSlides, providerLogos } from '../data/movies'
import './Hero.css'

const mapProviderLogos = (providers) => {
  if (!Array.isArray(providers)) return []

  return providers
    .map((provider) => ({
      name: provider?.name || '',
      src: provider?.src || provider?.icon || '',
    }))
    .filter((provider) => provider.name && provider.src)
}

export default function Hero({ providers = [] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [slideKey, setSlideKey] = useState(0)
  const intervalRef = useRef(null)
  const heroRef = useRef(null)
  const [isPaused, setIsPaused] = useState(false)

  const startRotation = useCallback(() => {
    setIsPaused(false)
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % heroSlides.length)
      setSlideKey((k) => k + 1)
    }, 6000)
  }, [])

  const stopRotation = useCallback(() => {
    setIsPaused(true)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    startRotation()
    return stopRotation
  }, [startRotation, stopRotation])

  const handleProgressClick = (i) => {
    stopRotation()
    setActiveIndex(i)
    setSlideKey((k) => k + 1)
    startRotation()
  }

  const logos = mapProviderLogos(providers)
  const providerSource = logos.length > 0 ? logos : providerLogos
  // Duplicate provider logos for seamless marquee
  const marqueeLogos = [...providerSource, ...providerSource]

  return (
    <section
      className="vr-hero"
      id="vr-hero"
      ref={heroRef}
      onMouseEnter={stopRotation}
      onMouseLeave={startRotation}
    >
      {/* Ambient particles */}
      <div className="vr-hero__particles">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="vr-hero__particle" />
        ))}
      </div>

      {/* Rotating backdrops */}
      {heroSlides.map((slide, i) => (
        <div
          key={i}
          className={`vr-hero__backdrop${i === activeIndex ? ' active' : ''}`}
          style={{ backgroundImage: `url(${slide.backdrop})` }}
        />
      ))}
      <div className="vr-hero__gradient" />

      <div className="vr-hero__content">
        <div className="vr-hero__left">
          <p className="vr-hero__tag">NOW TRENDING</p>

          <h1
            key={`headline-${slideKey}`}
            className="vr-hero__headline animate"
          >
            <span className="red">Discover</span> Entertainment<br />Anytime, Anywhere
          </h1>

          <p className="vr-hero__sub">
            Discover what's streaming across Netflix, Prime Video,
            Disney+ & more — all in one swipe.
          </p>

          <div className="vr-hero__ctas">
            <a href="#popular-reels" className="vr-btn vr-btn--primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Watch Reels
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.vistareels.app"
              className="vr-btn vr-btn--secondary"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
              </svg>
              Get the App
            </a>
          </div>

          {/* Progress bar navigation */}
          <div className="vr-hero__progress">
            {heroSlides.map((_, i) => (
              <div
                key={i}
                className={`vr-hero__progress-item${i === activeIndex ? ' active' : ''
                  }${i < activeIndex ? ' completed' : ''}`}
                onClick={() => handleProgressClick(i)}
              >
                <div className="vr-hero__progress-fill" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Provider strip */}
      <div className="vr-hero__providers">
        <span>Streaming on</span>
        <div className="vr-hero__separator" />
        <div className="vr-hero__provider-track">
          <div className="vr-hero__provider-logos">
            {marqueeLogos.map((p, i) => (
              <img key={`${p.name}-${i}`} src={p.src} alt={p.name} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
