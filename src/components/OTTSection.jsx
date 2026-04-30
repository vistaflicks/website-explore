import { useRef, useState, useEffect } from 'react'
import MediaPopup from './MediaPopup'
import './OTTSection.css'

const PLATFORM_CONFIG = {
  netflix: {
    name: 'Netflix',
    gradient: 'linear-gradient(180deg, #1a0000 0%, #0d0d0d 70%)',
    accentColor: '#e50914',
    logoText: 'NETFLIX',
  },
  amazon: {
    name: 'Prime Video',
    gradient: 'linear-gradient(180deg, #00111f 0%, #0d0d0d 70%)',
    accentColor: '#00a8e1',
    logoText: 'prime video',
  },
}

const detectPlatform = (title = '') => {
  const lower = title.toLowerCase()
  if (lower.includes('netflix')) return PLATFORM_CONFIG.netflix
  if (lower.includes('amazon') || lower.includes('prime')) return PLATFORM_CONFIG.amazon
  return null
}

export default function OTTSection({ title, desc, movies, platformLogoSrc }) {
  const trackRef = useRef(null)
  const [showPrev, setShowPrev] = useState(false)
  const [showNext, setShowNext] = useState(true)
  const [selectedMovieIndex, setSelectedMovieIndex] = useState(-1)
  const [showPromo, setShowPromo] = useState(false)

  const platform = detectPlatform(title)

  const updateArrows = () => {
    const el = trackRef.current
    if (!el) return
    setShowPrev(el.scrollLeft > 10)
    // Keep Next arrow visible even at the end for OTT sections to trigger promo
    setShowNext(true)
  }

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    el.addEventListener('scroll', updateArrows, { passive: true })
    window.addEventListener('resize', updateArrows)
    updateArrows()
    return () => {
      el.removeEventListener('scroll', updateArrows)
      window.removeEventListener('resize', updateArrows)
    }
  }, [movies?.length])

  if (!Array.isArray(movies) || movies.length === 0) return null

  const scroll = (dir) => {
    const el = trackRef.current
    if (!el) return
    const amount = el.clientWidth * 0.8
    
    // Check if we are at the end when clicking next
    if (dir === 'next') {
      const isAtEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 20
      if (isAtEnd) {
        setShowPromo(true)
        return
      }
    }
    
    el.scrollBy({ left: dir === 'next' ? amount : -amount, behavior: 'smooth' })
  }

  const handleMovieClick = (index) => {
    setSelectedMovieIndex(index)
    setShowPromo(false)
  }

  const handleClosePopup = () => {
    setSelectedMovieIndex(-1)
    setShowPromo(false)
  }

  const handlePrevMovie = () => {
    if (showPromo) {
      setShowPromo(false)
      return
    }
    if (selectedMovieIndex > 0) {
      setSelectedMovieIndex(prev => prev - 1)
    }
  }

  const handleNextMovie = () => {
    if (selectedMovieIndex === movies.length - 1) {
      setShowPromo(true)
      return
    }
    if (selectedMovieIndex < movies.length - 1) {
      setSelectedMovieIndex(prev => prev + 1)
    }
  }

  return (
    <>
      <section className="ott-section" style={{ background: platform?.gradient || 'linear-gradient(180deg, #111 0%, #0d0d0d 70%)' }}>
        <div className="ott-section__header-container">
          <div className="ott-platform-box">
            {platformLogoSrc ? (
              <img src={platformLogoSrc} alt={platform?.name || 'Platform'} className="ott-platform-logo" />
            ) : platform ? (
              <span className="ott-platform-badge" style={{ color: platform.accentColor }}>
                {platform.logoText}
              </span>
            ) : null}
          </div>
          <div className="ott-section__heading-text">
            <h3 className="ott-section__title">{title}</h3>
            {desc ? <p className="ott-section__desc">{desc}</p> : null}
          </div>
        </div>

        <div className="ott-carousel">
          <button
            className={`ott-arrow prev${!showPrev ? ' hidden' : ''}`}
            onClick={() => scroll('prev')}
            aria-label="Previous"
          >
            <svg viewBox="0 0 10 17" fill="none">
              <path d="M0.265 7.839L7.599 0.274C7.952-0.091 8.526-0.091 8.879 0.274L9.735 1.156C10.088 1.521 10.088 2.111 9.736 2.476L3.924 8.5L9.736 14.524C10.088 14.889 10.088 15.48 9.734 15.844L8.879 16.726C8.525 17.091 7.952 17.091 7.598 16.726L0.265 9.16C-0.088 8.796-0.088 8.204 0.265 7.839Z" fill="white" />
            </svg>
          </button>

          <div className="ott-carousel__track" ref={trackRef}>
            {movies.map((movie, index) => (
              <div
                className="ott-poster-card"
                key={movie.id || `${index}-${movie.title}`}
                onClick={() => handleMovieClick(index)}
              >
                <div className="ott-poster-card__img-wrapper">
                  {(movie.poster || movie.posterPath) ? (
                    <img
                      src={movie.poster || movie.posterPath}
                      alt={movie.title || ''}
                      loading="lazy"
                      className="ott-poster-card__img"
                    />
                  ) : (
                    <div className="ott-poster-card__placeholder">
                      <span>{movie.title || ''}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Promo Card at the end */}
            <div className="ott-poster-card ott-poster-card--promo">
               <div className="ott-poster-card__promo-content">
                  <img src="/assets/Download-frame.png" alt="Promo" className="ott-promo-img" />
                  <div className="ott-promo-text">
                    <h4>Enjoy more on Vista Reels app</h4>
                    <p>Discover, like, save and share seamlessly in the app.</p>
                  </div>
                  <div className="ott-promo-badges">
                    <img src="/assets/Group-9076-2.svg" alt="Play Store" />
                    <img src="/assets/Group-9577.svg" alt="App Store" />
                  </div>
               </div>
            </div>
          </div>

          <button
            className={`ott-arrow next${!showNext ? ' hidden' : ''}`}
            onClick={() => scroll('next')}
            aria-label="Next"
          >
            <svg viewBox="0 0 10 17" fill="none">
              <path d="M9.735 7.839L2.401 0.274C2.048-0.091 1.474-0.091 1.121 0.274L0.265 1.156C-0.088 1.521-0.088 2.111 0.264 2.476L6.076 8.5L0.264 14.524C-0.088 14.889-0.088 15.48 0.266 15.844L1.121 16.726C1.475 17.091 2.048 17.091 2.402 16.726L9.735 9.16C10.088 8.796 10.088 8.204 9.735 7.839Z" fill="white" />
            </svg>
          </button>
        </div>
      </section>

      <MediaPopup
        isOpen={selectedMovieIndex !== -1 || showPromo}
        onClose={handleClosePopup}
        item={showPromo ? (movies[movies.length - 1] || {}) : movies[selectedMovieIndex]}
        onPrev={handlePrevMovie}
        onNext={handleNextMovie}
        hasPrev={selectedMovieIndex > 0 || showPromo}
        hasNext={!showPromo}
        isPromo={showPromo}
      />
    </>
  )
}
