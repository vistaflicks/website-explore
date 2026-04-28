import { useRef, useState, useEffect } from 'react'
import MediaPopup from './MediaPopup'
import './NetflixSpotlight.css'

export default function NetflixSpotlight({ movies: apiMovies }) {
  const trackRef = useRef(null)
  const [showPrev, setShowPrev] = useState(false)
  const [showNext, setShowNext] = useState(true)
  const [selectedMovieIndex, setSelectedMovieIndex] = useState(null)

  const title = 'Best picks from Netflix for you'

  // Static netflix picks for fallback
  const fallbackPicks = [
    { title: 'Stranger Things', poster: '/assets/posters/uOOtwVbSr4QDjAGIifLDwpb2Pdl.jpg', rank: 1 },
    { title: 'The Crown', poster: '/assets/posters/p0qM8hhlMF5DuxHBzl2EZR6TehX.jpg', rank: 2 },
    { title: 'Money Heist', poster: '/assets/posters/4Lok3HBSfbQxibQZBygoVCwKKrZ.jpg', rank: 3 },
    { title: 'Wednesday', poster: '/assets/posters/9PFonBhy4cQy7Jz20NpMygczOkv.jpg', rank: 4 },
    { title: 'Bridgerton', poster: '/assets/posters/jsGicZboSpbkygvqdfqfbEUSFU3.jpg', rank: 5 },
    { title: 'Dark', poster: '/assets/posters/6o0C7Jy6TKw1Y2tmW5W2qDEsEut.jpg', rank: 6 },
    { title: 'The Witcher', poster: '/assets/posters/rRYnraF4iahVyk7bHCh99Y4p6xr.jpg', rank: 7 },
    { title: 'Narcos', poster: '/assets/posters/bC2Mix1WPUiY6pldh77oiFl1MvI.jpg', rank: 8 },
    { title: 'Ozark', poster: '/assets/posters/f5ZMzzCvt2IzVDxr54gHPv9jlC9.jpg', rank: 9 },
    { title: 'Squid Game', poster: '/assets/posters/n24ETnrCNuKX4O5CnQhy0lmZLYn.jpg', rank: 10 },
  ]

  const netflixPicks = Array.isArray(apiMovies) && apiMovies.length > 0 ? apiMovies : fallbackPicks;

  const isPromoActive = selectedMovieIndex === netflixPicks.length
  const effectiveMovieIndex = isPromoActive ? netflixPicks.length - 1 : selectedMovieIndex

  const promoItem = {
    title: 'Enjoy more on Vista Reels app',
    plot: 'Discover, like, save and share seamlessly in the app.',
    poster: '/assets/Download-frame.png',
    isPromo: true
  }

  const selectedMovie = selectedMovieIndex === null 
    ? null 
    : (isPromoActive ? promoItem : netflixPicks[effectiveMovieIndex])

  const updateArrows = () => {
    const el = trackRef.current
    if (!el) return
    setShowPrev(el.scrollLeft > 10)
    setShowNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
  }

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    el.addEventListener('scroll', updateArrows, { passive: true })
    updateArrows()
    return () => el.removeEventListener('scroll', updateArrows)
  }, [])

  const scroll = (dir) => {
    const el = trackRef.current
    if (!el) return

    if (dir === 'next' && !showNext) {
      setSelectedMovieIndex(netflixPicks.length)
      return
    }

    const amount = el.clientWidth * 0.8
    el.scrollBy({ left: dir === 'next' ? amount : -amount, behavior: 'smooth' })
  }

  return (
    <section className="netflix-spotlight-wrapper">
      <div className="netflix-spotlight">
        {/* Background image inspired by OTT spotlight sections */}
        <div className="netflix-spotlight__background" style={{ backgroundImage: 'url(/assets/hero-backdrop-2.png)' }}>
          <div className="netflix-spotlight__overlay"></div>
        </div>

        <div className="netflix-spotlight__content">
          <div className="netflix-spotlight__logo-wrapper">
          <img src="/assets/providers/Mask-group-4.png" alt="Netflix" className="netflix-spotlight__logo" />
          </div>

          <div className="netflix-spotlight__header">
            <h3 className="netflix-spotlight__title">Best picks from Netflix for you</h3>
          </div>

          <div className="netflix-spotlight__carousel">
            <button
              className={`spotlight-arrow prev${!showPrev ? ' hidden' : ''}`}
              onClick={() => scroll('prev')}
              aria-label="Previous"
            >
              <svg viewBox="0 0 10 17" fill="none">
                <path d="M0.265 7.839L7.599 0.274C7.952-0.091 8.526-0.091 8.879 0.274L9.735 1.156C10.088 1.521 10.088 2.111 9.736 2.476L3.924 8.5L9.736 14.524C10.088 14.889 10.088 15.48 9.734 15.844L8.879 16.726C8.525 17.091 7.952 17.091 7.598 16.726L0.265 9.16C-0.088 8.796-0.088 8.204 0.265 7.839Z" fill="white" />
              </svg>
            </button>

            <div className="netflix-spotlight__track" ref={trackRef}>
              {netflixPicks.map((m, idx) => (
                <div 
                  className="spotlight-card" 
                  key={`${idx}-${m.title}`}
                  onClick={() => setSelectedMovieIndex(idx)}
                  role="button"
                  tabIndex={0}
                >
                  <img
                    className="spotlight-card__poster"
                    src={m.poster}
                    alt={m.title}
                    loading="lazy"
                  />
                </div>
              ))}
            </div>

            <button
              className={`spotlight-arrow next${!showNext ? ' hidden' : ''}`}
              onClick={() => scroll('next')}
              aria-label="Next"
            >
              <svg viewBox="0 0 10 17" fill="none">
                <path d="M9.735 7.839L2.401 0.274C2.048-0.091 1.474-0.091 1.121 0.274L0.265 1.156C-0.088 1.521-0.088 2.111 0.264 2.476L6.076 8.5L0.264 14.524C-0.088 14.889-0.088 15.48 0.266 15.844L1.121 16.726C1.475 17.091 2.048 17.091 2.402 16.726L9.735 9.16C10.088 8.796 10.088 8.204 9.735 7.839Z" fill="white" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <MediaPopup
        isOpen={Boolean(selectedMovie)}
        onClose={() => setSelectedMovieIndex(null)}
        item={selectedMovie}
        isPromo={isPromoActive}
        hasPrev={selectedMovieIndex !== null}
        hasNext={selectedMovieIndex !== null}
        onPrev={() =>
          setSelectedMovieIndex((prev) => 
            prev === null || netflixPicks.length === 0
              ? prev
              : (prev - 1 + (netflixPicks.length + 1)) % (netflixPicks.length + 1)
          )
        }
        onNext={() =>
          setSelectedMovieIndex((prev) => 
            prev === null || netflixPicks.length === 0
              ? prev
              : (prev + 1) % (netflixPicks.length + 1)
          )
        }
      />
    </section>
  )
}
