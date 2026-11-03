import { useEffect, useState } from "react"

import { products, type Product } from "@/data/products"
import { apiRequest } from "@/lib/api"

// Starts from the static catalog (what prerendering uses) and switches to the
// dashboard-managed catalog once the API returns products.
export function useShopProducts() {
  const [catalog, setCatalog] = useState<Product[]>(products)

  useEffect(() => {
    let active = true
    void apiRequest<{
      products: (Product & { variantSet?: number })[]
      variantSets?: Product["variants"][]
      managed?: boolean
    }>("/api/products").then((result) => {
      if (
        active &&
        result.ok &&
        Array.isArray(result.data.products) &&
        (result.data.managed || result.data.products.length)
      ) {
        // Products point to a shared variant list (see api/products.ts).
        const sets = result.data.variantSets ?? []
        setCatalog(
          result.data.products.map(({ variantSet, ...product }) =>
            variantSet === undefined || !sets[variantSet]
              ? product
              : { ...product, variants: sets[variantSet] },
          ),
        )
      }
    })
    return () => {
      active = false
    }
  }, [])

  return catalog
}
