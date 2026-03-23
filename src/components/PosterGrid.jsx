import { useEffect, useState } from 'react'
import { dummyPosters } from '../data/dummyPosters'
import { buildApiUrl } from '../config/api'
import MediaPopup from './MediaPopup'
import './PosterGrid.css'

const CONTENT_ITEMS_PER_PAGE = 30

const CONTENT_BASE_QUERY_PARAMS = {
  isApproved: 'true',
  sortBy: 'releaseDate:desc',
  page: 1,
  limit: CONTENT_ITEMS_PER_PAGE,
  fields:
    'title,posterPath,releaseDate,genres,type,status,imdbRating,avgUserRating,watchForFree,watchForFreeLinks,ottAvailability,imdbLink,seasonCount',
  populate: 'genres:name;type:name;imdbRating:name;ottAvailability-id:name',
}

const buildContentUrl = (filters = {}, pagination = {}) => {
  const query = {
    ...CONTENT_BASE_QUERY_PARAMS,
    ...(pagination?.page && { page: pagination.page }),
    ...(pagination?.limit && { limit: pagination.limit }),
    ...(filters?.contentTypeId && { contentType: filters.contentTypeId }),
    ...(Array.isArray(filters?.genreIds) &&
      filters.genreIds.length > 0 && { genre: filters.genreIds.join(',') }),
    ...(Array.isArray(filters?.imdbMinRatings) &&
      filters.imdbMinRatings.length > 0 && {
        imdbMinRating: filters.imdbMinRatings.join(','),
      }),
    ...(Array.isArray(filters?.releaseYears) &&
      filters.releaseYears.length > 0 && {
        releaseYear: filters.releaseYears.join(','),
      }),
    ...(Array.isArray(filters?.ageRatingIds) &&
      filters.ageRatingIds.length > 0 && {
        ageRating: filters.ageRatingIds.join(','),
      }),
    ...(Array.isArray(filters?.ottPlatformIds) &&
      filters.ottPlatformIds.length > 0 && {
        ottAppMasterId: filters.ottPlatformIds.join(','),
      }),
  }

  return buildApiUrl('/api/v1/website/content', query)
}

const getVisiblePages = (currentPage, totalPages) => {
  if (totalPages <= 1) return []
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages = [1]
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  if (start > 2) pages.push('left-ellipsis')
  for (let page = start; page <= end; page += 1) pages.push(page)
  if (end < totalPages - 1) pages.push('right-ellipsis')

  pages.push(totalPages)
  return pages
}

const getApiResults = (payload) => {
  if (Array.isArray(payload?.data?.results)) return payload.data.results
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.results)) return payload.results
  return []
}

const isObjectId = (value) =>
  typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value.trim())

const getValueName = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return isObjectId(value) ? '' : value
  if (typeof value === 'object') return value.name || ''
  return ''
}

const getPrimaryGenre = (genres) => {
  if (!Array.isArray(genres) || genres.length === 0) return 'Drama'
  return getValueName(genres[0]) || 'Drama'
}

const getTypeLabel = (type, seasonCount) => {
  const typeName = getValueName(type)
  if (typeName) return typeName
  if ((seasonCount || 0) > 0) return 'TV Show'
  return 'Movie'
}

const getYear = (releaseDate) => {
  if (!releaseDate) return 'NA'
  const year = new Date(releaseDate).getUTCFullYear()
  return Number.isNaN(year) ? 'NA' : year
}

const parseRating = (value) => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0 || value > 10) return null
    return value.toFixed(1)
  }

  if (typeof value !== 'string') return null

  const normalized = value.trim()
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null

  const numeric = Number.parseFloat(normalized)
  if (!Number.isFinite(numeric) || numeric <= 0) return null
  if (numeric > 10) return null
  return numeric.toFixed(1)
}

const getRating = (content) => {
  const imdbName = getValueName(content?.imdbRating)
  return (
    parseRating(content?.avgUserRating) ||
    parseRating(imdbName) ||
    parseRating(content?.imdbRating) ||
    'N/A'
  )
}

