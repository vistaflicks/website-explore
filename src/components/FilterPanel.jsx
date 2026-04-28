import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { providerLogos } from '../data/movies'
import { buildApiUrl } from '../config/api'
import './FilterPanel.css'

const CONTENT_TYPES = ['All', 'Movies', 'TV Shows']

const FILTERS = {
  releaseYear: [
    '2026', '2025', '2024', '2023', '2022', '2021', '2020',
    '2019', '2018', '2017', '2016', '2015', 'Older',
  ],
}

const createDefaultSelectedFilters = () => ({
  genres: new Set(),
  releaseYear: new Set(),
  rating: new Set(),
  ageRating: new Set(),
})

const getApiResults = (payload) => {
  if (Array.isArray(payload?.data?.results)) return payload.data.results
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.results)) return payload.results
  return []
}

const isObjectId = (value) =>
  typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value.trim())

const mapMasterOptions = (items) => {
  if (!Array.isArray(items)) return []
  return items
    .map((item) => ({
      id: item?.id || item?._id || '',
      name: item?.name || '',
    }))
    .filter((item) => item.id && item.name)
}

const mapImdbMinOptions = (items) => {
  if (!Array.isArray(items)) return []

  const mins = [...new Set(
    items
      .map((item) => Number.parseFloat(item?.min))
      .filter((value) => Number.isFinite(value)),
  )].sort((a, b) => a - b)

  return mins.map((min) => ({
    id: String(min),
    name: `${Number.isInteger(min) ? min : min.toFixed(1)}+`,
  }))
}

const BLOCKED_PLATFORMS = ['mxplayer', 'jiocinema', 'altbalaji', 'hungama', 'sunnxt', 'sonyliv'];

const mapContentDistributorPlatforms = (items) => {
  if (!Array.isArray(items)) return []

  const unique = new Map()

  items.forEach((item) => {
    const ottApp = item?.ottAppMasterId
    if (!ottApp) return

    const id =
      (typeof ottApp === 'object' ? ottApp?.id || ottApp?._id : ottApp) || ''
    if (!id) return

    const name = (typeof ottApp === 'object' ? ottApp?.name : '') || item?.name || 'Platform'
    const normalizedName = name.toLowerCase().replace(/[\s\-_]/g, '')
    if (BLOCKED_PLATFORMS.some((b) => normalizedName.includes(b))) return

    if (!unique.has(id)) {
      unique.set(id, {
        id,
        name,
        src: typeof ottApp === 'object' ? ottApp?.icon || '' : '',
      })
    }
  })

  return [...unique.values()]
}

const normalize = (value = '') => String(value).toLowerCase().trim()

const getContentTypeTabMap = (contentTypes) => {
  const movieType = contentTypes.find((type) => {
    const name = normalize(type.name)
    return name.includes('movie') || name.includes('film')
  })

  const tvType = contentTypes.find((type) => {
    const name = normalize(type.name)
    return name.includes('tv') || name.includes('show') || name.includes('series')
  })

  return {
    All: '',
    Movies: movieType?.id || '',
    'TV Shows': tvType?.id || '',
  }
}

const ChevronDown = () => (
  <svg viewBox="0 0 10 6" style={{ width: 10, height: 10 }}>
    <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
  </svg>
)

