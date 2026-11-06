import { shopHref, studioHref } from "@/lib/site-links"
import type { ReactNode } from "react"
import { ArrowUpRight, Play } from "lucide-react"
import InvitationCard from "@/components/invitations/InvitationCard"
import { createDemoWedding, designs } from "@/components/invitations/model"
import { businessCategories, matchesShopCategory } from "@/data/shop-navigation"
import type { Product } from "@/data/products"
import { ShopSlider } from "./ShopSlider"
import "./overview.css"

const sample = createDemoWedding()

function businessHighlights(products: Product[]) {
  const buckets = businessCategories.map((category) => products.filter((product) => product.category === category.value))
  return [0, 1].flatMap((index) => buckets.flatMap((bucket) => bucket[index] ?? []))
}

export function ShopOverview({ catalog, renderProduct }: { catalog: Product[]; renderProduct: (product: Product) => ReactNode }) {
  const posters = catalog.filter((product) => product.category === "Postera").sort((a, b) => Number(!!b.featured) - Number(!!a.featured)).slice(0, 12)
  const business = businessHighlights(catalog.filter((product) => matchesShopCategory(product, "Biznes")))

  return (
    <div className="shop-overview" id="catalog">
      <h1 className="sr-only">Shop</h1>
      {posters.length > 0 && <ShopSlider id="shop-posters" title="Postera" description="Art, kinema, muzikë dhe udhëtime për murin tënd." href={shopHref("/shop?category=Postera")} linkLabel="Shiko posterat" tools={<><a href={shopHref("/shop?category=Paketa")}>Paketa posterash</a><a href={shopHref("/shop/muri")}>Konfiguro murin</a><a href={shopHref("/shop/foto")}>Printo foton</a></>}>
        {posters.map(renderProduct)}
      </ShopSlider>}
      {business.length > 0 && <ShopSlider id="shop-business" title="Për biznese" description="Print, veshje dhe materiale me identitetin tënd." href={shopHref("/shop?category=Biznes")} linkLabel="Shiko printin për biznese" tools={<>{businessCategories.map((category) => <a key={category.value} href={shopHref(`/shop?category=${category.value}`)}>{category.label}</a>)}</>}>
        {business.map(renderProduct)}
      </ShopSlider>}
      <ShopSlider id="shop-smart-glass" title="Smart Glass" description="Një sistem. Dy gjendje. Privatësi me një klik." href={shopHref("/shop/smart-glass")} linkLabel="Zbulo Smart Glass" wide>
        {[
          { title: "Privatësi, kur të duhet", image: "smart-film-off.webp", text: "Xham i mjegullt për hapësirën tënde." },
          { title: "Një pamje e hapur", image: "smart-glass-clear.webp", text: "Kalo në transparencë me telekomandë." },
          { title: "Shiko si ndryshon", image: "smart-glass-clear.webp", text: "Provo dy gjendjet dhe shiko demonstrimin.", video: true },
        ].map((item) => <article className="overview-service-card" key={item.title}><a href={shopHref("/shop/smart-glass")}><div className="overview-service-art"><img src={`/media/collections/blanks/${item.image}`} alt={item.title} width="1280" height="720" loading="lazy" />{item.video && <span className="overview-play" aria-hidden="true"><Play size={24} /></span>}</div><h3>{item.title}<ArrowUpRight size={17} /></h3><p>{item.text}</p></a></article>)}
      </ShopSlider>
      <ShopSlider id="shop-invitations" title="Ftesa online" description="Katër dizajne. Emrat, mesazhi dhe dita juaj." href={studioHref("/ftesa")} linkLabel="Shiko çka përfshin">
        {designs.map((design) => <article className="overview-invitation-card" key={design.id}><a href={studioHref(`/ftesa?design=${design.id}`)} aria-label={`Shiko modelin ${design.name}`}><div className="overview-invitation-art" aria-hidden="true"><InvitationCard wedding={{ ...sample, design: design.id }} small /></div><h3>{design.name}<ArrowUpRight size={17} /></h3><p>{design.description}</p></a></article>)}
      </ShopSlider>
    </div>
  )
}
