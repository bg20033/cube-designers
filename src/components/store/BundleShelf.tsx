import { shopHref } from "@/lib/site-links"
import { ArrowUpRight } from "lucide-react"
import { ResponsiveImage } from "@/components/ResponsiveImage"
import { posterSizes, type Product } from "@/data/products"

// Bundles on the shop home, or the posters inside a bundle on its own page.
export function BundleShelf({
  products,
  eyebrow,
  title,
  link,
}: {
  products: Product[]
  eyebrow: string
  title: string
  link?: { href: string; label: string }
}) {
  if (!products.length) return null
  return (
    <section className="cube-related cube-bundle-shelf" id="paketa">
      <div className="cube-section-heading">
        <div>
          <span className="cube-eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        {link && (
          <a className="cube-text-link" href={link.href}>
            {link.label} <ArrowUpRight size={16} />
          </a>
        )}
      </div>
      <div className="cube-featured-grid">
        {products.map((product) => {
          // What the posters cost one by one, in the bundle's sizes.
          const sizes =
            product.includeVariants ??
            product.includes?.map(() => product.defaultVariantId)
          const single = sizes?.every((size) =>
            posterSizes.some((entry) => entry.id === size),
          )
            ? sizes.reduce(
                (total, size) =>
                  total + posterSizes.find((entry) => entry.id === size)!.price,
                0,
              )
            : 0
          const saving = single ? single - product.price : 0
          return (
            <article className="cube-product-card" key={product.id}>
              <a className="cube-card-image" href={shopHref(`/shop/${product.id}`)}>
                {product.image && (
                  <ResponsiveImage
                    image={product.image}
                    alt={product.name}
                    sizes="(max-width:700px) 75vw, 30vw"
                  />
                )}
              </a>
              <div className="cube-card-info">
                <div>
                  <span>{product.series ?? product.category}</span>
                  <h3>
                    <a href={shopHref(`/shop/${product.id}`)}>{product.name}</a>
                  </h3>
                  <p>
                    Nga {product.price} €
                    {saving > 0 && <> · kursen {saving} €</>}
                  </p>
                </div>
                <a
                  className="cube-card-add"
                  href={shopHref(`/shop/${product.id}`)}
                  aria-label={`Shiko ${product.name}`}
                >
                  <ArrowUpRight size={16} />
                </a>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
