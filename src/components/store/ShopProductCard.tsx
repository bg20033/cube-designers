import { Eye, Plus } from "lucide-react"
import { ResponsiveImage } from "@/components/ResponsiveImage"
import type { Product } from "@/data/products"
import { shopCategoryLabel } from "@/data/shop-navigation"

const currency = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 2, minimumFractionDigits: 0 })

export function ShopProductCard({ product, onQuickView, onAdd, slider = false }: {
  product: Product
  onQuickView: () => void
  onAdd: () => void
  slider?: boolean
}) {
  const href = product.id === "smart-film" ? "/shop/smart-glass" : `/shop/${product.id}`
  const Heading = slider ? "h3" : "h2"
  return (
    <article className="cube-product-card" data-category={product.category}>
      <div className="cube-card-image">
        <a href={href} aria-label={`Shiko ${product.name}`}>
          {product.image ? <ResponsiveImage
            image={product.image}
            alt={`Pamje ilustruese — ${product.name}`}
            sizes={slider ? "(max-width: 600px) 78vw, (max-width: 1000px) 40vw, 28vw" : "(max-width: 600px) 50vw, (max-width: 1000px) 33vw, 25vw"}
          /> : <span className="cube-product-placeholder">{product.name}<small>Print sipas idesë tënde</small></span>}
        </a>
        <div className="cube-card-tools">
          <button type="button" aria-label={`Shiko shpejt ${product.name}`} onClick={onQuickView}><Eye size={17} /></button>
        </div>
      </div>
      <div className="cube-card-info">
        <div><span>{shopCategoryLabel(product.category)}</span><Heading><a href={href}>{product.name}</a></Heading><small>{product.quantityLabel}</small><p>{currency.format(product.price)}</p></div>
        <button className="cube-card-add" type="button" aria-label={`Shto ${product.name} në shportë`} onClick={onAdd}><Plus size={19} /></button>
      </div>
    </article>
  )
}