const CheckIcon = () => (
  <svg viewBox="0 0 12 12">
    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export default function FilterPanel({
  onFiltersChange,
  resultsCount = 0,
  platformOptions = [],
  streamingServicesCount = 0,
}) {
  const [selectedProviders, setSelectedProviders] = useState(new Set())
  const [activeTab, setActiveTab] = useState('All')
  const [openDropdown, setOpenDropdown] = useState(null)
  const [selectedFilters, setSelectedFilters] = useState(createDefaultSelectedFilters)
  const [genres, setGenres] = useState([])
  const [ageRatings, setAgeRatings] = useState([])
  const [imdbRatings, setImdbRatings] = useState([])
  const [platforms, setPlatforms] = useState(
    Array.isArray(platformOptions) && platformOptions.length > 0
      ? platformOptions
      : providerLogos.map((provider) => ({
          id: provider.name,
          name: provider.name,
          src: provider.src,
        })),
  )
  const [contentTypeTabMap, setContentTypeTabMap] = useState({
    All: '',
    Movies: '',
    'TV Shows': '',
  })

  const scrollRef = useRef(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)
  const dropdownRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    const fetchOptions = async () => {
      const query = { sortBy: 'name:asc', page: '-1' }
      const imdbQuery = { sortBy: 'min:asc', page: '-1' }
      const distributorQuery = {
        page: '-1',
        fields: 'name,ottAppMasterId',
        populate: 'ottAppMasterId:name,icon',
      }
      const shouldFetchPlatforms =
        !Array.isArray(platformOptions) || platformOptions.length === 0

      try {
        const [
          genresRes,
          ageRatingsRes,
          contentTypesRes,
          imdbRatingsRes,
          contentDistributorsRes,
        ] = await Promise.all([
          fetch(buildApiUrl('/api/v1/website/content/genres', query), {
            signal: controller.signal,
          }),
          fetch(buildApiUrl('/api/v1/website/content/ageRatings', query), {
            signal: controller.signal,
          }),
          fetch(buildApiUrl('/api/v1/website/content/contentTypes', query), {
            signal: controller.signal,
          }),
          fetch(buildApiUrl('/api/v1/website/content/imdbRatings', imdbQuery), {
            signal: controller.signal,
          }),
          shouldFetchPlatforms
            ? fetch(
                buildApiUrl(
                  '/api/v1/website/content/contentDistributors',
                  distributorQuery,
                ),
                {
                  signal: controller.signal,
                },
              )
            : Promise.resolve(null),
        ])

        const [
          genresPayload,
          ageRatingsPayload,
          contentTypesPayload,
          imdbRatingsPayload,
          contentDistributorsPayload,
        ] = await Promise.all([
          genresRes.ok ? genresRes.json() : Promise.resolve(null),
          ageRatingsRes.ok ? ageRatingsRes.json() : Promise.resolve(null),
          contentTypesRes.ok ? contentTypesRes.json() : Promise.resolve(null),
          imdbRatingsRes.ok ? imdbRatingsRes.json() : Promise.resolve(null),
          contentDistributorsRes?.ok
            ? contentDistributorsRes.json()
            : Promise.resolve(null),
        ])

        const mappedGenres = mapMasterOptions(getApiResults(genresPayload))
        const mappedAgeRatings = mapMasterOptions(getApiResults(ageRatingsPayload))
        const mappedContentTypes = mapMasterOptions(getApiResults(contentTypesPayload))
        const mappedImdbRatings = mapImdbMinOptions(
          getApiResults(imdbRatingsPayload),
        )
        const mappedPlatforms = mapContentDistributorPlatforms(
          getApiResults(contentDistributorsPayload),
        )

        setGenres(mappedGenres)
        setAgeRatings(mappedAgeRatings)
        setImdbRatings(mappedImdbRatings)
        if (mappedPlatforms.length > 0) {
          setPlatforms(mappedPlatforms)
        }
        setContentTypeTabMap(getContentTypeTabMap(mappedContentTypes))
      } catch (error) {
        // Keep static UI usable if filter APIs are unavailable.
      }
    }

    fetchOptions()
    return () => controller.abort()
  }, [platformOptions])

  useEffect(() => {
    if (Array.isArray(platformOptions) && platformOptions.length > 0) {
      setPlatforms(platformOptions)
    }
  }, [platformOptions])

  useEffect(() => {
    if (typeof onFiltersChange !== 'function') return

    const genreIds = [...selectedFilters.genres]
    const imdbMinRatings = [...selectedFilters.rating]
    const releaseYears = [...selectedFilters.releaseYear]
    const ageRatingIds = [...selectedFilters.ageRating]
    const ottPlatformIds = [...selectedProviders].filter((id) => isObjectId(id))
    const contentTypeId =
      activeTab === 'All' ? '' : contentTypeTabMap[activeTab] || ''

    onFiltersChange({
      contentTypeId,
      genreIds,
      imdbMinRatings,
      releaseYears,
      ageRatingIds,
      ottPlatformIds,
    })
  }, [
    activeTab,
    contentTypeTabMap,
    selectedProviders,
    selectedFilters.genres,
    selectedFilters.releaseYear,
    selectedFilters.rating,
    selectedFilters.ageRating,
    onFiltersChange,
  ])

  const updateScrollArrows = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setShowLeftArrow(el.scrollLeft > 10)
    setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', updateScrollArrows, { passive: true })
    updateScrollArrows()
    return () => el.removeEventListener('scroll', updateScrollArrows)
  }, [updateScrollArrows])

  const scrollProviders = (dir) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'right' ? 200 : -200, behavior: 'smooth' })
  }

  const toggleProvider = (providerId) => {
    setSelectedProviders((prev) => {
      const next = new Set(prev)
      if (next.has(providerId)) next.delete(providerId)
      else next.add(providerId)
      return next
    })
  }

  const toggleFilter = (category, value) => {
    setSelectedFilters((prev) => {
      const next = new Set(prev[category])
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return { ...prev, [category]: next }
    })
  }

  const resetAll = () => {
    setSelectedProviders(new Set())
    setActiveTab('All')
    setSelectedFilters(createDefaultSelectedFilters())
    setOpenDropdown(null)
  }

  const hasActiveFilters =
    selectedProviders.size > 0 ||
    activeTab !== 'All' ||
    Object.values(selectedFilters).some((s) => s.size > 0)

  const formattedResultsCount = useMemo(
    () => Number(resultsCount || 0).toLocaleString(),
    [resultsCount],
  )
  const resolvedStreamingServicesCount = useMemo(() => {
    const provided = Number(streamingServicesCount)
    if (Number.isFinite(provided) && provided > 0) return provided
    if (Array.isArray(platformOptions) && platformOptions.length > 0) {
      return platformOptions.length
    }
    if (Array.isArray(platforms) && platforms.length > 0) return platforms.length
    return providerLogos.length
  }, [streamingServicesCount, platformOptions, platforms])
  const formattedStreamingServicesCount = useMemo(
    () => Number(resolvedStreamingServicesCount).toLocaleString(),
    [resolvedStreamingServicesCount],
  )
  const streamingServicesLabel =
    resolvedStreamingServicesCount === 1
      ? 'streaming service'
      : 'streaming services'

  return (
    <section className="filter-panel" id="filter-panel">
      {/* Section Header */}
      <div className="filter-panel__header">
        <div>
          <h2 className="filter-panel__title">
            Discover What to <span className="accent">Watch</span>
          </h2>
          <p className="filter-panel__subtitle">
            Filter by platform, genre, and more — find your next binge across {formattedStreamingServicesCount} {streamingServicesLabel}.
          </p>
        </div>
      </div>

      {/* Provider selection card */}
      <div className="filter-panel__providers">
        <div className="filter-panel__provider-label">Choose your platforms</div>

        <button
          className={`filter-panel__scroll-arrow left${!showLeftArrow ? ' hidden' : ''}`}
          onClick={() => scrollProviders('left')}
          aria-label="Scroll left"
        >
          <svg viewBox="0 0 10 17">
            <path d="M8.5 1L1.5 8.5L8.5 16" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        </button>

        <div className="filter-panel__provider-scroll" ref={scrollRef}>
          {platforms.map((p) => (
            <button
              key={p.id}
              className={`filter-panel__provider-btn${selectedProviders.has(p.id) ? ' selected' : ''}`}
              onClick={() => toggleProvider(p.id)}
              title={p.name}
            >
              {p.src ? (
                <img src={p.src} alt={p.name} />
              ) : (
                <span className="filter-panel__provider-fallback">
                  {p.name.charAt(0).toUpperCase()}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          className={`filter-panel__scroll-arrow right${!showRightArrow ? ' hidden' : ''}`}
          onClick={() => scrollProviders('right')}
          aria-label="Scroll right"
        >
          <svg viewBox="0 0 10 17">
            <path d="M1.5 1L8.5 8.5L1.5 16" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Tabs + Filters bar */}
      <div className="filter-panel__bar" ref={dropdownRef}>
        <div className="filter-panel__tabs">
          {CONTENT_TYPES.map((type) => (
            <button
              key={type}
              className={`filter-panel__tab${activeTab === type ? ' active' : ''}`}
              onClick={() => setActiveTab(type)}
            >
              {type}
            </button>
          ))}
        </div>

        <button
          className={`filter-panel__filters-toggle${openDropdown ? ' open' : ''}`}
          onClick={() => setOpenDropdown(openDropdown ? null : 'genres')}
        >
          <svg viewBox="0 0 16 16">
            <path d="M1 3h14M3 8h10M5 13h6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
          FILTERS
        </button>

        <div className="filter-panel__dropdowns">
          <FilterDropdown
            label="Genres"
            items={genres}
            selected={selectedFilters.genres}
            isOpen={openDropdown === 'genres'}
            onToggle={() => setOpenDropdown(openDropdown === 'genres' ? null : 'genres')}
            onSelect={(id) => toggleFilter('genres', id)}
            getItemKey={(item) => item.id}
            getItemLabel={(item) => item.name}
          />
          <FilterDropdown
            label="Release year"
            items={FILTERS.releaseYear}
            selected={selectedFilters.releaseYear}
            isOpen={openDropdown === 'releaseYear'}
            onToggle={() => setOpenDropdown(openDropdown === 'releaseYear' ? null : 'releaseYear')}
            onSelect={(value) => toggleFilter('releaseYear', value)}
          />
          <FilterDropdown
            label="IMDb rating"
            items={imdbRatings}
            selected={selectedFilters.rating}
            isOpen={openDropdown === 'rating'}
            onToggle={() => setOpenDropdown(openDropdown === 'rating' ? null : 'rating')}
            onSelect={(min) => toggleFilter('rating', min)}
            getItemKey={(item) => item.id}
            getItemLabel={(item) => item.name}
          />
          <FilterDropdown
            label="Age rating"
            items={ageRatings}
            selected={selectedFilters.ageRating}
            isOpen={openDropdown === 'ageRating'}
            onToggle={() => setOpenDropdown(openDropdown === 'ageRating' ? null : 'ageRating')}
            onSelect={(id) => toggleFilter('ageRating', id)}
            getItemKey={(item) => item.id}
            getItemLabel={(item) => item.name}
          />
        </div>

        {hasActiveFilters && (
          <button className="filter-panel__reset" onClick={resetAll}>
            <svg viewBox="0 0 12 12">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
            Reset
          </button>
        )}
      </div>

      {/* Results info */}
      <div className="filter-panel__results">
        <span className="filter-panel__results-count">
          <strong>{formattedResultsCount}</strong> titles
        </span>
      </div>
    </section>
  )
}

/* ─── Filter Dropdown Sub-component ──────── */
function FilterDropdown({
  label,
  items,
  selected,
  isOpen,
  onToggle,
  onSelect,
  getItemKey = (item) => (typeof item === 'string' ? item : item?.id),
  getItemLabel = (item) => (typeof item === 'string' ? item : item?.name),
}) {
  const hasSelection = selected.size > 0

  return (
    <div className="filter-panel__dropdown">
      <button
        className={`filter-panel__dropdown-btn${isOpen ? ' open' : ''}${hasSelection ? ' has-selection' : ''}`}
        onClick={onToggle}
      >
        {label}
        {hasSelection && <span className="count-badge">{selected.size}</span>}
        <ChevronDown />
      </button>

      {isOpen && (
        <div className="filter-panel__dropdown-menu">
          {items.map((item) => {
            const key = getItemKey(item)
            const text = getItemLabel(item)
            if (!key || !text) return null

            const isSelected = selected.has(key)

            return (
              <button
                key={key}
                className={`filter-panel__dropdown-item${isSelected ? ' selected' : ''}`}
                onClick={() => onSelect(key)}
              >
                <span className="check">
                  {isSelected && <CheckIcon />}
                </span>
                {text}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
