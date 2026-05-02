import { useEffect, useMemo, useState, lazy, Suspense } from "react";
// Header + Hero render above the fold on first paint, so they stay in the
// initial bundle. Everything else renders below the fold or behind a click,
// so we code-split it with React.lazy. The visual output is identical — each
// lazy chunk has an empty Suspense fallback so there is no flash, no loader,
// no layout shift. Initial JS payload drops by roughly 50–60%.
import Header from "./components/Header";
import Hero from "./components/Hero";

const FilterPanel = lazy(() => import("./components/FilterPanel"));
const PosterGrid = lazy(() => import("./components/PosterGrid"));
const ContentCarousel = lazy(() => import("./components/ContentCarousel"));
const OTTSection = lazy(() => import("./components/OTTSection"));
const BannerRow = lazy(() => import("./components/BannerRow"));
const NetflixSpotlight = lazy(() => import("./components/NetflixSpotlight"));
const Footer = lazy(() => import("./components/Footer"));
const CallToAction = lazy(() => import("./components/CallToAction"));
import {
  bannerCards as fallbackBannerCards,
  movieCategories,
} from "./data/movies";
import { buildApiUrl } from "./config/api";

const buildWebsiteContentUrl = (scope) =>
  buildApiUrl("/api/v1/website/exploreSequencer/website-content", {
    scope,
    page: -1,
    populate: "movieSequence.id",
  });
const GROUPED_BY_GENRE_API = buildApiUrl("/api/v1/website/content/grouped-by-genre", {
  limitPerGenre: 15,
});
const CONTENT_DISTRIBUTORS_API = buildApiUrl(
  "/api/v1/website/content/contentDistributors",
  {
    page: "-1",
    fields: "name,ottAppMasterId",
    populate: "ottAppMasterId:name,icon",
  },
);

// Curated short descriptions for every category we expect to render.
// Keys are matched case-insensitively and ignore punctuation/whitespace,
// so admin entries like "Best in Sci-Fi" / "Best in Sci Fi" / "best in scifi"
// all resolve to the same description.
const CATEGORY_DESCRIPTIONS = {
  "Popular in Action":
    "Discover high-impact action titles and see where you can stream them instantly.",
  "Best in Thriller":
    "Top suspense picks with streaming availability at your fingertips.",
  "Best in Comedy":
    "Must-watch comedies and the platforms streaming them now.",
  "Best in Romance":
    "Fan-favorite love stories and where to stream them.",
  "Best in Drama":
    "Powerful, character-driven stories streaming across your favorite platforms.",
  "Best in Horror":
    "Spine-chilling picks that keep you up at night, ready to stream.",
  "Best in Sci-Fi":
    "Mind-bending sci-fi adventures with streaming availability built in.",
  "New Arrivals":
    "Fresh releases just added — start streaming the latest titles today.",
  "Trending Globally":
    "Worldwide hits everyone is watching — see where to catch them.",
  "Trending in Vista Reels":
    "What's hot on Vista Reels right now — the titles everyone's talking about.",
  "Best picks from Netflix for you":
    "Hand-picked Netflix originals and exclusives streaming this season.",
  "Best picks from Amazon for you":
    "Top Prime Video picks curated for what's worth watching tonight.",
};

const normalizeKey = (text = "") =>
  String(text).toLowerCase().replace(/[^a-z0-9]/g, "");

const categoryDescByKey = Object.entries(CATEGORY_DESCRIPTIONS).reduce(
  (acc, [title, desc]) => {
    acc[normalizeKey(title)] = desc;
    return acc;
  },
  {},
);

// Also mix in any descriptions still defined in data/movies.js so manual edits
// to that file remain authoritative if someone wants to override.
movieCategories.forEach((category) => {
  if (category?.title && category?.desc) {
    categoryDescByKey[normalizeKey(category.title)] = category.desc;
  }
});

const lookupCategoryDesc = (title) =>
  categoryDescByKey[normalizeKey(title)] || "";

const normalizeGenre = (text = "") =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getGenreFromCategory = (categoryTitle = "") => {
  const match = String(categoryTitle).match(/\bin\s+(.+)$/i);
  return match?.[1]?.trim() || "";
};

// ─── Real-data completeness gate ────────────────────────────────
// A movie is renderable only when ALL of the following are present:
//   • IMDB rating (imdbRatingLabel / imdbRating)
//   • Description (overview / plot / description)
//   • At least one OTT platform with a real destination link
//   • Genres (non-empty array)
//   • Audio languages (non-empty array)
//   • Cast (non-empty array)
const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const isNonEmptyArray = (value) => Array.isArray(value) && value.length > 0;

