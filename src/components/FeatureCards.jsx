import { featureCards } from '../data/movies'
import './FeatureCards.css'

export default function FeatureCards() {
  return (
    <section className="features" id="features">
      <div className="features__grid">
        {featureCards.map((card) => (
          <div className="feature-card" key={card.tag}>
            <img
              className="feature-card__image"
              src={card.image}
              alt={card.tag}
              loading="lazy"
            />
            <span className="feature-card__tag">{card.tag}</span>
            <h3 className="feature-card__title">{card.title}</h3>
            <p className="feature-card__desc">{card.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
