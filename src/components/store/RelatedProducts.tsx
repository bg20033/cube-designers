import { ArrowUpRight } from "lucide-react"
import { ResponsiveImage } from "@/components/ResponsiveImage"
import type { Product } from "@/data/products"

export function RelatedProducts({ products }: { products: Product[] }) {
  if (!products.length) return null
  return (
    <section className="cube-related">
      <div className="cube-section-heading">
        <div>
          <span className="cube-eyebrow">NË TË NJËJTËN FRYMË</span>
          <h2>Mund të të pëlqejnë.</h2>
        </div>
        <a
          className="cube-text-link"
          href={`/shop?category=${products[0].category}`}
        >
          Shiko koleksionin <ArrowUpRight size={16} />
        </a>
      </div>
      <div className="cube-featured-grid">
        {products.map((product) => (
          <article className="cube-product-card" key={product.id}>
            <a className="cube-card-image" href={`/shop/${product.id}`}>
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
                <span>{product.category}</span>
                <h3>
                  <a href={`/shop/${product.id}`}>{product.name}</a>
                </h3>
                <p>Nga {product.price} €</p>
              </div>
              <a
                className="cube-card-add"
                href={`/shop/${product.id}`}
                aria-label={`Shiko ${product.name}`}
              >
                <ArrowUpRight size={16} />
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
