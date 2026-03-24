import { useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Mousewheel } from "swiper/modules";
import { buildApiUrl } from "../config/api";
import "swiper/css";
import "./MediaPopup.css";

const FALLBACK_GENRES = ["Crime", "Drama", "Mystery", "Romance", "Thriller"];
const FALLBACK_CAST = [
  { name: "Hrithik Roshan" },
  { name: "Abhay Deol" },
  { name: "Farhan Akhtar" },
  { name: "Katrina Kaif" },
];
const WHEEL_SWITCH_THRESHOLD = 24;
const REEL_SWITCH_SPEED_MS = 380;

const normalizeCastAvatar = (value) => {
  if (!value || typeof value !== "string") return "";
  if (value.startsWith("http")) return value;
  if (value.startsWith("/")) {
    return `https://image.tmdb.org/t/p/w500${value}`;
  }
  return value;
};

const getValueName = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return value.name?.toUpperCase() || "";
  return "";
};

const getGenres = (item) => {
  if (Array.isArray(item?.genres) && item.genres.length > 0) {
    const cleaned = item.genres
      .map((value) => getValueName(value))
      .filter(Boolean);
    if (cleaned.length > 0) return cleaned.slice(0, 5);
  }

  if (item?.genre) return [item.genre];
  return FALLBACK_GENRES;
};

const getCast = (item) => {
  if (Array.isArray(item?.cast) && item.cast.length > 0) {
    return item.cast
      .map((member) => {
        if (typeof member === "string") return { name: member, image: "" };

        const castRef =
          member?.id && typeof member.id === "object" ? member.id : null;
        const castName =
          member?.name ||
          castRef?.name ||
          castRef?.title ||
          member?.characterName ||
          "Unknown";

        const castImage = normalizeCastAvatar(
          member?.avatar ||
            member?.image ||
            member?.profilePath ||
            castRef?.avatar ||
            castRef?.image ||
            castRef?.profilePath ||
            "",
        );

        return {
          name: castName,
          image: castImage,
        };
      })
      .slice(0, 6);
  }

  return FALLBACK_CAST;
};

const getMetaParts = (item, genres) => {
  const formatReleaseDate = (value) => {
    if (!value) return "";

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return typeof value === "string" ? value : "";
    }

    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(parsed);
  };

  const duration =
    item?.duration || item?.runtime || item?.durationText || "2h 34m";
  const certificate = item?.certificate || item?.certification || "UA (IN)";
  const leadGenre = genres[0] || "Drama";
  const releaseText =
    formatReleaseDate(item?.releaseDateText || item?.releaseDate) ||
    (item?.year ? `1 January, ${item.year}` : "15 July, 2011");
  return [duration, `${certificate}/${leadGenre}`, releaseText];
};

