import { ArrowLeft, ArrowRight, Check, PackageCheck, ShieldCheck } from "lucide-react"

import {
  getProductBySlug,
  type Product,
} from "@/components/ShopPage"
import NotFoundPage from "@/components/NotFoundPage"
import {
  SiteFooter,
  SiteHeader,
  SiteNoise,
} from "@/components/SiteChrome"

const currency = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

export function ProductDetail({ product }: { product: Product }) {
  const orderSubject = encodeURIComponent(`Porosi — ${product.name}`)
  const orderBody = encodeURIComponent(
    [
      `Produkti: ${product.name}`,
      `Sasia: ${product.quantityLabel}`,
      `Çmimi orientues: ${currency.format(product.price)}`,
      "",
      "Përshëndetje CUBE DESIGNERS, dua më shumë detaje për këtë produkt.",
    ].join("\n"),
  )

  return (
    <div className="agency-site shop-product-page">
      <SiteNoise />
      <SiteHeader />
      <main className="shop-product-main">
        <a className="shop-product-back" href="/shop">
          <ArrowLeft aria-hidden="true" />
          Kthehu te shop-i
        </a>

        <section className={`shop-product-hero is-${product.tone}`}>
          <div className="shop-product-visual" aria-hidden="true">
            <span>{product.number}</span>
            <strong>{product.category}</strong>
            <i />
          </div>
          <div className="shop-product-copy">
            <span>
              {product.category} / {product.production}
            </span>
            <h1>{product.name}</h1>
            <p>{product.description}</p>
            <div className="shop-product-price">
              <strong>{currency.format(product.price)}</strong>
              <span>{product.quantityLabel}</span>
            </div>
            <dl>
              <div>
                <dt>Materiali</dt>
                <dd>{product.material}</dd>
              </div>
              <div>
                <dt>Prodhimi</dt>
                <dd>{product.production}</dd>
              </div>
            </dl>
            <a
              className="shop-product-order"
              href={`mailto:hello@kube.studio?subject=${orderSubject}&body=${orderBody}`}
            >
              Kërko ofertë
              <ArrowRight aria-hidden="true" />
            </a>
          </div>
        </section>

        <section className="shop-product-assurance" aria-label="Siguria e porosisë">
          <article>
            <Check aria-hidden="true" />
            <strong>Kontroll para prodhimit</strong>
            <p>Artwork-u dhe specifikat aprovohen para se porosia të hyjë në shtyp.</p>
          </article>
          <article>
            <PackageCheck aria-hidden="true" />
            <strong>Prodhim i mbikëqyrur</strong>
            <p>E kontrollojmë materialin, ngjyrën dhe finish-in e produktit.</p>
          </article>
          <article>
            <ShieldCheck aria-hidden="true" />
            <strong>Çmim transparent</strong>
            <p>Oferta finale konfirmohet sipas sasisë dhe personalizimit.</p>
          </article>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

export default function ProductDetailPage({ slug }: { slug: string }) {
  const product = getProductBySlug(slug)

  if (!product) {
    return <NotFoundPage />
  }

  return <ProductDetail product={product} />
}
