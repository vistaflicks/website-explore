import { useRef, useState, useEffect } from 'react'
import MediaPopup from './MediaPopup'
import './ContentCarousel.css'

const getGenreFromCategory = (categoryTitle = '') => {
  const match = categoryTitle.match(/\bin\s+(.+)$/i)
  return match?.[1]?.trim() || ''
}

export default function ContentCarousel({ title, desc, movies }) {
  const trackRef = useRef(null)
  const [showPrev, setShowPrev] = useState(false)
  const [showNext, setShowNext] = useState(true)
  const [selectedMovieIndex, setSelectedMovieIndex] = useState(null)

  const selectedMovie =
    selectedMovieIndex === null
      ? null
      : (() => {
        const selected = movies[selectedMovieIndex]
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
    if (selectedMovieIndex < movies.length) return
    setSelectedMovieIndex(movies.length > 0 ? movies.length - 1 : null)
  }, [movies.length, selectedMovieIndex])

  const scroll = (dir) => {
    const el = trackRef.current
    if (!el) return
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
              key={`${m.rank}-${m.title}`}
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
              <div className="movie-card__rank">{m.rank}</div>
              <img
                className="movie-card__poster"
                src={m.poster}
                alt={m.title}
                loading="lazy"
              />
              <p className="movie-card__title">{m.title}</p>
            </div>
          ))}
        </div>

        <button
          className={`carousel-arrow next${!showNext ? ' hidden' : ''}`}
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
        hasPrev={selectedMovieIndex !== null && movies.length > 1}
        hasNext={selectedMovieIndex !== null && movies.length > 1}
        onPrev={() =>
          setSelectedMovieIndex((prev) => (
            prev === null || movies.length === 0
              ? prev
              : (prev - 1 + movies.length) % movies.length
          ))
        }
        onNext={() =>
          setSelectedMovieIndex((prev) => (
            prev === null || movies.length === 0
              ? prev
              : (prev + 1) % movies.length
          ))
        }
      />
    </section>
  )
}
