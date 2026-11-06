import { IS_SHOP_APP, shopHref } from "@/lib/site-links"
import { useEffect, useState } from "react"
import { ShoppingBag } from "lucide-react"
import { readStoredJson } from "@/components/shop/persistence"
import { sanitizeCart } from "@/data/commerce"

export function HeaderCart({ count, onCart }: { count?: number; onCart?: () => void }) {
  const [storedCount, setStoredCount] = useState(0)
  useEffect(() => {
    if (!IS_SHOP_APP) return
    const update = () => setStoredCount(
      sanitizeCart(readStoredJson("cube-shop-cart-v1", [])).reduce(
        (total, item) => total + item.quantity, 0,
      ),
    )
    update()
    window.addEventListener("storage", update)
    return () => window.removeEventListener("storage", update)
  }, [])
  const itemCount = count ?? storedCount
  const content = (
    <>
      <ShoppingBag size={19} aria-hidden="true" />
      <span>{itemCount}</span>
    </>
  )
  const label = `Hap shportën, ${itemCount} produkte`
  return onCart ? (
    <button className="header-cart" type="button" onClick={onCart} aria-label={label}>{content}</button>
  ) : (
    <a className="header-cart" href={shopHref("/shop?cart=1")} aria-label={label}>{content}</a>
  )
}
