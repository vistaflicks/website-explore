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
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.vistareels.app";
const APP_STORE_URL = "https://apps.apple.com/in/app/vista-reel/id6746562815";
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
  isPromo = false,
}) {
  const [reels, setReels] = useState([]);
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [isLoadingReels, setIsLoadingReels] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [readyReels, setReadyReels] = useState({});
  const [videoErrors, setVideoErrors] = useState({});
  const [showPlaybackControl, setShowPlaybackControl] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const [isDownloadSlideActive, setIsDownloadSlideActive] = useState(false);
  const [navTransitionDirection, setNavTransitionDirection] = useState("");
  const playbackControlTimerRef = useRef(null);
  const navTransitionTimerRef = useRef(null);
  const navTransitionFrameRef = useRef(null);
  const swiperRef = useRef(null);
  const videoRefs = useRef({});
  const hasInteractedRef = useRef(false);
  const activeReel = reels[activeReelIndex] || null;
  const reelVideoUrl = activeReel?.videoUrl || "";
  const contentId = getContentId(item);
  const downloadSlideIndex = reels.length;
  const canSlideReels = reels.length > 0;
  const showNoReelsLayout = !isLoadingReels && !reelVideoUrl;

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
      setVideoErrors({});
      setIsDownloadSlideActive(false);
      setShowScrollHint(true);
      hasInteractedRef.current = false;
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
        setVideoErrors({});
        setIsDownloadSlideActive(false);
        setShowScrollHint(true);
        hasInteractedRef.current = false;
      } catch (error) {
        setReels([]);
        setActiveReelIndex(0);
        setReadyReels({});
        setVideoErrors({});
        setIsDownloadSlideActive(false);
        setShowScrollHint(true);
        hasInteractedRef.current = false;
      } finally {
        setIsLoadingReels(false);
      }
    };

    loadReels();

    return () => controller.abort();
  }, [isOpen, contentId, isPromo]);

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
    if (isDownloadSlideActive) return;
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
    if (isDownloadSlideActive) return undefined;
    if (!isOpen || !showScrollHint || reels.length <= 1) return undefined;

    const hintTimer = setTimeout(() => {
      setShowScrollHint(false);
    }, 3200);

    return () => clearTimeout(hintTimer);
  }, [isOpen, showScrollHint, isDownloadSlideActive, reels.length]);

  useEffect(() => {
    if (!isOpen) {
      Object.values(videoRefs.current).forEach((video) => {
        if (video && !video.paused) video.pause();
      });
      setIsDownloadSlideActive(false);
      setShowScrollHint(true);
      setVideoErrors({});
      hasInteractedRef.current = false;
      return;
    }

    if (isDownloadSlideActive) {
      Object.values(videoRefs.current).forEach((video) => {
        if (video && !video.paused) video.pause();
      });
      setIsVideoPlaying(false);
      setShowPlaybackControl(false);
      setVideoErrors({});
      return;
    }

    const activeVideo = videoRefs.current[activeReelIndex];
    Object.entries(videoRefs.current).forEach(([index, video]) => {
      if (!video) return;
      if (Number(index) !== activeReelIndex && !video.paused) {
        video.pause();
      }
    });

    if (activeVideo && reelVideoUrl && !isPromo) {
      setIsVideoPlaying(true);
      startAutoplay(activeVideo);
    }
    setShowPlaybackControl(false);
  }, [isOpen, activeReelIndex, reelVideoUrl, isDownloadSlideActive, isPromo]);

  useEffect(
    () => () => {
      if (playbackControlTimerRef.current) {
        clearTimeout(playbackControlTimerRef.current);
      }
      if (navTransitionTimerRef.current) {
        clearTimeout(navTransitionTimerRef.current);
      }
      if (navTransitionFrameRef.current) {
        cancelAnimationFrame(navTransitionFrameRef.current);
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
    if (isDownloadSlideActive) return;
    if (reels.length <= 1) return;
    const nextIndex = (activeReelIndex + 1) % reels.length;
    if (swiperRef.current) {
      swiperRef.current.slideTo(nextIndex, REEL_SWITCH_SPEED_MS);
      return;
    }
    setActiveReelIndex(nextIndex);
  };

  const markReelInteraction = () => {
    if (!hasInteractedRef.current) {
      hasInteractedRef.current = true;
    }
    setShowScrollHint(false);
  };

  const openDownloadSlide = () => {
    markReelInteraction();
    setIsDownloadSlideActive(true);
    if (swiperRef.current) {
      swiperRef.current.slideTo(downloadSlideIndex, REEL_SWITCH_SPEED_MS);
    }
  };

  const closeDownloadSlide = () => {
    if (swiperRef.current && reels.length > 0) {
      swiperRef.current.slideTo(
        Math.max(0, reels.length - 1),
        REEL_SWITCH_SPEED_MS,
      );
    }
    setIsDownloadSlideActive(false);
  };

  const toggleVideoPlayback = () => {
    if (isDownloadSlideActive) return;
    const video = videoRefs.current[activeReelIndex];
    if (!video) return;

    video.muted = false;
    video.defaultMuted = false;

    if (video.paused) {
      video
        .play()
        .then(() => setIsVideoPlaying(true))
        .catch(() => { });
      return;
    }

    video.pause();
    setIsVideoPlaying(false);
  };

  const triggerNavTransition = (direction, callback) => {
    if (typeof callback !== "function") return;
    callback();
    if (navTransitionFrameRef.current) {
      cancelAnimationFrame(navTransitionFrameRef.current);
    }
    navTransitionFrameRef.current = requestAnimationFrame(() => {
      setNavTransitionDirection(direction);
    });
  };

  const handlePrevClick = () => {
    triggerNavTransition("prev", onPrev);
  };

  const handleNextClick = () => {
    triggerNavTransition("next", onNext);
  };

  useEffect(() => {
    if (isPromo && swiperRef.current) {
      if (reels.length > 0) {
        setIsDownloadSlideActive(true);
        swiperRef.current.slideTo(downloadSlideIndex, 0);
      } else {
        // If no reels, we still want to show the download slide if it's the extra one
        setIsDownloadSlideActive(true);
        swiperRef.current.slideTo(0, 0);
      }
    }
  }, [isPromo, downloadSlideIndex, reels.length]);

  useEffect(() => {
    if (!navTransitionDirection) return undefined;
    if (navTransitionTimerRef.current) {
      clearTimeout(navTransitionTimerRef.current);
    }

    navTransitionTimerRef.current = setTimeout(() => {
      setNavTransitionDirection("");
    }, 280);

    return () => {
      if (navTransitionTimerRef.current) {
        clearTimeout(navTransitionTimerRef.current);
      }
    };
  }, [navTransitionDirection, selectedItem?.id, selectedItem?._id, selectedItem?.title]);

  if (!isOpen || !item) return null;

  return (
    <div
      className={`media-popup${isPromo ? " media-popup--promo" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-popup-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        className={`media-popup__panel${isPromo ? " media-popup__panel--promo" : ""}${showNoReelsLayout ? " media-popup__panel--no-reels" : ""}${navTransitionDirection ? ` media-popup__panel--transition-${navTransitionDirection}` : ""}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="media-popup__close media-popup__close--panel"
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

        <div
          className="media-popup__media"
          onClick={(event) => {
            if (!reelVideoUrl) return;
            if (event.target.closest("button, a")) return;
            markReelInteraction();
            revealPlaybackControl();
            toggleVideoPlayback();
          }}
        >
          <div className="media-popup__media-stage">
            {isPromo ? (
              <div
                className="media-popup__download-slide"
                onClick={(event) => event.stopPropagation()}
              >

                <p className="media-popup__download-title">
                  Enjoy more on Vista Reels app
                </p>
                <p className="media-popup__download-subtitle">
                  Discover, like, save and share seamlessly in the app.
                </p>
                <div className="media-popup__download-stores">
                  <a
                    href={PLAY_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="media-popup__download-store"
                  >
                    <img
                      src="/assets/Group-9076-2.svg"
                      alt="Get it on Google Play"
                    />
                  </a>
                  <a
                    href={APP_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="media-popup__download-store"
                  >
                    <img
                      src="/assets/Group-9577.svg"
                      alt="Download on the App Store"
                    />
                  </a>
                </div>
                <img
                  className="media-popup__download-frame"
                  src="/assets/Download-frame.png"
                  alt="Vista Reels app preview"
                />
              </div>
            ) : isLoadingReels ? (
              <div className="media-popup__poster-placeholder">
                <div
                  className="media-popup__loader"
                  role="status"
                  aria-live="polite"
                  aria-label="Loading reels"
                >
                  <span className="media-popup__loader-ring" aria-hidden="true" />
                </div>
              </div>
            ) : reelVideoUrl ? (
              <>
                <Swiper
                  className="media-popup__reel-swiper"
                  direction="vertical"
                  modules={[Mousewheel]}
                  mousewheel={
                    canSlideReels
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
                  allowTouchMove={canSlideReels}
                  onSwiper={(swiper) => {
                    swiperRef.current = swiper;
                    if (swiper.activeIndex !== activeReelIndex) {
                      swiper.slideTo(activeReelIndex, 0);
                    }
                  }}
                  onSlideChange={(swiper) => {
                    markReelInteraction();
                    const isDownload = swiper.activeIndex === downloadSlideIndex;
                    setIsDownloadSlideActive(isDownload);
                    if (!isDownload) {
                      setActiveReelIndex(swiper.activeIndex);
                    }
                  }}
                >
                  {reels.map((reel, index) => (
                    <SwiperSlide
                      className="media-popup__reel-slide"
                      key={reel?._id || reel?.id || `${index}-${reel.videoUrl}`}
                    >
                      <div className="media-popup__reel-media">
                        <video
                          ref={(node) => {
                            if (node) videoRefs.current[index] = node;
                            else delete videoRefs.current[index];
                          }}
                          className={`media-popup__reel-video${readyReels[index] ? " media-popup__reel-video--ready" : ""}`}
                          src={reel.videoUrl}
                          playsInline
                          preload={index === activeReelIndex ? "auto" : "metadata"}
                          onCanPlay={(event) => {
                            setReadyReels((prev) =>
                              prev[index] ? prev : { ...prev, [index]: true },
                            );
                            if (index === activeReelIndex) {
                              startAutoplay(event.currentTarget);
                            }
                          }}
                          onLoadedData={(event) => {
                            setReadyReels((prev) =>
                              prev[index] ? prev : { ...prev, [index]: true },
                            );
                            if (index === activeReelIndex) {
                              startAutoplay(event.currentTarget);
                            }
                          }}
                          onError={() => {
                            setVideoErrors((prev) => ({ ...prev, [index]: true }));
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

                        {videoErrors[index] ? (
                          <img
                            className="media-popup__reel-error-poster"
                            src={reel?.thumbnailUrl || poster || ""}
                            alt={selectedItem?.title || "Video unavailable"}
                          />
                        ) : null}
                      </div>
                    </SwiperSlide>
                  ))}
                  <SwiperSlide className="media-popup__reel-slide">
                    <div
                      className="media-popup__download-slide"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="media-popup__download-slide-close"
                        onClick={closeDownloadSlide}
                        aria-label="Back to reels"
                      >
                        <svg
                          className="media-popup__close-icon"
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                        >
                          <path d="M5 5l10 10M15 5L5 15" />
                        </svg>
                      </button>
                      <p className="media-popup__download-title">
                        Enjoy more on Vista Reels app
                      </p>
                      <p className="media-popup__download-subtitle">
                        Discover, like, save and share seamlessly in the app.
                      </p>
                      <div className="media-popup__download-stores">
                        <a
                          href={PLAY_STORE_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="media-popup__download-store"
                        >
                          <img
                            src="/assets/Group-9076-2.svg"
                            alt="Get it on Google Play"
                          />
                        </a>
                        <a
                          href={APP_STORE_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="media-popup__download-store"
                        >
                          <img
                            src="/assets/Group-9577.svg"
                            alt="Download on the App Store"
                          />
                        </a>
                      </div>
                      <img
                        className="media-popup__download-frame"
                        src="/assets/Download-frame.png"
                        alt="Vista Reels app preview"
                      />
                    </div>
                  </SwiperSlide>
                </Swiper>
                {showScrollHint && !isDownloadSlideActive && reels.length > 1 ? (
                  <div className="media-popup__scroll-hint">
                    <span className="media-popup__scroll-hint-arrow">↑↓</span>
                    <span>Swipe or scroll to browse reels</span>
                  </div>
                ) : null}
                <button
                  type="button"
                  className={`media-popup__play-toggle${showPlaybackControl && !isDownloadSlideActive ? " media-popup__play-toggle--visible" : ""}`}
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
                {!isPromo && (
                  <div className="media-popup__reel-info">
                    <div className="media-popup__reel-info-avatar">
                      {poster ? (
                        <img src={poster} alt={selectedItem.title || "Selected title"} />
                      ) : (
                        <span>{getInitials(selectedItem.title || "Vista Reels")}</span>
                      )}
                    </div>
                    <div className="media-popup__reel-info-copy">
                      <p className="media-popup__reel-info-title">
                        {selectedItem.title || "Untitled"}
                      </p>
                      <p className="media-popup__reel-info-overview">{plot}</p>
                    </div>
                  </div>
                )}
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
          </div>

          {!isPromo && (
            <div className="media-popup__nav">
              <button
                type="button"
                className="media-popup__nav-btn media-popup__nav-btn--ghost"
                onClick={handlePrevClick}
                disabled={!hasPrev}
              >
                {prevLabel}
              </button>
              <button
                type="button"
                className="media-popup__nav-btn media-popup__nav-btn--solid"
                onClick={handleNextClick}
                disabled={!hasNext}
              >
                {nextLabel}
              </button>
            </div>
          )}
        </div>

        {!isPromo && (
          <div className="media-popup__details">
            <div className="media-popup__details-stage">
              {showNoReelsLayout ? (
                <div className="media-popup__details-poster">
                  {poster ? (
                    <img
                      src={poster}
                      alt={selectedItem.title || "Selected title"}
                    />
                  ) : (
                    <div className="media-popup__details-poster-fallback">
                      {getInitials(selectedItem.title || "Vista Reels")}
                    </div>
                  )}
                </div>
              ) : null}

              <div className="media-popup__title-wrap">
                <h3 className="media-popup__title" id="media-popup-title">
                  {selectedItem.title || "Untitled"}
                </h3>
              </div>

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

              {selectedItem.imdbRatingLabel && selectedItem.imdbRatingLabel !== "N/A" && (
                <div className="media-popup__rating-badge">
                  <svg className="media-popup__rating-star" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor" />
                  </svg>
                  <span>{selectedItem.imdbRatingLabel}</span>
                </div>
              )}

              {selectedItem.director && (
                <p className="media-popup__director">
                  Directed by <strong>{selectedItem.director}</strong>
                </p>
              )}

              <div className="media-popup__divider" />

              <section className="media-popup__section">
                <h4 className="media-popup__section-title">Movie Plot</h4>
                <p className="media-popup__plot">{plot}</p>
              </section>

              {Array.isArray(selectedItem.ottPlatforms) && selectedItem.ottPlatforms.length > 0 && (
                <>
                  <div className="media-popup__divider" />
                  <section className="media-popup__section">
                    <h4 className="media-popup__section-title">Watch Now On</h4>
                    <div className="media-popup__ott-list">
                      {selectedItem.ottPlatforms.map((ott, idx) => (
                        <a
                          key={idx}
                          href={ott.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`media-popup__ott-btn ${idx === 0 ? 'media-popup__ott-btn--solid' : 'media-popup__ott-btn--outline'}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>{ott.name?.toUpperCase()}</span>
                        </a>
                      ))}
                    </div>
                  </section>
                </>
              )}

              <div className="media-popup__divider" />

              <div className="media-popup__taxonomy">
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

                {Array.isArray(selectedItem.languages) && selectedItem.languages.length > 0 && (
                  <section className="media-popup__section">
                    <h4 className="media-popup__section-title">Audio Languages</h4>
                    <div className="media-popup__genre-list">
                      {selectedItem.languages.map((lang) => (
                        <span className="media-popup__genre-chip" key={lang}>
                          {lang}
                        </span>
                      ))}
                    </div>
                  </section>
                )}
              </div>

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

              {showNoReelsLayout ? (
                <div className="media-popup__details-nav">
                  <button
                    type="button"
                    className="media-popup__nav-btn media-popup__nav-btn--ghost"
                    onClick={handlePrevClick}
                    disabled={!hasPrev}
                  >
                    {prevLabel}
                  </button>
                  <button
                    type="button"
                    className="media-popup__nav-btn media-popup__nav-btn--solid"
                    onClick={handleNextClick}
                    disabled={!hasNext}
                  >
                    {nextLabel}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
