import { useEffect } from 'react';
import './DownloadBannerPopup.css';

export default function DownloadBannerPopup({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="download-popup-overlay" onClick={onClose}>
      <div className="download-popup-content" onClick={(e) => e.stopPropagation()}>
        <button className="download-popup-close" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <img 
          src="/assets/posters/download_banner.avif" 
          alt="Download App" 
          className="download-popup-banner"
        />
      </div>
    </div>
  );
}