const getInitials = (name) =>
  name
    .split(" ")
    .map((part) => part?.[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

const getApiResults = (payload) => {
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const isObjectId = (value) =>
  typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value.trim());

const getContentId = (item) => {
  const candidates = [item?.contentId, item?.id, item?._id];
  const contentId = candidates.find((value) => isObjectId(value));
  return contentId || "";
};

export default function MediaPopup({
  isOpen,
  onClose,
  item,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  prevLabel = "Previous",
  nextLabel = "Next",
}) {
  const [reels, setReels] = useState([]);
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [isLoadingReels, setIsLoadingReels] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [readyReels, setReadyReels] = useState({});
  const [showPlaybackControl, setShowPlaybackControl] = useState(false);
  const playbackControlTimerRef = useRef(null);
  const swiperRef = useRef(null);
  const videoRefs = useRef({});
  const activeReel = reels[activeReelIndex] || null;
  const reelVideoUrl = activeReel?.videoUrl || "";
  const contentId = getContentId(item);
  const reelCountText =
    reels.length > 0 ? `${activeReelIndex + 1} / ${reels.length}` : "";

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscrollBehavior =
      document.body.style.overscrollBehavior;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousHtmlOverscrollBehavior =
      document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.style.overscrollBehavior =
        previousHtmlOverscrollBehavior;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    if (!contentId) {
      setReels([]);
      setActiveReelIndex(0);
      setIsLoadingReels(false);
      setReadyReels({});
      return undefined;
    }

    const controller = new AbortController();

    const loadReels = async () => {
      setIsLoadingReels(true);
      try {
        const response = await fetch(
          buildApiUrl("/api/v1/website/reels/website-reels", {
            contentId,
            limit: 15,
          }),
          { signal: controller.signal },
        );

        if (!response.ok) return;

        const payload = await response.json();
        const mappedReels = getApiResults(payload).filter(
          (reel) => typeof reel?.videoUrl === "string" && reel.videoUrl.trim(),
        );

        setReels(mappedReels);
        setActiveReelIndex(0);
        setReadyReels({});
      } catch (error) {
        setReels([]);
        setActiveReelIndex(0);
        setReadyReels({});
      } finally {
        setIsLoadingReels(false);
      }
    };

    loadReels();

    return () => controller.abort();
  }, [isOpen, contentId]);

  const startAutoplay = (video) => {
    if (!video) return;

    // Try autoplay with sound first; fall back to muted playback if blocked.
    video.muted = false;
    video.defaultMuted = false;
    video.volume = 1;

    video
      .play()
      .then(() => setIsVideoPlaying(true))
      .catch(() => {
        video.muted = true;
        video.defaultMuted = true;
        video
          .play()
          .then(() => setIsVideoPlaying(true))
          .catch(() => setIsVideoPlaying(false));
      });
  };

  const revealPlaybackControl = () => {
    if (!reelVideoUrl) return;
    setShowPlaybackControl(true);
    if (playbackControlTimerRef.current) {
      clearTimeout(playbackControlTimerRef.current);
    }
    playbackControlTimerRef.current = setTimeout(() => {
      setShowPlaybackControl(false);
    }, 1200);
  };

  useEffect(() => {
    if (!isOpen) {
      Object.values(videoRefs.current).forEach((video) => {
        if (video && !video.paused) video.pause();
      });
      return;
    }

    const activeVideo = videoRefs.current[activeReelIndex];
    Object.entries(videoRefs.current).forEach(([index, video]) => {
      if (!video) return;
      if (Number(index) !== activeReelIndex && !video.paused) {
        video.pause();
      }
    });

    if (activeVideo && reelVideoUrl) {
      setIsVideoPlaying(true);
      startAutoplay(activeVideo);
    }
    setShowPlaybackControl(false);
  }, [isOpen, activeReelIndex, reelVideoUrl]);

  useEffect(
    () => () => {
      if (playbackControlTimerRef.current) {
        clearTimeout(playbackControlTimerRef.current);
      }
    },
    [],
  );

  const selectedItem = item || {};
  const poster = selectedItem.poster || selectedItem.image || "";
  const plot =
    selectedItem.plot ||
    selectedItem.overview ||
    selectedItem.description ||
    "Three friends who were inseparable in childhood decide to go on a road trip to rediscover themselves and repair old bonds before one of them gets married.";
  const genres = getGenres(selectedItem);
  const cast = getCast(selectedItem);
  const metaParts = getMetaParts(selectedItem, genres);

  const goToNextReel = () => {
    if (reels.length <= 1) return;
    const nextIndex = (activeReelIndex + 1) % reels.length;
    if (swiperRef.current) {
      swiperRef.current.slideTo(nextIndex, REEL_SWITCH_SPEED_MS);
      return;
    }
    setActiveReelIndex(nextIndex);
  };

  const toggleVideoPlayback = () => {
    const video = videoRefs.current[activeReelIndex];
    if (!video) return;

    video.muted = false;
    video.defaultMuted = false;

    if (video.paused) {
      video
        .play()
        .then(() => setIsVideoPlaying(true))
        .catch(() => {});
      return;
    }

    video.pause();
    setIsVideoPlaying(false);
  };

  if (!isOpen || !item) return null;

  return (
    <div
      className="media-popup"
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-popup-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        className="media-popup__panel"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div
          className="media-popup__media"
          onClick={(event) => {
            if (!reelVideoUrl) return;
            if (event.target.closest("button, a")) return;
            revealPlaybackControl();
            toggleVideoPlayback();
          }}
        >
          {isLoadingReels ? (
            <div className="media-popup__poster-placeholder">
              Loading reels...
            </div>
          ) : reelVideoUrl ? (
            <>
              <Swiper
                className="media-popup__reel-swiper"
                direction="vertical"
                modules={[Mousewheel]}
                mousewheel={
                  reels.length > 1
                    ? {
                        forceToAxis: true,
                        thresholdDelta: WHEEL_SWITCH_THRESHOLD,
                        sensitivity: 0.6,
                        releaseOnEdges: false,
                      }
                    : false
                }
                speed={REEL_SWITCH_SPEED_MS}
                slidesPerView={1}
                spaceBetween={0}
                nested
                preventClicks
                preventClicksPropagation
                allowTouchMove={reels.length > 1}
                onSwiper={(swiper) => {
                  swiperRef.current = swiper;
                  if (swiper.activeIndex !== activeReelIndex) {
                    swiper.slideTo(activeReelIndex, 0);
                  }
                }}
                onSlideChange={(swiper) => {
                  setActiveReelIndex(swiper.activeIndex);
                }}
              >
                {reels.map((reel, index) => (
                  <SwiperSlide
                    className="media-popup__reel-slide"
                    key={reel?._id || reel?.id || `${index}-${reel.videoUrl}`}
                  >
                    <video
                      ref={(node) => {
                        if (node) videoRefs.current[index] = node;
                        else delete videoRefs.current[index];
                      }}
                      className={`media-popup__reel-video${readyReels[index] ? " media-popup__reel-video--ready" : ""}`}
                      src={reel.videoUrl}
                      playsInline
                      preload={index === activeReelIndex ? "auto" : "metadata"}
                      onLoadedData={(event) => {
                        setReadyReels((prev) =>
                          prev[index] ? prev : { ...prev, [index]: true },
                        );
                        if (index === activeReelIndex) {
                          startAutoplay(event.currentTarget);
                        }
                      }}
                      onEnded={() => {
                        if (index === activeReelIndex) goToNextReel();
                      }}
                      onPause={() => {
                        if (index === activeReelIndex) {
                          setIsVideoPlaying(false);
                        }
                      }}
                      onPlay={() => {
                        if (index === activeReelIndex) {
                          setIsVideoPlaying(true);
                        }
                      }}
                    />
                  </SwiperSlide>
                ))}
              </Swiper>
              <div className="media-popup__reel-badge">
                <span>Reels</span>
                <span>{reelCountText}</span>
              </div>
              <button
                type="button"
                className={`media-popup__play-toggle${showPlaybackControl ? " media-popup__play-toggle--visible" : ""}`}
                onClick={(event) => {
                  event.stopPropagation();
                  revealPlaybackControl();
                  toggleVideoPlayback();
                }}
                aria-label={
                  isVideoPlaying ? "Pause reel video" : "Play reel video"
                }
              >
                {isVideoPlaying ? (
                  <span
                    className="media-popup__pause-icon"
                    aria-hidden="true"
                  />
                ) : (
                  <span className="media-popup__play-icon" aria-hidden="true" />
                )}
              </button>
            </>
          ) : poster ? (
            <img
              className="media-popup__poster"
              src={poster}
              alt={selectedItem.title || "Selected title"}
            />
          ) : (
            <div className="media-popup__poster-placeholder">
              No image available
            </div>
          )}

          <button
            type="button"
            className="media-popup__close media-popup__close--media"
            onClick={onClose}
            aria-label="Close popup"
          >
            <svg
              className="media-popup__close-icon"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>

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
            <svg
              className="media-popup__close-icon"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>

          <h3 className="media-popup__title" id="media-popup-title">
            {selectedItem.title || "Untitled"}
          </h3>

          <div
            className="media-popup__meta-line"
            aria-label={metaParts.join(" • ")}
          >
            {metaParts.map((part, index) => (
              <div className="media-popup__meta-item" key={`${index}-${part}`}>
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
                <span
                  className="media-popup__genre-chip first-letter"
                  key={genre}
                >
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
  );
}
