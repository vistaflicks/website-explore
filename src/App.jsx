import { useEffect, useMemo, useState } from "react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import FilterPanel from "./components/FilterPanel";
import PosterGrid from "./components/PosterGrid";
import ContentCarousel from "./components/ContentCarousel";
import OTTSection from "./components/OTTSection";
import BannerRow from "./components/BannerRow";
import NetflixSpotlight from "./components/NetflixSpotlight";
import Footer from "./components/Footer";
import CallToAction from "./components/CallToAction";
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

const categoryDescFallbacks = movieCategories.reduce((acc, category) => {
  acc[category.title] = category.desc;
  return acc;
}, {});

const normalizeGenre = (text = "") =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getGenreFromCategory = (categoryTitle = "") => {
  const match = String(categoryTitle).match(/\bin\s+(.+)$/i);
  return match?.[1]?.trim() || "";
};

const mapResultsToCategories = (sequencerResults, genreResults) => {
  if (!Array.isArray(sequencerResults)) return [];

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
        .filter((movie) => Boolean(movie?.title || movie?.poster));

      let movies = [];

      if (manualMovies.length > 0) {
        // Use manual sequencer list if available
        movies = manualMovies;
      } else if (dynamicMovies && dynamicMovies.length > 0) {
        // Fallback to dynamic genre-based movies
        movies = dynamicMovies.map((movie, index) => ({
          ...movie,
          rank: index + 1,
          poster: movie.posterPath || "",
        }));
      }

      return {
        id: item.id || item._id || categoryName,
        title: categoryName,
        desc:
          item.description ||
          item.desc ||
          categoryDescFallbacks[categoryName] ||
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
          const mappedOtt = mapResultsToCategories(ottResults, []);
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

      <section id="popular-reels-section">
        {(() => {
          let hasRenderedNetflix = false;
          let hasRenderedAmazon = false;
          
          return visibleCategories.map((cat) => {
            const catTitle = cat.title.toLowerCase();
            const isTrending = catTitle.includes('trending');
            const isSciFi = catTitle.includes('sci-fi');
            
            const netflixCat = ottCategories.find(oc => oc.title.toLowerCase().includes('netflix'));
            const amazonCat = ottCategories.find(oc => oc.title.toLowerCase().includes('amazon'));
            
            const netflixPlatform = streamingPlatforms.find(p => p.name.toLowerCase().includes('netflix'));
            const amazonPlatform = streamingPlatforms.find(p => p.name.toLowerCase().includes('amazon'));

            return (
              <div key={cat.id}>
                <ContentCarousel
                  title={cat.title}
                  desc={cat.desc}
                  movies={cat.movies}
                />
                
                {isTrending && netflixCat && !hasRenderedNetflix && (
                  (() => {
                    hasRenderedNetflix = true;
                    return (
                      <OTTSection
                        key={netflixCat.id}
                        title={netflixCat.title}
                        movies={netflixCat.movies}
                        platformLogoSrc={netflixPlatform?.src || null}
                      />
                    );
                  })()
                )}

                {isSciFi && amazonCat && !hasRenderedAmazon && (
                  (() => {
                    hasRenderedAmazon = true;
                    return (
                      <OTTSection
                        key={amazonCat.id}
                        title={amazonCat.title}
                        movies={amazonCat.movies}
                        platformLogoSrc={amazonPlatform?.src || null}
                      />
                    );
                  })()
                )}
              </div>
            );
          });
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
    </>
  );
}
