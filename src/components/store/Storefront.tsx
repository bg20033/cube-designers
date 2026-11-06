import { shopHref, studioHref } from "@/lib/site-links"
import { StoreFaq } from "./StoreFaq"
import { FilmWall } from "./FilmWall"
import { BundleShelf } from "./BundleShelf"
import type { ReactNode } from "react"
import { ArrowUpRight } from "lucide-react"
import { StoreFooter, StoreShell } from "./StoreChrome"
import { collectionProducts } from "@/data/products"

const bundles = collectionProducts.filter(
  (product) => product.category === "Paketa",
)
const tileImage = (id: string) =>
  collectionProducts.find((product) => product.id === id)?.image

// The storefront belongs exclusively to /shop. Studio pages retain their own layout.
export default function Storefront({
  children,
  onCart,
  count,
  overview = false,
}: {
  children: ReactNode
  onCart: () => void
  count: number
  overview?: boolean
}) {
  return (
    <StoreShell className="cube-shop" onCart={onCart} count={count}>
      <main id="main-content">
        {children}
        {!overview && <><section className="cube-explore" aria-label="Më shumë nga shopi">
          {[
            {
              href: shopHref("/shop/muri"),
              eyebrow: "Konfiguratori",
              title: "Provoji në mur",
              text: "Rregulloji posterat në murin tënd, në madhësi reale.",
              image: "/media/collections/bundles/set-hollywood-12-a3.webp",
            },
            {
              href: shopHref("/shop/foto"),
              eyebrow: "Foto jote",
              title: "Printo foton",
              text: "Nga telefoni në letër, pleksiglas, kanavacë ose kornizë.",
              image: "/media/collections/photo-print.svg",
            },
            {
              href: shopHref("/shop?category=Veshje#catalog"),
              eyebrow: "Me logon tënde",
              title: "Veshje",
              text: "Maica, polo, hoodie, jelekë dhe veshje pune.",
              image: tileImage("tshirts"),
            },
          ].map((card) => (
            <a key={card.href} className="cube-explore-card" href={card.href}>
              <img
                src={card.image}
                alt=""
                width="800"
                height="900"
                loading="lazy"
              />
              <span className="cube-eyebrow">{card.eyebrow}</span>
              <strong>
                {card.title} <ArrowUpRight size={16} />
              </strong>
              <small>{card.text}</small>
            </a>
          ))}
        </section>
        <FilmWall />
        <BundleShelf
          products={bundles
            .filter((bundle) => bundle.featured && bundle.includeVariants)
            .slice(0, 3)}
          eyebrow="SETE GALERIE · 10–12 POSTERA"
          title="Një mur i tërë. Një çmim."
          link={{
            href: shopHref("/shop?category=Paketa#catalog"),
            label: `Shiko ${bundles.length} paketat dhe setet`,
          }}
        />
        <section className="cube-custom-strip">
          <div>
            <span className="cube-eyebrow">TI E IMAGJINON. NE E SHTYPIM.</span>
            <h2>Diçka krejt e jotja?</h2>
            <p>
              Poster me idenë tënde, maica për ekipin ose një dhuratë. E bëjmë
              bashkë, nga dizajni deri te produkti.
            </p>
          </div>
          <a className="cube-button cube-button-dark" href={studioHref("/start-project")}>
            Personalizo me ne <ArrowUpRight size={16} />
          </a>
        </section>
        <StoreFaq /></>}
      </main>
      <StoreFooter />
    </StoreShell>
  )
}
