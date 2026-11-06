import { shopHref } from "@/lib/site-links"
import { useEffect, useState } from "react"
import { addCartItem, getSelection, sanitizeCart } from "@/data/commerce"
import { readStoredJson, writeStoredJson } from "@/components/shop/persistence"
import { ProductOptions } from "@/components/store/ProductOptions"
import {
  PrintScene,
  SizeFinishPicker,
  isPrintProduct,
} from "@/components/store/SizeFinishPicker"
import { useArt } from "@/components/store/poster-art"
import { RelatedProducts } from "@/components/store/RelatedProducts"
import { BundleShelf } from "@/components/store/BundleShelf"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Frame,
  PackageCheck,
  Plus,
  ShieldCheck,
} from "lucide-react"
import type { Product } from "@/data/products"
import { shopCategoryLabel } from "@/data/shop-navigation"
import { useShopProducts } from "@/components/shop/useShopProducts"
import NotFoundPage from "@/components/NotFoundPage"
import SmartGlassPage from "@/components/shop/SmartGlassPage"
import { ResponsiveImage } from "@/components/ResponsiveImage"
import {
  StoreFooter,
  StoreShell,
} from "@/components/store/StoreChrome"

const CART_KEY = "cube-shop-cart-v1"

export function ProductDetail({
  product,
  related = [],
  included = [],
}: {
  product: Product
  related?: Product[]
  included?: Product[]
}) {
  const [variantId, setVariantId] = useState<string | undefined>(
    product.defaultVariantId,
  )
  const [view, setView] = useState<"poster" | "wall" | "video">(
    product.video ? "video" : "poster",
  )
  const [added, setAdded] = useState<string>()
  const [cartCount, setCartCount] = useState<number>()
  const selection = getSelection(product, variantId)
  const printable = isPrintProduct(product)
  // A bundle's image shows all its posters; on the wall it is not one print.
  const scene = printable && !product.includes
  const art = useArt(printable ? product.image : undefined)
  const orderSubject = encodeURIComponent(`Personalizim — ${product.name}`)
  const onWall = product.category === "Postera" || product.category === "Paketa"

  useEffect(() => {
    if (!added) return
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAdded(undefined)
    }
    window.addEventListener("keydown", close)
    return () => window.removeEventListener("keydown", close)
  }, [added])

  function choose(next: string) {
    setVariantId(next)
    // A new size or finish is easiest to judge on the wall.
    if (scene) setView("wall")
  }

  // Adds to the cart without leaving the page; the sheet offers the cart.
  function addToCart() {
    const cart = addCartItem(
      sanitizeCart(readStoredJson(CART_KEY, [])),
      product,
      selection.variantId,
    )
    writeStoredJson(CART_KEY, cart)
    setCartCount(cart.reduce((total, item) => total + item.quantity, 0))
    setAdded(selection.label)
  }

  return (
    <StoreShell count={cartCount}>
      <main className="cube-detail-main" id="main-content">
        <a
          className="cube-detail-back"
          href={shopHref(`/shop?category=${encodeURIComponent(product.category)}#catalog`)}
          aria-label={`Kthehu te koleksioni: ${shopCategoryLabel(product.category)}`}
        >
          <ArrowLeft size={16} aria-hidden="true" /> Koleksioni
        </a>
        <section className="cube-detail-hero">
          <div className="cube-detail-media">
            <div
              className={`cube-detail-image${product.video && view === "video" ? " is-video" : ""}`}
            >
              {product.video && view === "video" ? (
                <video
                  src={product.video.src}
                  poster={product.video.poster}
                  autoPlay
                  muted
                  loop
                  playsInline
                  aria-label={`Si funksionon — ${product.name}`}
                />
              ) : scene && view === "wall" && selection.variantId ? (
                <PrintScene
                  className="cube-detail-scene"
                  height={286}
                  variant={selection.variantId}
                  art={art}
                />
              ) : product.image ? (
                <ResponsiveImage
                  image={product.image}
                  alt={`Pamje ilustruese — ${product.name}`}
                  loading="eager"
                  fetchPriority="high"
                  sizes="(max-width: 700px) 100vw, 50vw"
                />
              ) : (
                <span className="cube-product-placeholder">{product.name}</span>
              )}
            </div>
            {product.video && (
              <div className="cube-media-tabs" role="group" aria-label="Pamja">
                {(
                  [
                    ["video", "Si funksionon"],
                    ["poster", "Produkti"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={view === id}
                    onClick={() => setView(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {scene && (
              <div className="cube-media-tabs" role="group" aria-label="Pamja">
                {(
                  [
                    ["poster", "Posteri"],
                    ["wall", "Në mur, madhësi reale"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={view === id}
                    onClick={() => setView(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="cube-detail-copy">
            <span className="cube-eyebrow">
              {(product.series ?? product.category).toUpperCase()}
            </span>
            <h1>{product.name}</h1>
            <p>{product.description}</p>
            {printable ? (
              <SizeFinishPicker
                product={product}
                value={variantId}
                onChange={choose}
              />
            ) : (
              <>
                <dl>
                  <div>
                    <dt>Materiali</dt>
                    <dd>{product.material}</dd>
                  </div>
                </dl>
                {(product.variants?.length ?? 0) > 1 && (
                  <ProductOptions
                    product={product}
                    value={variantId}
                    onChange={setVariantId}
                  />
                )}
              </>
            )}
            <div className="cube-buy">
              <div className="cube-buy-price">
                <strong className="cube-detail-price">
                  {selection.price * selection.minQuantity} €
                </strong>
                <small>
                  {selection.minQuantity > 1
                    ? `${selection.minQuantity} copë × ${selection.price} €`
                    : selection.label.replace(/^[^:]+: /, "")}
                </small>
              </div>
              <button
                className="cube-button cube-button-dark"
                type="button"
                onClick={addToCart}
              >
                Shto në shportë <Plus size={17} />
              </button>
            </div>
            <div className="cube-detail-links">
              {onWall && (
                <a href={shopHref(`/shop/muri?add=${product.id}`)}>
                  <Frame size={15} /> Provoje në murin tënd
                </a>
              )}
              <a
                href={`mailto:info@cube-designers.com?subject=${orderSubject}`}
              >
                Dua ta personalizoj <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </section>
        <section
          className="cube-detail-assurance"
          aria-label="Si funksionon porosia"
        >
          <article>
            <Check />
            <h2>E konfirmojmë bashkë.</h2>
            <p>
              Specifikat, sasia dhe personalizimi aprovohen me ty para
              prodhimit.
            </p>
          </article>
          <article>
            <PackageCheck />
            <h2>Detajet kanë rëndësi.</h2>
            <p>
              E kontrollojmë materialin, ngjyrën dhe përfundimin e çdo porosie.
            </p>
          </article>
          <article>
            <ShieldCheck />
            <h2>Pa surpriza në çmim.</h2>
            <p>Totali dhe dërgesa konfirmohen para se të kryesh pagesën.</p>
          </article>
        </section>
        <BundleShelf
          products={included}
          eyebrow="NË PAKETË"
          title="Çka merr."
        />
        <RelatedProducts products={related} />
      </main>
      {added && (
        <div
          className="cube-added"
          role="dialog"
          aria-label="U shtua në shportë"
        >
          {product.image && (
            <ResponsiveImage image={product.image} alt="" sizes="64px" />
          )}
          <div>
            <strong>
              <Check size={15} /> U shtua në shportë
            </strong>
            <span>
              {product.name} · {added.replace(/^[^:]+: /, "")}
            </span>
          </div>
          <div className="cube-added-actions">
            <button type="button" onClick={() => setAdded(undefined)}>
              Vazhdo blerjen
            </button>
            <a className="cube-button cube-button-dark" href={shopHref("/shop?cart=1")}>
              Shiko shportën <ArrowRight size={16} />
            </a>
          </div>
        </div>
      )}
      <StoreFooter />
    </StoreShell>
  )
}

export default function ProductDetailPage({ slug }: { slug: string }) {
  const catalog = useShopProducts()
  if (slug === "smart-film") return <SmartGlassPage />
  const product = catalog.find((candidate) => candidate.id === slug)
  const related = catalog
    .filter(
      (candidate) =>
        candidate.id !== slug && candidate.category === product?.category,
    )
    .slice(0, 3)
  const included =
    product?.includes?.flatMap(
      (id) => catalog.find((candidate) => candidate.id === id) ?? [],
    ) ?? []
  return product ? (
    <ProductDetail
      key={product.id}
      product={product}
      related={related}
      included={included}
    />
  ) : (
    <NotFoundPage />
  )
}
