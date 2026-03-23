import { useEffect } from 'react'
import './MediaPopup.css'

const FALLBACK_GENRES = ['Crime', 'Drama', 'Mystery', 'Romance', 'Thriller']
const FALLBACK_CAST = [
  { name: 'Hrithik Roshan' },
  { name: 'Abhay Deol' },
  { name: 'Farhan Akhtar' },
  { name: 'Katrina Kaif' },
]

const getValueName = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') return value.name || ''
  return ''
}

const getGenres = (item) => {
  if (Array.isArray(item?.genres) && item.genres.length > 0) {
    const cleaned = item.genres
      .map((value) => getValueName(value))
      .filter(Boolean)
    if (cleaned.length > 0) return cleaned.slice(0, 5)
  }

  if (item?.genre) return [item.genre]
  return FALLBACK_GENRES
}

const getCast = (item) => {
  if (Array.isArray(item?.cast) && item.cast.length > 0) {
    return item.cast
      .map((member) => {
        if (typeof member === 'string') return { name: member, image: '' }
        return {
          name: member?.name || 'Unknown',
          image: member?.image || member?.profilePath || '',
        }
      })
      .slice(0, 6)
  }

  return FALLBACK_CAST
}

const getMetaParts = (item, genres) => {
  const duration = item?.duration || item?.runtime || item?.durationText || '2h 34m'
  const certificate = item?.certificate || item?.certification || 'UA (IN)'
  const leadGenre = genres[0] || 'Drama'
  const releaseText = item?.releaseDateText || item?.releaseDate || (item?.year ? `01 Jan, ${item.year}` : '15 July, 2011')
  return [duration, `${certificate}/${leadGenre}`, releaseText]
}

const getInitials = (name) =>
  name
    .split(' ')
    .map((part) => part?.[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

export default function MediaPopup({
  isOpen,
  onClose,
  item,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  prevLabel = 'Previous',
  nextLabel = 'Next',
}) {
  useEffect(() => {
    if (!isOpen) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || !item) return null

  const poster = item.poster || item.image || ''
  const plot = item.plot || item.overview || item.description || 'Three friends who were inseparable in childhood decide to go on a road trip to rediscover themselves and repair old bonds before one of them gets married.'
  const genres = getGenres(item)
  const cast = getCast(item)
  const metaParts = getMetaParts(item, genres)

  return (
    <div
      className="media-popup"
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-popup-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
    >
      <div className="media-popup__panel" onMouseDown={(event) => event.stopPropagation()}>
        <div className="media-popup__media">
          {poster ? (
            <img
              className="media-popup__poster"
              src={poster}
              alt={item.title || 'Selected title'}
            />
          ) : (
            <div className="media-popup__poster-placeholder">No image available</div>
          )}

          <div className="media-popup__nav">
            <button
              type="button"
              className="media-popup__nav-btn media-popup__nav-btn--ghost"
              onClick={onPrev}
              disabled={!hasPrev}
            >
              {prevLabel}
            </button>
            <button
              type="button"
              className="media-popup__nav-btn media-popup__nav-btn--solid"
              onClick={onNext}
              disabled={!hasNext}
            >
              {nextLabel}
            </button>
          </div>
        </div>

        <div className="media-popup__details">
          <button
            type="button"
            className="media-popup__close"
            onClick={onClose}
            aria-label="Close popup"
          >
            x
          </button>

          <h3 className="media-popup__title" id="media-popup-title">
            {item.title || 'Untitled'}
          </h3>

          <div className="media-popup__meta-line" aria-label={metaParts.join(' • ')}>
            {metaParts.map((part, index) => (
              <div className="media-popup__meta-item" key={part}>
                {index > 0 ? <span className="media-popup__meta-dot" /> : null}
                <span>{part}</span>
              </div>
            ))}
          </div>
          <div className="media-popup__divider" />

          <section className="media-popup__section">
            <h4 className="media-popup__section-title">Movie Plot</h4>
            <p className="media-popup__plot">{plot}</p>
          </section>

          <div className="media-popup__divider" />

          <section className="media-popup__section">
            <h4 className="media-popup__section-title">Genres</h4>
            <div className="media-popup__genre-list">
              {genres.map((genre) => (
                <span className="media-popup__genre-chip" key={genre}>
                  {genre}
                </span>
              ))}
            </div>
          </section>

          <div className="media-popup__divider" />

          <section className="media-popup__section">
            <h4 className="media-popup__section-title">Cast</h4>
            <div className="media-popup__cast-list">
              {cast.map((member) => (
                <div className="media-popup__cast-item" key={member.name}>
                  <div className="media-popup__cast-avatar-wrap">
                    {member.image ? (
                      <img
                        className="media-popup__cast-avatar"
                        src={member.image}
                        alt={member.name}
                      />
                    ) : (
                      <div className="media-popup__cast-avatar media-popup__cast-avatar--fallback">
                        {getInitials(member.name)}
                      </div>
                    )}
                  </div>
                  <span className="media-popup__cast-name">{member.name}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