const getPlatform = (content) => {
  if (content?.watchForFree) return 'Watch For Free'

  const availability = Array.isArray(content?.ottAvailability)
    ? content.ottAvailability
    : []
  const firstPlatform = availability[0]
  const platformName =
    getValueName(firstPlatform?.id) || getValueName(firstPlatform)

  return platformName || 'Available on OTT'
}

const getWatchLink = (content) => {
  if (
    content?.watchForFree &&
    Array.isArray(content?.watchForFreeLinks) &&
    content.watchForFreeLinks[0]
  ) {
    return content.watchForFreeLinks[0]
  }

  if (
    Array.isArray(content?.ottAvailability) &&
    content.ottAvailability[0]?.destinationLink
  ) {
    return content.ottAvailability[0].destinationLink
  }

  return content?.imdbLink || ''
}

const mapContentToPoster = (content, index) => {
  const fallbackPoster = dummyPosters[index % dummyPosters.length]

  return {
    id: content?.id || content?.tmdbId || `${index + 1}`,
    title: content?.title || 'Untitled',
    poster: content?.posterPath || fallbackPoster.poster,
    platform: getPlatform(content),
    genre: getPrimaryGenre(content?.genres),
    year: getYear(content?.releaseDate),
    rating: getRating(content),
    type: getTypeLabel(content?.type, content?.seasonCount),
    watchLink: getWatchLink(content),
  }
}

