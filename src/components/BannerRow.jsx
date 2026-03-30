import { bannerCards } from "../data/movies";
import "./BannerRow.css";

export default function BannerRow({ bannerCards: apiBannerCards }) {
  const cardsToRender =
    Array.isArray(apiBannerCards) && apiBannerCards.length > 0
      ? apiBannerCards
      : bannerCards;

  return (
    <section className="banner-section">
      <div className="banner-row">
        {cardsToRender.map((card) => (
          <div
            className="banner-card"
            key={card.title}
            style={{ backgroundImage: `url(${card.image})` }}
          >
            <div className="banner-card__overlay" />
            <div className="banner-card__title">{card.title}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
