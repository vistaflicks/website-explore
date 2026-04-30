import { useRef, useState, useEffect } from 'react'
import MediaPopup from './MediaPopup'
import DownloadBannerPopup from './DownloadBannerPopup'
import './ContentCarousel.css'

const getGenreFromCategory = (categoryTitle = '') => {
  const match = categoryTitle.match(/\bin\s+(.+)$/i)
  return match?.[1]?.trim() || ''
}

export default function ContentCarousel({ title, desc, movies }) {
  if (!Array.isArray(movies) || movies.length === 0) return null

  const trackRef = useRef(null)
  const [showPrev, setShowPrev] = useState(false)
  const [showNext, setShowNext] = useState(true)
  const [selectedMovieIndex, setSelectedMovieIndex] = useState(null)
  const [isBannerOpen, setIsBannerOpen] = useState(false)

  const isPromoCategory = true;

  const isPromoActive = isPromoCategory && selectedMovieIndex === movies.length

  const effectiveMovieIndex = isPromoActive ? movies.length - 1 : selectedMovieIndex

  const promoItem = {
    title: 'Enjoy more on Vista Reels app',
    plot: 'Discover, like, save and share seamlessly in the app.',
    poster: '/assets/Download-frame.png',
    isPromo: true
  }

  const selectedMovie =
    selectedMovieIndex === null
      ? null
      : (() => {
        if (isPromoActive) return promoItem;
        const selected = movies[effectiveMovieIndex]
        if (!selected) return null
        const inferredGenre = getGenreFromCategory(title)
        const derivedGenres =
          Array.isArray(selected.genres) && selected.genres.length > 0
            ? selected.genres
            : selected.genre
              ? [selected.genre]
              : inferredGenre
                ? [inferredGenre]
                : undefined

        return {
          ...selected,
          genres: derivedGenres,
          plot: selected.plot || selected.overview || desc,
          platform: selected.platform || title,
        }
      })()

  const updateArrows = () => {
    const el = trackRef.current
    if (!el) return
    setShowPrev(el.scrollLeft > 10)
    setShowNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
  }

  useEffect(() => {
    const el = trackRef.current
    if (!el) return

    const handleResize = () => updateArrows()

    el.addEventListener('scroll', updateArrows, { passive: true })
    window.addEventListener('resize', handleResize)
    updateArrows()
    return () => {
      el.removeEventListener('scroll', updateArrows)
      window.removeEventListener('resize', handleResize)
    }
  }, [movies.length])

  useEffect(() => {
    if (selectedMovieIndex === null) return
    
    // For promo categories, index can be movies.length
    const maxIndex = isPromoCategory ? movies.length : movies.length - 1
    
    if (selectedMovieIndex <= maxIndex) return
    setSelectedMovieIndex(movies.length > 0 ? movies.length - 1 : null)
  }, [movies.length, selectedMovieIndex, isPromoCategory])

  const scroll = (dir) => {
    const el = trackRef.current
    if (!el) return

    if (dir === 'next' && !showNext) {
      if (isPromoCategory) {
        setSelectedMovieIndex(movies.length)
        return
      }
      setIsBannerOpen(true)
      return
    }

    const amount = el.clientWidth * 0.8
    el.scrollBy({ left: dir === 'next' ? amount : -amount, behavior: 'smooth' })
  }

  return (
    <section className="content-section" id="popular-reels">
      <div className="content-section__header">
        <div className="content-section__left">
          <h3 className="content-section__title">{title}</h3>
          <p className="content-section__desc">{desc}</p>
        </div>
      </div>

      <div className="content-carousel">
        <button
          className={`carousel-arrow prev${!showPrev ? ' hidden' : ''}`}
          onClick={() => scroll('prev')}
          aria-label="Previous"
        >
          <svg viewBox="0 0 10 17" fill="none">
            <path d="M0.265 7.839L7.599 0.274C7.952-0.091 8.526-0.091 8.879 0.274L9.735 1.156C10.088 1.521 10.088 2.111 9.736 2.476L3.924 8.5L9.736 14.524C10.088 14.889 10.088 15.48 9.734 15.844L8.879 16.726C8.525 17.091 7.952 17.091 7.598 16.726L0.265 9.16C-0.088 8.796-0.088 8.204 0.265 7.839Z" fill="white"/>
          </svg>
        </button>

        <div className="content-carousel__track" ref={trackRef}>
          {movies.map((m, index) => (
            <div
              className="movie-card"
              key={m.id || `${index}-${m.title}`}
              onClick={() => setSelectedMovieIndex(index)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setSelectedMovieIndex(index)
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`Open details for ${m.title}`}
            >
              <div className="movie-card__poster-wrapper">
                <img
                  className="movie-card__poster"
                  src={m.poster}
                  alt={m.title}
                  loading="lazy"
                />
                <div className="movie-card__shade" aria-hidden="true" />
                <div className="movie-card__play" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
              <p className="movie-card__title">{m.title}</p>
            </div>
          ))}

          {/* Download App CTA Card at the end of every row */}
          <div 
            className="movie-card cta-card" 
            onClick={() => setSelectedMovieIndex(movies.length)}
            role="button"
            tabIndex={0}
          >
            <div className="cta-card__content">
              <h4 className="cta-card__title">Enjoy more on Vista Reels app</h4>
              <p className="cta-card__subtitle">Discover, like, save and share seamlessly in the app.</p>
              <div className="cta-card__buttons">
                <a 
                  href="https://play.google.com/store/apps/details?id=com.vistareels.app" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <img src="/assets/Group-9076-2.svg" alt="Google Play" className="cta-card__badge" />
                </a>
                <a 
                  href="https://apps.apple.com/in/app/vista-reel/id6746562815" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <img src="/assets/Group-9577.svg" alt="App Store" className="cta-card__badge" />
                </a>
              </div>
            </div>
            <div className="cta-card__phone-wrapper">
              <img src="/assets/Download-frame.png" alt="Phone" className="cta-card__phone" />
            </div>
          </div>
        </div>

        <button
          className="carousel-arrow next"
          onClick={() => scroll('next')}
          aria-label="Next"
        >
          <svg viewBox="0 0 10 17" fill="none">
            <path d="M9.735 7.839L2.401 0.274C2.048-0.091 1.474-0.091 1.121 0.274L0.265 1.156C-0.088 1.521-0.088 2.111 0.264 2.476L6.076 8.5L0.264 14.524C-0.088 14.889-0.088 15.48 0.266 15.844L1.121 16.726C1.475 17.091 2.048 17.091 2.402 16.726L9.735 9.16C10.088 8.796 10.088 8.204 9.735 7.839Z" fill="white"/>
          </svg>
        </button>
      </div>

      <MediaPopup
        isOpen={Boolean(selectedMovie)}
        onClose={() => setSelectedMovieIndex(null)}
        item={selectedMovie}
        isPromo={isPromoActive}
        hasPrev={selectedMovieIndex !== null}
        hasNext={selectedMovieIndex !== null}
        onPrev={() =>
          setSelectedMovieIndex((prev) => {
            if (prev === null || movies.length === 0) return prev
            if (isPromoCategory) {
              return (prev - 1 + (movies.length + 1)) % (movies.length + 1)
            }
            return (prev - 1 + movies.length) % movies.length
          })
        }
        onNext={() =>
          setSelectedMovieIndex((prev) => {
            if (prev === null || movies.length === 0) return prev
            if (isPromoCategory) {
              return (prev + 1) % (movies.length + 1)
            }
            return (prev + 1) % movies.length
          })
        }
      />

      <DownloadBannerPopup 
        isOpen={isBannerOpen}
        onClose={() => setIsBannerOpen(false)}
      />
    </section>
  )
}