export default function PosterGrid({ filters, onTotalResultsChange }) {
  const [hoveredId, setHoveredId] = useState(null)
  const [posters, setPosters] = useState(dummyPosters)
  const [selectedPoster, setSelectedPoster] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const genreKey = (filters?.genreIds || []).join(',')
  const imdbMinRatingKey = (filters?.imdbMinRatings || []).join(',')
  const releaseYearKey = (filters?.releaseYears || []).join(',')
  const ageRatingKey = (filters?.ageRatingIds || []).join(',')
  const ottPlatformKey = (filters?.ottPlatformIds || []).join(',')
  const contentTypeKey = filters?.contentTypeId || ''

  useEffect(() => {
    setCurrentPage(1)
  }, [
    contentTypeKey,
    genreKey,
    imdbMinRatingKey,
    releaseYearKey,
    ageRatingKey,
    ottPlatformKey,
  ])

  useEffect(() => {
    const controller = new AbortController()

    const loadPosters = async () => {
      try {
        const response = await fetch(
          buildContentUrl({
            contentTypeId: contentTypeKey,
            genreIds: genreKey ? genreKey.split(',').filter(Boolean) : [],
            imdbMinRatings: imdbMinRatingKey
              ? imdbMinRatingKey.split(',').filter(Boolean)
              : [],
            releaseYears: releaseYearKey
              ? releaseYearKey.split(',').filter(Boolean)
              : [],
            ageRatingIds: ageRatingKey
              ? ageRatingKey.split(',').filter(Boolean)
              : [],
            ottPlatformIds: ottPlatformKey
              ? ottPlatformKey.split(',').filter(Boolean)
              : [],
          }, {
            page: currentPage,
            limit: CONTENT_ITEMS_PER_PAGE,
          }),
          {
            signal: controller.signal,
          },
        )
        if (!response.ok) return

        const payload = await response.json()
        const results = getApiResults(payload)
        const totalResults =
          payload?.data?.totalResults ?? payload?.totalResults ?? results.length
        onTotalResultsChange?.(Number(totalResults || 0))
        const resolvedTotalPages =
          Number(payload?.data?.totalPages || payload?.totalPages) ||
          Math.max(1, Math.ceil(Number(totalResults || 0) / CONTENT_ITEMS_PER_PAGE))
        setTotalPages(resolvedTotalPages)

        if (!results.length) {
          if (currentPage > 1 && resolvedTotalPages > 0) {
            setCurrentPage(Math.min(currentPage, resolvedTotalPages))
            return
          }
          setPosters([])
          return
        }

        const mapped = results.map(mapContentToPoster)
        setPosters(mapped)
      } catch (error) {
        // Keep dummy data as fallback if API is unavailable.
        onTotalResultsChange?.(dummyPosters.length)
        setPosters(dummyPosters)
        setTotalPages(Math.max(1, Math.ceil(dummyPosters.length / CONTENT_ITEMS_PER_PAGE)))
      }
    }

    loadPosters()
    return () => controller.abort()
  }, [
    contentTypeKey,
    genreKey,
    imdbMinRatingKey,
    releaseYearKey,
    ageRatingKey,
    ottPlatformKey,
    currentPage,
    onTotalResultsChange,
  ])

  useEffect(() => {
    if (!selectedPoster) return
    const hasSelectedPoster = posters.some((item) => item.id === selectedPoster.id)
    if (!hasSelectedPoster) {
      setSelectedPoster(null)
    }
  }, [posters, selectedPoster])

  const selectedPosterIndex = selectedPoster
    ? posters.findIndex((item) => item.id === selectedPoster.id)
    : -1
  const visiblePages = getVisiblePages(currentPage, totalPages)

  return (
    <section className="poster-grid" id="poster-grid">
      <div className="poster-grid__container">
        {posters.map((item) => (
          <div
            key={item.id}
            className={`poster-grid__card${hoveredId === item.id ? ' hovered' : ''}`}
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => setSelectedPoster(item)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setSelectedPoster(item)
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Open details for ${item.title}`}
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
                <a
                  href={item.watchLink || '#poster-grid'}
                  target={item.watchLink ? '_blank' : undefined}
                  rel={item.watchLink ? 'noreferrer' : undefined}
                  className="poster-grid__play-btn"
                  aria-label={`Play ${item.title}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  <svg viewBox="0 0 24 24" width="28" height="28">
                    <path d="M8 5v14l11-7z" fill="white" />
                  </svg>
                </a>
                <div className="poster-grid__actions">
                  <button
                    className="poster-grid__action-btn"
                    title="Add to Watchlist"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path d="M12 4v16M4 12h16" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
                    </svg>
                  </button>
                  <button
                    className="poster-grid__action-btn"
                    title="More Info"
                    onClick={(event) => {
                      event.stopPropagation()
                      setSelectedPoster(item)
                    }}
                  >
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

      {totalPages > 1 ? (
        <div className="poster-grid__pagination" aria-label="Poster grid pagination">
          <button
            type="button"
            className="poster-grid__page-nav"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>

          <div className="poster-grid__page-numbers">
            {visiblePages.map((page, index) => (
              typeof page === 'number' ? (
                <button
                  type="button"
                  key={page}
                  className={`poster-grid__page-btn${page === currentPage ? ' active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ) : (
                <span
                  key={`${page}-${index}`}
                  className="poster-grid__page-ellipsis"
                  aria-hidden="true"
                >
                  ...
                </span>
              )
            ))}
          </div>

          <button
            type="button"
            className="poster-grid__page-nav"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      ) : null}

      <MediaPopup
        isOpen={Boolean(selectedPoster)}
        onClose={() => setSelectedPoster(null)}
        item={selectedPoster}
        hasPrev={selectedPosterIndex >= 0 && posters.length > 1}
        hasNext={selectedPosterIndex >= 0 && posters.length > 1}
        onPrev={() => {
          if (selectedPosterIndex < 0 || posters.length === 0) return
          const prevIndex =
            (selectedPosterIndex - 1 + posters.length) % posters.length
          setSelectedPoster(posters[prevIndex])
        }}
        onNext={() => {
          if (selectedPosterIndex < 0 || posters.length === 0) return
          const nextIndex = (selectedPosterIndex + 1) % posters.length
          setSelectedPoster(posters[nextIndex])
        }}
      />
    </section>
  )
}
