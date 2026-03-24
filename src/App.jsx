import { useEffect, useMemo, useState } from "react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import FilterPanel from "./components/FilterPanel";
import PosterGrid from "./components/PosterGrid";
import ContentCarousel from "./components/ContentCarousel";
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
  buildApiUrl("/api/v1/website/exploreSequencer/website-content", { scope });
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

const mapResultsToCategories = (results) => {
  if (!Array.isArray(results)) return [];

  return results
    .filter((item) => item && Array.isArray(item.movieSequence))
    .sort(
      (a, b) =>
        (a.position ?? Number.MAX_SAFE_INTEGER) -
        (b.position ?? Number.MAX_SAFE_INTEGER),
    )
    .map((item) => {
      const movies = (item.movieSequence || [])
        .map((movie, index) => {
          const movieData =
            movie?.id && typeof movie.id === "object" ? movie.id : {};

          return {
            ...movieData,
            rank: movie?.position ?? index + 1,
            title: movieData?.title || movie?.title || "",
            poster:
              movieData?.posterPath ||
              movieData?.poster ||
              movie?.posterPath ||
              "",
          };
        })
        .filter((movie) => Boolean(movie?.title || movie?.poster));

      return {
        title: item.categoryName || "",
        desc:
          item.description ||
          item.desc ||
          categoryDescFallbacks[item.categoryName] ||
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

const mapContentDistributorPlatforms = (items) => {
  if (!Array.isArray(items)) return [];

  const unique = new Map();

  items.forEach((item) => {
    const ottApp = item?.ottAppMasterId;
    if (!ottApp) return;

    const id =
      (typeof ottApp === "object" ? ottApp?.id || ottApp?._id : ottApp) || "";
    if (!id) return;

    if (!unique.has(id)) {
      unique.set(id, {
        id,
        name:
          (typeof ottApp === "object" ? ottApp?.name : "") ||
          item?.name ||
          "Platform",
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

const resolveScopeFromIp = async () => {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();

    return data?.country === "IN" ? "local" : "global";
  } catch {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timeZone === "Asia/Kolkata" ? "local" : "global";
  }
};

export default function App() {
  const [categories, setCategories] = useState(movieCategories);
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
        const scope = await resolveScopeFromIp(controller.signal);
        if (controller.signal.aborted) return;

        const response = await fetch(buildWebsiteContentUrl(scope), {
          signal: controller.signal,
        });
        if (!response.ok) return;

        const payload = await response.json();
        const results = payload?.data?.results;
        const mapped = mapResultsToCategories(results);
        const mappedBanners = mapResultsToBanners(results);

        if (mapped.length > 0) {
          setCategories(mapped);
        }

        if (mappedBanners.length > 0) {
          setBannerCards(mappedBanners);
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
  const topCategories = useMemo(
    () => visibleCategories.slice(0, 2),
    [visibleCategories],
  );
  const remainingCategories = useMemo(
    () => visibleCategories.slice(2),
    [visibleCategories],
  );

  return (
    <>
      {/* <Header /> */}
      <Hero providers={streamingPlatforms} />

      <section id="popular-reels-section">
        {visibleCategories.length > 0 ? (
          <div className="popular-reels-section__heading-wrap">
            <h2 className="popular-reels-section__heading">
              Popular OTT Platforms, Popular Movies
            </h2>
          </div>
        ) : null}

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
