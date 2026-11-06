// Compiled independently for the studio (Vite) and storefront (Astro).
export const IS_SHOP_APP = import.meta.env.VITE_APP_TARGET === "shop"
export const SHOP_ORIGIN = "https://shop.cube-designers.com"
export const STUDIO_ORIGIN = "https://www.cube-designers.com"

export function shopPath(path = "/shop") {
  return path.replace(/^\/shop(?=[/?#]|$)/, "").replace(/^([?#])/, "/$1") || "/"
}

export function shopHref(path = "/shop") {
  const local = shopPath(path)
  return IS_SHOP_APP ? local : `${SHOP_ORIGIN}${local}`
}

export function studioHref(path = "/") {
  return IS_SHOP_APP ? `${STUDIO_ORIGIN}${path}` : path
}