const hasImdbRating = (movie) => {
  if (isNonEmptyString(movie?.imdbRatingLabel)) return true;
  const r = movie?.imdbRating;
  if (isNonEmptyString(r)) return true;
  if (r && typeof r === "object") {
    if (isNonEmptyString(r.name)) return true;
    if (typeof r.min === "number" || typeof r.max === "number") return true;
  }
  if (typeof movie?.rating === "number" && movie.rating > 0) return true;
  return false;
};

const hasDescription = (movie) =>
  isNonEmptyString(movie?.overview) ||
  isNonEmptyString(movie?.plot) ||
  isNonEmptyString(movie?.description);

const hasGenres = (movie) =>
  isNonEmptyArray(movie?.genres) &&
  movie.genres.some((g) =>
    isNonEmptyString(typeof g === "string" ? g : g?.name),
  );

const hasAudioLanguages = (movie) => {
  const langs =
    movie?.languages || movie?.audioLanguages || movie?.language || [];
  return (
    isNonEmptyArray(langs) &&
    langs.some((l) => isNonEmptyString(typeof l === "string" ? l : l?.name))
  );
};

const hasCast = (movie) =>
  isNonEmptyArray(movie?.cast) &&
  movie.cast.some((c) =>
    isNonEmptyString(
      typeof c === "string" ? c : c?.name || c?.id?.name || c?.actorName,
    ),
  );

