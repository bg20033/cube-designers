import type { Product } from "@/data/products"
import { getProductVariant } from "@/data/commerce"

export function ProductOptions({
  product,
  value,
  onChange,
}: {
  product: Product
  value?: string
  onChange: (id: string) => void
}) {
  if (!product.variants?.length) return null
  const selected = getProductVariant(product, value)
  return (
    <fieldset className="cube-product-options">
      <legend>
        {product.variantLabel ?? "Opsioni"}
        <span>{selected?.label}</span>
      </legend>
      <div>
        {product.variants.map((variant) => (
          <button
            key={variant.id}
            type="button"
            aria-label={`${product.variantLabel ?? "Opsioni"}: ${variant.label}`}
            aria-pressed={selected?.id === variant.id}
            onClick={() => onChange(variant.id)}
          >
            {variant.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
