import { useEffect, useRef, useState } from "react";
import { buildApiUrl } from "../config/api";
import "./MediaPopup.css";

const FALLBACK_GENRES = ["Crime", "Drama", "Mystery", "Romance", "Thriller"];
const FALLBACK_CAST = [
  { name: "Hrithik Roshan" },
  { name: "Abhay Deol" },
  { name: "Farhan Akhtar" },
  { name: "Katrina Kaif" },
];

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
  const [showPlaybackControl, setShowPlaybackControl] = useState(false);
  const wheelLockRef = useRef(false);
  const wheelUnlockTimerRef = useRef(null);
  const wheelAccumulatorRef = useRef(0);
  const wheelAccumulatorResetTimerRef = useRef(null);
  const playbackControlTimerRef = useRef(null);
  const touchStartYRef = useRef(null);
  const touchStartXRef = useRef(null);
  const ignoreNextTapRef = useRef(false);
  const videoRef = useRef(null);
  const activeReel = reels[activeReelIndex] || null;
  const reelVideoUrl = activeReel?.videoUrl || "";
  const reelCountText =
    reels.length > 0 ? `${activeReelIndex + 1} / ${reels.length}` : "";

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !item) return undefined;

    const contentId = getContentId(item);

    if (!contentId) {
      setReels([]);
      setActiveReelIndex(0);
      setIsLoadingReels(false);
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
      } catch (error) {
        setReels([]);
        setActiveReelIndex(0);
      } finally {
        setIsLoadingReels(false);
      }
    };

    loadReels();

    return () => controller.abort();
  }, [isOpen, item]);

  const startAutoplay = () => {
    const video = videoRef.current;
    if (!video) return;

    // Try autoplay with sound first; fall back to muted playback if blocked.
    video.muted = false;
    video.defaultMuted = false;
    video.volume = 1;

    video.play()
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
    if (!isOpen || !videoRef.current || !reelVideoUrl) return;
    videoRef.current.currentTime = 0;
    setIsVideoPlaying(true);
    setShowPlaybackControl(false);
    startAutoplay();
  }, [isOpen, activeReelIndex, reelVideoUrl]);

  useEffect(
    () => () => {
      if (wheelUnlockTimerRef.current) {
        clearTimeout(wheelUnlockTimerRef.current);
      }
      if (wheelAccumulatorResetTimerRef.current) {
        clearTimeout(wheelAccumulatorResetTimerRef.current);
      }
      if (playbackControlTimerRef.current) {
        clearTimeout(playbackControlTimerRef.current);
      }
    },
    [],
  );

  if (!isOpen || !item) return null;
  const poster = item.poster || item.image || "";
  const plot =
    item.plot ||
    item.overview ||
    item.description ||
    "Three friends who were inseparable in childhood decide to go on a road trip to rediscover themselves and repair old bonds before one of them gets married.";
  const genres = getGenres(item);
  const cast = getCast(item);
  const metaParts = getMetaParts(item, genres);

  const goToNextReel = () => {
    if (reels.length <= 1) return;
    setActiveReelIndex((prev) => (prev + 1) % reels.length);
  };

  const goToPrevReel = () => {
    if (reels.length <= 1) return;
    setActiveReelIndex((prev) => (prev - 1 + reels.length) % reels.length);
  };

  const stepReelFromDelta = (delta) => {
    if (reels.length <= 1) return;
    if (!delta) return;
    if (wheelLockRef.current) return;

    wheelLockRef.current = true;
    if (delta > 0) goToNextReel();
    else goToPrevReel();

    if (wheelUnlockTimerRef.current) {
      clearTimeout(wheelUnlockTimerRef.current);
    }
    wheelUnlockTimerRef.current = setTimeout(() => {
      wheelLockRef.current = false;
    }, 180);
  };

  const handleReelWheel = (event) => {
    if (reels.length <= 1) return;
    event.preventDefault();
    event.stopPropagation();

    const dominantDelta =
      Math.abs(event.deltaY) >= Math.abs(event.deltaX)
        ? event.deltaY
        : event.deltaX;

    if (!Number.isFinite(dominantDelta) || dominantDelta === 0) return;

    // Keep wheel navigation smooth on trackpads by accumulating tiny deltas.
    if (
      wheelAccumulatorRef.current !== 0 &&
      Math.sign(wheelAccumulatorRef.current) !== Math.sign(dominantDelta)
    ) {
      wheelAccumulatorRef.current = 0;
    }
    wheelAccumulatorRef.current += dominantDelta;

    if (wheelAccumulatorResetTimerRef.current) {
      clearTimeout(wheelAccumulatorResetTimerRef.current);
    }
    wheelAccumulatorResetTimerRef.current = setTimeout(() => {
      wheelAccumulatorRef.current = 0;
    }, 120);

    if (Math.abs(wheelAccumulatorRef.current) < 55) return;

    const reelStepDelta = wheelAccumulatorRef.current;
    wheelAccumulatorRef.current = 0;
    stepReelFromDelta(reelStepDelta);
  };

  const toggleVideoPlayback = () => {
    const video = videoRef.current;
    if (!video) return;

    // User interaction: enable audio for subsequent playback.
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
          onWheel={handleReelWheel}
          onTouchStart={(event) => {
            const touch = event.touches?.[0];
            if (!touch) return;
            touchStartYRef.current = touch.clientY;
            touchStartXRef.current = touch.clientX;
          }}
          onTouchEnd={(event) => {
            if (reels.length <= 1) return;
            const touch = event.changedTouches?.[0];
            const startY = touchStartYRef.current;
            const startX = touchStartXRef.current;

            touchStartYRef.current = null;
            touchStartXRef.current = null;
            if (!touch || startY === null || startX === null) return;

            const deltaY = startY - touch.clientY;
            const deltaX = startX - touch.clientX;

            // Treat as vertical swipe only when clearly dominant.
            if (
              Math.abs(deltaY) > Math.abs(deltaX) * 1.2 &&
              Math.abs(deltaY) > 28
            ) {
              ignoreNextTapRef.current = true;
              stepReelFromDelta(deltaY);
            }
          }}
          onClick={(event) => {
            if (!reelVideoUrl) return;
            if (event.target.closest("button, a")) return;
            if (ignoreNextTapRef.current) {
              ignoreNextTapRef.current = false;
              return;
            }
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
              <video
                ref={videoRef}
                key={reelVideoUrl}
                className="media-popup__reel-video"
                src={reelVideoUrl}
                autoPlay
                playsInline
                preload="metadata"
                onLoadedMetadata={startAutoplay}
                onEnded={goToNextReel}
                onPause={() => setIsVideoPlaying(false)}
                onPlay={() => setIsVideoPlaying(true)}
              />
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
                aria-label={isVideoPlaying ? "Pause reel video" : "Play reel video"}
              >
                {isVideoPlaying ? (
                  <span className="media-popup__pause-icon" aria-hidden="true" />
                ) : (
                  <span className="media-popup__play-icon" aria-hidden="true" />
                )}
              </button>
            </>
          ) : poster ? (
            <img
              className="media-popup__poster"
              src={poster}
              alt={item.title || "Selected title"}
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
            {item.title || "Untitled"}
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
                <span className="media-popup__genre-chip first-letter" key={genre}>
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