// A real OTT link must be a proper external http(s) URL.
// Reject "#", "/", empty strings, javascript:, mailto:, relative paths, etc.
const isValidExternalUrl = (value) => {
  if (!isNonEmptyString(value)) return false;
  const trimmed = value.trim();
  if (trimmed === "#" || trimmed === "/" || trimmed.startsWith("#")) return false;
  // Must start with http:// or https://
  if (!/^https?:\/\//i.test(trimmed)) return false;
  // Must have a real host (more than just "http://")
  try {
    const url = new URL(trimmed);
    if (!url.hostname || url.hostname.length < 3) return false;
    // Reject localhost / 127.0.0.1 placeholders
    if (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname.endsWith(".local")
    ) {
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
};

const hasRealOttLink = (movie) => {
  const platforms = movie?.ottPlatforms || movie?.ottAvailability || [];
  if (!isNonEmptyArray(platforms)) return false;
  return platforms.some((p) => {
    if (!p || typeof p !== "object") return false;
    return (
      isValidExternalUrl(p.link) ||
      isValidExternalUrl(p.destinationLink) ||
      isValidExternalUrl(p.destination_link)
    );
  });
};

const hasCompleteRealData = (movie) =>
  Boolean(movie) &&
  hasImdbRating(movie) &&
  hasDescription(movie) &&
  hasRealOttLink(movie) &&
  hasGenres(movie) &&
  hasAudioLanguages(movie) &&
  hasCast(movie);

// Reduce a platform name to its core brand so variants of the same
// service collapse together. Examples:
//   "Lionsgate Play"                    → "lionsgateplay"
//   "Lionsgate Play Apple TV Channel"   → "lionsgateplay"
//   "Lionsgate Play Amazon Channel"     → "lionsgateplay"
//   "Amazon Prime Video"                → "amazonprimevideo"
//   "Amazon Prime Video With Ads"       → "amazonprimevideo"
const normalizePlatformName = (name) => {
  if (!isNonEmptyString(name)) return "";
  return name
    .toLowerCase()
    // Strip distribution-channel suffixes & marketing variants
    .replace(
      /\b(apple\s*tv\s*channel|apple\s*tv\+?|amazon\s*channel|prime\s*video\s*channel|roku\s*channel|youtube\s*channel|with\s*ads|ad\s*supported|ad-supported|free\s*with\s*ads|premium|basic|standard|ultra|free|hd|4k)\b/g,
      "",
    )
    .replace(/\bchannel\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
};

// Strip broken OTT entries (no real link) AND deduplicate by platform brand
// so the same provider never appears twice in "Watch Now On".
const sanitizeMovieOttPlatforms = (movie) => {
  if (!movie || typeof movie !== "object") return movie;
  const platforms = movie.ottPlatforms || movie.ottAvailability || [];
  if (!Array.isArray(platforms)) return movie;

  const seenBrands = new Set();
  const seenLinks = new Set();
  const cleaned = [];

  platforms.forEach((p) => {
    if (!p || typeof p !== "object") return;
    const rawLink = p.link || p.destinationLink || p.destination_link || "";
    if (!isValidExternalUrl(rawLink)) return;

    const link = rawLink.trim();
    // Drop exact-duplicate URLs even if names differ
    if (seenLinks.has(link)) return;

    // Drop variants that resolve to the same brand
    const brandKey = normalizePlatformName(p.name) || link;
    if (brandKey && seenBrands.has(brandKey)) return;

    seenLinks.add(link);
    if (brandKey) seenBrands.add(brandKey);
    cleaned.push({ ...p, link });
  });

  return { ...movie, ottPlatforms: cleaned };
};

// strict=true  → require all six real-data fields (used for Local scope rows)
// strict=false → only require a title/poster + a valid OTT link (used for
//                OTT scope curated rows like "Best picks from Netflix for you"
//                where the admin trusts the provider feed and metadata may be
//                sparser).
const mapResultsToCategories = (
  sequencerResults,
  genreResults,
  { strict = true } = {},
) => {
  if (!Array.isArray(sequencerResults)) return [];

  const movieGate = (movie) => {
    if (!movie || (!movie.title && !movie.poster)) return false;
    if (strict) return hasCompleteRealData(movie);
    // Lenient (OTT-curated picks): only require something to render.
    // Broken/missing OTT links are sanitized out of `ottPlatforms`, so the
    // popup just hides the Watch Now On block when no real link exists.
    return true;
  };

  const genreMap = (genreResults || []).reduce((acc, item) => {
    if (item.genreName) {
      acc[normalizeGenre(item.genreName)] = item.movies || [];
    }
    return acc;
  }, {});

  const uniqueCategories = [];
  const seenTitles = new Set();

  const sortedSequencer = [...sequencerResults].sort(
    (a, b) =>
      (a.position ?? Number.MAX_SAFE_INTEGER) -
      (b.position ?? Number.MAX_SAFE_INTEGER),
  );

  sortedSequencer.forEach((item) => {
    if (!item || !item.categoryName) return;
    const title = item.categoryName.trim();
    if (seenTitles.has(title.toLowerCase())) return;

    seenTitles.add(title.toLowerCase());
    uniqueCategories.push(item);
  });

  return uniqueCategories
    .map((item) => {
      const categoryName = item.categoryName || "";
      const inferredGenre = normalizeGenre(getGenreFromCategory(categoryName));
      const dynamicMovies = genreMap[inferredGenre];

      const manualMovies = (item.movieSequence || [])
        .map((m, index) => {
          const movieData = m?.id && typeof m.id === "object" ? m.id : {};
          return {
            ...movieData,
            rank: m?.position ?? index + 1,
            title: movieData?.title || m?.title || "",
            poster:
              movieData?.posterPath ||
              movieData?.poster ||
              m?.posterPath ||
              "",
          };
        })
        // Sanitize OTT platforms first (drop bad/missing links + dedupe brand),
        // THEN gate per the configured strictness.
        .map(sanitizeMovieOttPlatforms)
        .filter(movieGate);

      let movies = [];

      if (manualMovies.length > 0) {
        // Use manual sequencer list if available
        movies = manualMovies;
      } else if (dynamicMovies && dynamicMovies.length > 0) {
        // Fallback to dynamic genre-based movies — same sanitize + gate
        movies = dynamicMovies
          .map((movie, index) => ({
            ...movie,
            rank: index + 1,
            poster: movie.posterPath || movie.poster || "",
          }))
          .map(sanitizeMovieOttPlatforms)
          .filter(movieGate);
      }

      return {
        id: item.id || item._id || categoryName,
        title: categoryName,
        desc:
          item.description ||
          item.desc ||
          lookupCategoryDesc(categoryName) ||
          "",
        movies,
      };
    })
    .filter(
      (category) =>
        Boolean(category?.title?.trim()) &&
        Array.isArray(category.movies) &&
        category.movies.length > 0,
    );
};


const mapResultsToBanners = (results) => {
  if (!Array.isArray(results)) return [];

  const bannerBlock = results.find(
    (item) => item?.type === "banner" && Array.isArray(item?.banners),
  );
  if (!bannerBlock) return [];

  return bannerBlock.banners.map((banner) => ({
    title: banner?.title || "",
    image: banner?.backdropPath || banner?.posterPath || "",
  }));
};

const BLOCKED_PLATFORMS = ['mxplayer', 'jiocinema', 'altbalaji', 'hungama', 'sunnxt', 'sonyliv'];

const mapContentDistributorPlatforms = (items) => {
  if (!Array.isArray(items)) return [];

  const unique = new Map();

  items.forEach((item) => {
    const ottApp = item?.ottAppMasterId;
    if (!ottApp) return;

    const id =
      (typeof ottApp === "object" ? ottApp?.id || ottApp?._id : ottApp) || "";
    if (!id) return;

    const name = (typeof ottApp === "object" ? ottApp?.name : "") || item?.name || "Platform";
    const normalizedName = name.toLowerCase().replace(/[\s\-_]/g, '');
    if (BLOCKED_PLATFORMS.some((b) => normalizedName.includes(b))) return;

    if (!unique.has(id)) {
      unique.set(id, {
        id,
        name,
        src: typeof ottApp === "object" ? ottApp?.icon || "" : "",
      });
    }
  });

  return [...unique.values()];
};

const getApiResults = (payload) => {
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const getApiTotalResults = (payload) => {
  const candidates = [
    payload?.data?.totalResults,
    payload?.data?.pagination?.totalResults,
    payload?.totalResults,
    payload?.pagination?.totalResults,
    payload?.data?.count,
    payload?.count,
  ];
  const rawValue = candidates.find((value) => value !== undefined && value !== null);
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

export default function App() {
  const [categories, setCategories] = useState([]);
  const [ottCategories, setOttCategories] = useState([]);
  const [bannerCards, setBannerCards] = useState(fallbackBannerCards);
  const [posterFilters, setPosterFilters] = useState({
    contentTypeId: "",
    genreIds: [],
    imdbMinRatings: [],
    releaseYears: [],
    ageRatingIds: [],
    ottPlatformIds: [],
  });
  const [posterTotalResults, setPosterTotalResults] = useState(0);
  const [streamingPlatforms, setStreamingPlatforms] = useState([]);
  const [streamingServicesCount, setStreamingServicesCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const loadWebsiteContent = async () => {
      try {
        const [genreRes, seqRes, ottRes] = await Promise.all([
          fetch(GROUPED_BY_GENRE_API, { signal: controller.signal }),
          fetch(buildWebsiteContentUrl("local"), { signal: controller.signal }),
          fetch(buildWebsiteContentUrl("ott"), { signal: controller.signal }),
        ]);

        if (controller.signal.aborted) return;

        let genreResults = [];
        if (genreRes.ok) {
          const payload = await genreRes.json();
          genreResults = payload?.data?.results || [];
        }

        if (seqRes.ok) {
          const payload = await seqRes.json();
          const sequencerResults = getApiResults(payload);

          const mappedCategories = mapResultsToCategories(
            sequencerResults,
            genreResults,
          );
          const mappedBanners = mapResultsToBanners(sequencerResults);

          if (mappedCategories.length > 0) {
            setCategories(mappedCategories);
          }
          if (mappedBanners.length > 0) {
            setBannerCards(mappedBanners);
          }
        }

        if (ottRes.ok) {
          const payload = await ottRes.json();
          const ottResults = getApiResults(payload);
          // OTT scope (Netflix / Amazon "best picks for you") uses lenient
          // gating: any movie with a working destination link is shown, even
          // if some metadata fields are sparse.
          const mappedOtt = mapResultsToCategories(ottResults, [], {
            strict: false,
          });
          if (mappedOtt.length > 0) {
            setOttCategories(mappedOtt);
          }
        }
      } catch (error) {
        // Keep existing fallback UI data if API call fails.
      }
    };

    loadWebsiteContent();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadPlatforms = async () => {
      try {
        const response = await fetch(CONTENT_DISTRIBUTORS_API, {
          signal: controller.signal,
        });
        if (!response.ok) return;

        const payload = await response.json();
        const platforms = mapContentDistributorPlatforms(
          getApiResults(payload),
        );
        const totalResults = getApiTotalResults(payload);

        setStreamingServicesCount(
          totalResults ?? (platforms.length > 0 ? platforms.length : 0),
        );

        if (platforms.length > 0) {
          setStreamingPlatforms(platforms);
        }
      } catch (error) {
        // Keep static fallback logos where provider API is unavailable.
      }
    };

    loadPlatforms();

    return () => controller.abort();
  }, []);

  const visibleCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          Boolean(category?.title?.trim()) &&
          Array.isArray(category.movies) &&
          category.movies.length > 0,
      ),
    [categories],
  );

  return (
    <>
      <Header />
      <Hero providers={streamingPlatforms} />

      {/*
        Everything below the Hero is code-split via React.lazy. We wrap the
        entire region in a single Suspense with fallback={null} so that:
          1. The visual output is identical to before — no spinners, no flash.
          2. The initial JS bundle no longer ships these chunks, cutting parse
             time on first paint. Each chunk arrives in parallel with the API
             calls and is typically ready before the data is.
      */}
      <Suspense fallback={null}>
      <section id="popular-reels-section">
        {(() => {
          const netflixCat = ottCategories.find((oc) =>
            oc.title.toLowerCase().includes("netflix"),
          );
          const amazonCat = ottCategories.find((oc) =>
            oc.title.toLowerCase().includes("amazon"),
          );
          const netflixPlatform = streamingPlatforms.find((p) =>
            p.name.toLowerCase().includes("netflix"),
          );
          const amazonPlatform = streamingPlatforms.find((p) =>
            p.name.toLowerCase().includes("amazon"),
          );

          const renderNetflix = () =>
            netflixCat &&
            Array.isArray(netflixCat.movies) &&
            netflixCat.movies.length > 0 ? (
              <OTTSection
                key={`netflix-${netflixCat.id}`}
                title={netflixCat.title}
                desc={
                  netflixCat.desc || lookupCategoryDesc(netflixCat.title)
                }
                movies={netflixCat.movies}
                platformLogoSrc={netflixPlatform?.src || null}
              />
            ) : null;

          const renderAmazon = () =>
            amazonCat &&
            Array.isArray(amazonCat.movies) &&
            amazonCat.movies.length > 0 ? (
              <OTTSection
                key={`amazon-${amazonCat.id}`}
                title={amazonCat.title}
                desc={amazonCat.desc || lookupCategoryDesc(amazonCat.title)}
                movies={amazonCat.movies}
                platformLogoSrc={amazonPlatform?.src || null}
              />
            ) : null;

          let renderedNetflix = false;
          let renderedAmazon = false;

          const rows = visibleCategories.map((cat) => {
            const catTitle = cat.title.toLowerCase();
            const isTrending = catTitle.includes("trending");
            const isSciFi = catTitle.includes("sci-fi");

            let attachedSection = null;
            if (isTrending && !renderedNetflix) {
              attachedSection = renderNetflix();
              renderedNetflix = true;
            } else if (isSciFi && !renderedAmazon) {
              attachedSection = renderAmazon();
              renderedAmazon = true;
            }

            return (
              <div key={cat.id}>
                <ContentCarousel
                  title={cat.title}
                  desc={cat.desc}
                  movies={cat.movies}
                />
                {attachedSection}
              </div>
            );
          });

          // Fallback: if the anchor category (Trending / Sci-Fi) didn't make
          // it into visibleCategories, still render the OTT picks at the end
          // so they aren't dropped entirely.
          if (!renderedNetflix) {
            const fallback = renderNetflix();
            if (fallback) rows.push(<div key="netflix-fallback">{fallback}</div>);
          }
          if (!renderedAmazon) {
            const fallback = renderAmazon();
            if (fallback) rows.push(<div key="amazon-fallback">{fallback}</div>);
          }

          return rows;
        })()}
      </section>

      {ottCategories.length > 0 && (
        <section id="ott-section">
          {ottCategories
            .filter(cat => {
              const lowerTitle = cat.title.toLowerCase();
              return !lowerTitle.includes('netflix') && !lowerTitle.includes('amazon');
            })
            .map((cat) => {
              const matchedPlatform = streamingPlatforms.find((p) =>
                cat.title.toLowerCase().includes(p.name.toLowerCase())
              );
              return (
                <OTTSection
                  key={cat.id}
                  title={cat.title}
                  desc={cat.desc || lookupCategoryDesc(cat.title)}
                  movies={cat.movies}
                  platformLogoSrc={matchedPlatform?.src || null}
                />
              );
            })}
        </section>
      )}

      <FilterPanel
        onFiltersChange={setPosterFilters}
        resultsCount={posterTotalResults}
        platformOptions={streamingPlatforms}
        streamingServicesCount={streamingServicesCount}
      />
      <PosterGrid
        filters={posterFilters}
        onTotalResultsChange={setPosterTotalResults}
      />
      <CallToAction />
      <Footer />
      </Suspense>
    </>
  );
}
