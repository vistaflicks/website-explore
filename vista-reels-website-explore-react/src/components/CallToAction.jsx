import './CallToAction.css'

export default function CallToAction() {
  return (
    <section className="cta-section">
      <div className="cta-container">
        <div className="cta-logo">
          <img src="/assets/Group-4-1.svg" alt="Vista Reels" />
        </div>
        <h2 className="cta-heading">
          Discover Your Next Binge with a Reels<br />
          <span className="gradient-text">
            Download our app for the ultimate movie and show discovery experience on the go.
          </span>
        </h2>
        <div className="cta-stores">
          <a
            href="https://play.google.com/store/apps/details?id=com.vistareels.app"
            target="_blank"
            rel="noopener noreferrer"
            className="cta-store-btn"
          >
            <img src="/assets/Group-9076-2.svg" alt="Get it on Google Play" />
          </a>
          <a
            href="https://apps.apple.com/in/app/vista-reel/id6746562815"
            target="_blank"
            rel="noopener noreferrer"
            className="cta-store-btn"
          >
            <img src="/assets/Group-9577.svg" alt="Download on the App Store" />
          </a>
        </div>
      </div>
    </section>
  )
}
