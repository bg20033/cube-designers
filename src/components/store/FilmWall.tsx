import { shopHref } from "@/lib/site-links"
import { useState } from "react"
import { ArrowRight } from "lucide-react"
import { archiveSpotlight, collectionProducts } from "@/data/products"

const filmPosters = archiveSpotlight
  .slice(0, 6)
  .flatMap((slug) => collectionProducts.find((p) => p.id === slug) ?? [])
const kinemaCount = collectionProducts.filter(
  (product) => product.series === "Kinema",
).length

// String lights hang in three swags across the wall. The SVG keeps a fixed
// 70px height, so bulb `top` values are in the same units as the path.
const swag = (x: number) => 10 + 40 * Math.sin(Math.PI * ((x * 3) % 1))
const wire = Array.from({ length: 121 }, (_, index) => {
  const x = index / 120
  return `${index ? "L" : "M"}${(x * 1200).toFixed(1)} ${swag(x).toFixed(1)}`
}).join(" ")
const bulbs = Array.from({ length: 18 }, (_, index) => (index + 0.5) / 18)

export function FilmWall() {
  const [lightOn, setLightOn] = useState(true)
  return (
    <section
      className={`cube-film-wall ${lightOn ? "is-on" : "is-off"}`}
      id="film-wall"
      aria-labelledby="film-wall-title"
    >
      <div className="cube-film-copy">
        <span className="cube-eyebrow">
          <span /> CUBE FILM CLUB
        </span>
        <h2 id="film-wall-title">Kinema në mur.</h2>
        <p>
          {kinemaCount} postera origjinalë filmash, të gjithë para vitit 1956:
          Dracula, King Kong, Gilda e shumë të tjerë. Ndize dritën e perëndimit
          dhe shiko si ndryshon këndi.
        </p>
        <div className="cube-film-actions">
          <a
            className="cube-button"
            href={shopHref("/shop?category=Postera&seria=Kinema#catalog")}
          >
            Shiko {kinemaCount} posterat <ArrowRight size={16} />
          </a>
          {/* Llampat janë të fshehura për momentin. */}
        </div>
        <button
          className="cube-light-switch"
          type="button"
          aria-pressed={lightOn}
          onClick={() => setLightOn(!lightOn)}
        >
          <span className="cube-switch-track">
            <span />
          </span>
          {lightOn ? "Drita e perëndimit ndezur" : "Drita e perëndimit fikur"}
        </button>
      </div>
      <div className="cube-film-board">
        <div className="cube-string-lights" aria-hidden="true">
          <svg viewBox="0 0 1200 70" preserveAspectRatio="none">
            <path d={wire} />
          </svg>
          {bulbs.map((x, index) => (
            <span
              key={x}
              style={{
                left: `${x * 100}%`,
                top: `${swag(x)}px`,
                animationDelay: `${(index % 5) * 0.6}s`,
              }}
            />
          ))}
        </div>
        <ul className="cube-film-posters">
          {filmPosters.map((poster) => (
            <li key={poster.id}>
              <a href={shopHref(`/shop/${poster.id}`)}>
                <img
                  src={`/media/collections/film-wall/${poster.id}.webp`}
                  alt={`Poster i filmit ${poster.name}`}
                  width="400"
                  height="586"
                  loading="lazy"
                />
                <span>{poster.name}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
