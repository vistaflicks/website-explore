import { useState } from 'react'
import { dummyPosters } from '../data/dummyPosters'
import './PosterGrid.css'

export default function PosterGrid() {
  const [hoveredId, setHoveredId] = useState(null)

  return (
    <section className="poster-grid" id="poster-grid">
      <div className="poster-grid__container">
        {dummyPosters.map((item) => (
          <div
            key={item.id}
            className={`poster-grid__card${hoveredId === item.id ? ' hovered' : ''}`}
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Poster image */}
            <div className="poster-grid__image-wrap">
              <img
                src={item.poster}
                alt={item.title}
                className="poster-grid__image"
                loading="lazy"
              />

              {/* Rating badge */}
              <span className="poster-grid__rating">
                <svg viewBox="0 0 12 12" width="10" height="10">
                  <path d="M6 1l1.5 3.1L11 4.5 8.5 7l.6 3.5L6 8.8 2.9 10.5l.6-3.5L1 4.5l3.5-.4z" fill="currentColor" />
                </svg>
                {item.rating}
              </span>

              {/* Platform badge */}
              <span className="poster-grid__platform">{item.platform}</span>

              {/* Hover overlay */}
              <div className="poster-grid__overlay">
                <button className="poster-grid__play-btn" aria-label={`Play ${item.title}`}>
                  <svg viewBox="0 0 24 24" width="28" height="28">
                    <path d="M8 5v14l11-7z" fill="white" />
                  </svg>
                </button>
                <div className="poster-grid__actions">
                  <button className="poster-grid__action-btn" title="Add to Watchlist">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path d="M12 4v16M4 12h16" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
                    </svg>
                  </button>
                  <button className="poster-grid__action-btn" title="More Info">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <circle cx="12" cy="5" r="1.5" fill="white" />
                      <circle cx="12" cy="12" r="1.5" fill="white" />
                      <circle cx="12" cy="19" r="1.5" fill="white" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Card info */}
            <div className="poster-grid__info">
              <h3 className="poster-grid__title">{item.title}</h3>
              <div className="poster-grid__meta">
                <span className="poster-grid__year">{item.year}</span>
                <span className="poster-grid__dot">·</span>
                <span className="poster-grid__genre">{item.genre}</span>
                <span className="poster-grid__dot">·</span>
                <span className="poster-grid__type">{item.type}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
