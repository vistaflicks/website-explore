import { useState, useRef, useEffect, useCallback } from 'react'
import { providerLogos } from '../data/movies'
import './FilterPanel.css'

const CONTENT_TYPES = ['All', 'Movies', 'TV Shows']

const FILTERS = {
  genres: [
    'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
    'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi',
    'Thriller', 'War', 'Western',
  ],
  releaseYear: [
    '2026', '2025', '2024', '2023', '2022', '2021', '2020',
    '2019', '2018', '2017', '2016', '2015', 'Older',
  ],
  rating: ['9+', '8+', '7+', '6+', '5+'],
  ageRating: ['U', 'U/A 7+', 'U/A 13+', 'U/A 16+', 'A'],
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

export default function FilterPanel() {
  const [selectedProviders, setSelectedProviders] = useState(new Set())
  const [activeTab, setActiveTab] = useState('All')
  const [openDropdown, setOpenDropdown] = useState(null)
  const [selectedFilters, setSelectedFilters] = useState({
    genres: new Set(),
    releaseYear: new Set(),
    rating: new Set(),
    ageRating: new Set(),
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

  const toggleProvider = (name) => {
    setSelectedProviders((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
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
    setSelectedFilters({
      genres: new Set(),
      releaseYear: new Set(),
      rating: new Set(),
      ageRating: new Set(),
    })
    setOpenDropdown(null)
  }

  const hasActiveFilters =
    selectedProviders.size > 0 ||
    activeTab !== 'All' ||
    Object.values(selectedFilters).some((s) => s.size > 0)

  return (
    <section className="filter-panel" id="filter-panel">
      {/* Section Header */}
      <div className="filter-panel__header">
        <div>
          <h2 className="filter-panel__title">
            Discover What to <span className="accent">Watch</span>
          </h2>
          <p className="filter-panel__subtitle">
            Filter by platform, genre, and more — find your next binge across 50+ streaming services.
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
          {providerLogos.map((p) => (
            <button
              key={p.name}
              className={`filter-panel__provider-btn${selectedProviders.has(p.name) ? ' selected' : ''}`}
              onClick={() => toggleProvider(p.name)}
              title={p.name}
            >
              <img src={p.src} alt={p.name} />
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
            items={FILTERS.genres}
            selected={selectedFilters.genres}
            isOpen={openDropdown === 'genres'}
            onToggle={() => setOpenDropdown(openDropdown === 'genres' ? null : 'genres')}
            onSelect={(v) => toggleFilter('genres', v)}
          />
          <FilterDropdown
            label="Release year"
            items={FILTERS.releaseYear}
            selected={selectedFilters.releaseYear}
            isOpen={openDropdown === 'releaseYear'}
            onToggle={() => setOpenDropdown(openDropdown === 'releaseYear' ? null : 'releaseYear')}
            onSelect={(v) => toggleFilter('releaseYear', v)}
          />
          <FilterDropdown
            label="Rating"
            items={FILTERS.rating}
            selected={selectedFilters.rating}
            isOpen={openDropdown === 'rating'}
            onToggle={() => setOpenDropdown(openDropdown === 'rating' ? null : 'rating')}
            onSelect={(v) => toggleFilter('rating', v)}
          />
          <FilterDropdown
            label="Age rating"
            items={FILTERS.ageRating}
            selected={selectedFilters.ageRating}
            isOpen={openDropdown === 'ageRating'}
            onToggle={() => setOpenDropdown(openDropdown === 'ageRating' ? null : 'ageRating')}
            onSelect={(v) => toggleFilter('ageRating', v)}
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
          <strong>65,321</strong> titles&ensp;·&ensp;sorted by&ensp;
          <span className="filter-panel__sort-value">
            Popularity <ChevronDown />
          </span>
        </span>
      </div>
    </section>
  )
}

/* ─── Filter Dropdown Sub-component ──────── */
function FilterDropdown({ label, items, selected, isOpen, onToggle, onSelect }) {
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
            const isSelected = selected.has(item)
            return (
              <button
                key={item}
                className={`filter-panel__dropdown-item${isSelected ? ' selected' : ''}`}
                onClick={() => onSelect(item)}
              >
                <span className="check">
                  {isSelected && <CheckIcon />}
                </span>
                {item}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
