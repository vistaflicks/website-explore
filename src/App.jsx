import { useEffect, useMemo, useState } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import FilterPanel from './components/FilterPanel'
import PosterGrid from './components/PosterGrid'
import ContentCarousel from './components/ContentCarousel'
import BannerRow from './components/BannerRow'
import NetflixSpotlight from './components/NetflixSpotlight'
import Footer from './components/Footer'
import CallToAction from './components/CallToAction'
import { bannerCards as fallbackBannerCards, movieCategories } from './data/movies'
import { buildApiUrl } from './config/api'

const WEBSITE_CONTENT_API =
  buildApiUrl('/api/v1/website/exploreSequencer/website-content', {
    scope: 'global',
  })
const CONTENT_DISTRIBUTORS_API = buildApiUrl(
  '/api/v1/website/content/contentDistributors',
  {
    page: '-1',
    fields: 'name,ottAppMasterId',
    populate: 'ottAppMasterId:name,icon',
  },
)

const categoryDescFallbacks = movieCategories.reduce((acc, category) => {
  acc[category.title] = category.desc
  return acc
}, {})

const mapResultsToCategories = (results) => {
  if (!Array.isArray(results)) return []

  return results
    .filter((item) => item && Array.isArray(item.movieSequence))
    .sort((a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER))
    .map((item) => ({
      title: item.categoryName || '',
      desc: item.description || item.desc || categoryDescFallbacks[item.categoryName] || '',
      movies: (item.movieSequence || []).map((movie, index) => {
        const movieData =
          movie?.id && typeof movie.id === 'object' ? movie.id : {}

        return {
          ...movieData,
          rank: movie?.position ?? index + 1,
          title: movieData?.title || movie?.title || '',
          poster:
            movieData?.posterPath ||
            movieData?.poster ||
            movie?.posterPath ||
            '',
        }
      }),
    }))
}

const mapResultsToBanners = (results) => {
  if (!Array.isArray(results)) return []

  const bannerBlock = results.find((item) => item?.type === 'banner' && Array.isArray(item?.banners))
  if (!bannerBlock) return []

  return bannerBlock.banners.map((banner) => ({
    title: banner?.title || '',
    image: banner?.backdropPath || banner?.posterPath || '',
  }))
}

const mapContentDistributorPlatforms = (items) => {
  if (!Array.isArray(items)) return []

  const unique = new Map()

  items.forEach((item) => {
    const ottApp = item?.ottAppMasterId
    if (!ottApp) return

    const id =
      (typeof ottApp === 'object' ? ottApp?.id || ottApp?._id : ottApp) || ''
    if (!id) return

    if (!unique.has(id)) {
      unique.set(id, {
        id,
        name:
          (typeof ottApp === 'object' ? ottApp?.name : '') ||
          item?.name ||
          'Platform',
        src: typeof ottApp === 'object' ? ottApp?.icon || '' : '',
      })
    }
  })

  return [...unique.values()]
}

const getApiResults = (payload) => {
  if (Array.isArray(payload?.data?.results)) return payload.data.results
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.results)) return payload.results
  return []
}

export default function App() {
  const [categories, setCategories] = useState(movieCategories)
  const [bannerCards, setBannerCards] = useState(fallbackBannerCards)
  const [posterFilters, setPosterFilters] = useState({
    contentTypeId: '',
    genreIds: [],
    imdbMinRatings: [],
    releaseYears: [],
    ageRatingIds: [],
    ottPlatformIds: [],
  })
  const [posterTotalResults, setPosterTotalResults] = useState(0)
  const [streamingPlatforms, setStreamingPlatforms] = useState([])

  useEffect(() => {
    const controller = new AbortController()

    const loadWebsiteContent = async () => {
      try {
        const response = await fetch(WEBSITE_CONTENT_API, { signal: controller.signal })
        if (!response.ok) return

        const payload = await response.json()
        const results = payload?.data?.results
        const mapped = mapResultsToCategories(results)
        const mappedBanners = mapResultsToBanners(results)

        if (mapped.length > 0) {
          setCategories(mapped)
        }

        if (mappedBanners.length > 0) {
          setBannerCards(mappedBanners)
        }
      } catch (error) {
        // Keep existing fallback UI data if API call fails.
      }
    }

    loadWebsiteContent()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    const loadPlatforms = async () => {
      try {
        const response = await fetch(CONTENT_DISTRIBUTORS_API, {
          signal: controller.signal,
        })
        if (!response.ok) return

        const payload = await response.json()
        const platforms = mapContentDistributorPlatforms(getApiResults(payload))
        if (platforms.length > 0) {
          setStreamingPlatforms(platforms)
        }
      } catch (error) {
        // Keep static fallback logos where provider API is unavailable.
      }
    }

    loadPlatforms()

    return () => controller.abort()
  }, [])

  const topCategories = useMemo(() => categories.slice(0, 2), [categories])
  const remainingCategories = useMemo(() => categories.slice(2), [categories])

  return (
    <>
      {/* <Header /> */}
      <Hero providers={streamingPlatforms} />

      <section id="popular-reels-section">
        <div className="popular-reels-section__heading-wrap">
          <h2 className="popular-reels-section__heading">
            Popular OTT Platforms, Popular Movies
          </h2>
        </div>

        {topCategories.map((cat) => (
          <ContentCarousel
            key={cat.title}
            title={cat.title}
            desc={cat.desc}
            movies={cat.movies}
          />
        ))}

        <BannerRow bannerCards={bannerCards} />

        <NetflixSpotlight />

        {remainingCategories.map((cat) => (
          <ContentCarousel
            key={cat.title}
            title={cat.title}
            desc={cat.desc}
            movies={cat.movies}
          />
        ))}
      </section>

      <FilterPanel
        onFiltersChange={setPosterFilters}
        resultsCount={posterTotalResults}
        platformOptions={streamingPlatforms}
      />
      <PosterGrid
        filters={posterFilters}
        onTotalResultsChange={setPosterTotalResults}
      />
      <CallToAction />
      <Footer />
    </>
  )
}
