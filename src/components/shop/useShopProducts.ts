import { useEffect, useState } from "react"

import { products, type Product } from "@/data/products"
import { apiRequest } from "@/lib/api"

// Starts from the static catalog (what prerendering uses) and switches to the
// dashboard-managed catalog once the API returns products.
export function useShopProducts() {
  const [catalog, setCatalog] = useState<Product[]>(products)

  useEffect(() => {
    let active = true
    void apiRequest<{ products: Product[] }>("/api/products").then((result) => {
      if (active && result.ok && result.data.products.length) {
        setCatalog(result.data.products)
      }
    })
    return () => {
      active = false
    }
  }, [])

  return catalog
}
