import Header from './components/Header'
import Hero from './components/Hero'
import FilterPanel from './components/FilterPanel'
import PosterGrid from './components/PosterGrid'
import ContentCarousel from './components/ContentCarousel'
import BannerRow from './components/BannerRow'
import NetflixSpotlight from './components/NetflixSpotlight'
import Footer from './components/Footer'
import CallToAction from './components/CallToAction'
import { movieCategories } from './data/movies'

export default function App() {
  return (
    <>
      <Header />
      <Hero />

      <section id="popular-reels-section">
        <div style={{
          maxWidth: 'var(--container-max, 1400px)',
          margin: '0 auto',
          padding: '40px 30px 0',
        }}>
          <h2 style={{
            fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
            fontWeight: 700,
            background: 'linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0.6) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textAlign: 'center',
            marginBottom: '8px',
          }}>
            Popular OTT Platforms, Popular Movies
          </h2>
        </div>

        {movieCategories.slice(0, 2).map((cat) => (
          <ContentCarousel
            key={cat.title}
            title={cat.title}
            desc={cat.desc}
            movies={cat.movies}
          />
        ))}

        <BannerRow />

        <NetflixSpotlight />

        {movieCategories.slice(2).map((cat) => (
          <ContentCarousel
            key={cat.title}
            title={cat.title}
            desc={cat.desc}
            movies={cat.movies}
          />
        ))}
      </section>

      <FilterPanel />
      <PosterGrid />
      <CallToAction />
      <Footer />
    </>
  )
}

