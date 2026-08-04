import { useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  Eye,
  Heart,
  Minus,
  PackageCheck,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Truck,
  X,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { ResponsiveImage } from "@/components/ResponsiveImage"

import {
  SiteFooter,
  SiteHeader,
  SiteNoise,
} from "@/components/SiteChrome"
import {
  readStoredJson,
  writeStoredJson,
} from "@/components/shop/persistence"

export type ProductCategory =
  | "Print"
  | "Promo"
  | "Textile"
  | "Packaging"
  | "Signage"

export type ProductionSpeed = "Fast" | "Standard" | "Custom"

export type Product = {
  id: string
  number: string
  name: string
  category: ProductCategory
  price: number
  quantityLabel: string
  description: string
  tone: "orange" | "violet" | "acid" | "paper"
  production: ProductionSpeed
  material: string
  badge?: "Bestseller" | "New" | "Eco"
  featured?: boolean
  image?: string
}

export type CartItem = {
  productId: string
  quantity: number
}

export const products: Product[] = [
  {
    id: "business-cards",
    number: "01",
    name: "Business Cards",
    category: "Print",
    price: 35,
    quantityLabel: "100 copë",
    description: "Kartë 350gsm, print dy-anësh dhe finish mat.",
    tone: "paper",
    production: "Fast",
    material: "Premium paper",
    badge: "Bestseller",
    featured: true,
    image: "shop-business-cards",
  },
  {
    id: "rollup-banner",
    number: "02",
    name: "Roll-up Banner",
    category: "Print",
    price: 95,
    quantityLabel: "85 × 200 cm",
    description: "Konstruksion, print premium dhe çantë transporti.",
    tone: "violet",
    production: "Standard",
    material: "Blockout film",
    featured: true,
    image: "shop-rollup",
  },
  {
    id: "branded-pens",
    number: "03",
    name: "Branded Pens",
    category: "Promo",
    price: 65,
    quantityLabel: "50 copë",
    description: "Lapsa metalikë me print njëngjyrësh të logos.",
    tone: "acid",
    production: "Standard",
    material: "Aluminium",
    badge: "Bestseller",
    image: "shop-pens",
  },
  {
    id: "notebooks",
    number: "04",
    name: "Studio Notebooks",
    category: "Promo",
    price: 120,
    quantityLabel: "25 copë",
    description: "Fletore A5 me kopertinë të personalizuar dhe 80 faqe.",
    tone: "orange",
    production: "Standard",
    material: "Recycled paper",
    badge: "Eco",
    image: "shop-notebook",
  },
  {
    id: "tshirts",
    number: "05",
    name: "Team T-shirts",
    category: "Textile",
    price: 140,
    quantityLabel: "10 copë",
    description: "Pambuk premium me print para ose prapa.",
    tone: "paper",
    production: "Standard",
    material: "Heavy cotton",
    featured: true,
    image: "shop-tshirt",
  },
  {
    id: "stickers",
    number: "06",
    name: "Die-cut Stickers",
    category: "Print",
    price: 45,
    quantityLabel: "100 copë",
    description: "Vinyl rezistent, formë e personalizuar dhe laminim.",
    tone: "acid",
    production: "Fast",
    material: "Weatherproof vinyl",
    badge: "Bestseller",
    image: "shop-stickers",
  },
  {
    id: "flyers",
    number: "07",
    name: "Campaign Flyers",
    category: "Print",
    price: 55,
    quantityLabel: "250 copë",
    description: "A5, print full-color dy-anësh në letër 170gsm.",
    tone: "violet",
    production: "Fast",
    material: "Silk paper",
    image: "shop-flyer",
  },
  {
    id: "tote-bags",
    number: "08",
    name: "Tote Bags",
    category: "Textile",
    price: 160,
    quantityLabel: "20 copë",
    description: "Pambuk natyral me print të personalizuar.",
    tone: "orange",
    production: "Standard",
    material: "Natural cotton",
    badge: "Eco",
  },
  {
    id: "brochures",
    number: "09",
    name: "Company Brochures",
    category: "Print",
    price: 95,
    quantityLabel: "100 copë",
    description: "A4 palosur, 6 faqe, full-color dhe finish premium.",
    tone: "paper",
    production: "Standard",
    material: "Silk paper",
    image: "shop-brochure",
  },
  {
    id: "menus",
    number: "10",
    name: "Restaurant Menus",
    category: "Print",
    price: 110,
    quantityLabel: "25 copë",
    description: "Menu rezistente me laminim dhe format sipas brandit.",
    tone: "orange",
    production: "Standard",
    material: "Laminated card",
    badge: "New",
    image: "shop-menu",
  },
  {
    id: "posters",
    number: "11",
    name: "Campaign Posters",
    category: "Print",
    price: 70,
    quantityLabel: "50 copë",
    description: "A2 poster me ngjyra të forta dhe print high-resolution.",
    tone: "violet",
    production: "Fast",
    material: "Poster paper",
    image: "shop-flyer",
  },
  {
    id: "vinyl-banner",
    number: "12",
    name: "Outdoor Banner",
    category: "Signage",
    price: 85,
    quantityLabel: "200 × 100 cm",
    description: "Banner outdoor me vrima metalike dhe material rezistent.",
    tone: "acid",
    production: "Fast",
    material: "PVC vinyl",
    featured: true,
    image: "sermova-billboard",
  },
  {
    id: "window-graphics",
    number: "13",
    name: "Window Graphics",
    category: "Signage",
    price: 180,
    quantityLabel: "deri 3 m²",
    description: "Grafika për vitrina me material dhe prerje të personalizuar.",
    tone: "paper",
    production: "Custom",
    material: "Cut vinyl",
    badge: "New",
    image: "sermova-facade",
  },
  {
    id: "mugs",
    number: "14",
    name: "Branded Mugs",
    category: "Promo",
    price: 90,
    quantityLabel: "24 copë",
    description: "Filxhanë qeramike me print full-color rrethor.",
    tone: "violet",
    production: "Standard",
    material: "Ceramic",
  },
  {
    id: "lanyards",
    number: "15",
    name: "Event Lanyards",
    category: "Promo",
    price: 120,
    quantityLabel: "50 copë",
    description: "Lanyards të printuar me kapëse dhe badge holder.",
    tone: "orange",
    production: "Standard",
    material: "Polyester",
  },
  {
    id: "hoodies",
    number: "16",
    name: "Team Hoodies",
    category: "Textile",
    price: 240,
    quantityLabel: "10 copë",
    description: "Hoodie premium me screen print ose embroidery.",
    tone: "acid",
    production: "Custom",
    material: "Heavy cotton",
    badge: "New",
  },
  {
    id: "caps",
    number: "17",
    name: "Embroidered Caps",
    category: "Textile",
    price: 150,
    quantityLabel: "15 copë",
    description: "Kapela me embroidery të logos dhe ngjyrë të zgjedhur.",
    tone: "paper",
    production: "Custom",
    material: "Brushed cotton",
  },
  {
    id: "product-labels",
    number: "18",
    name: "Product Labels",
    category: "Packaging",
    price: 75,
    quantityLabel: "250 copë",
    description: "Etiketa në roll, formë dhe material sipas produktit.",
    tone: "orange",
    production: "Fast",
    material: "Paper / PP",
    badge: "Bestseller",
    image: "shop-stickers",
  },
  {
    id: "shipping-boxes",
    number: "19",
    name: "Shipping Boxes",
    category: "Packaging",
    price: 210,
    quantityLabel: "50 copë",
    description: "Kuti corrugated me print të brandit dhe madhësi custom.",
    tone: "violet",
    production: "Custom",
    material: "Corrugated board",
    badge: "Eco",
  },
  {
    id: "paper-bags",
    number: "20",
    name: "Retail Paper Bags",
    category: "Packaging",
    price: 190,
    quantityLabel: "100 copë",
    description: "Qese premium me dorezë dhe print sipas identitetit.",
    tone: "acid",
    production: "Custom",
    material: "Kraft paper",
    badge: "Eco",
  },
]

const categories: Array<"Krejt" | ProductCategory> = [
  "Krejt",
  "Print",
  "Promo",
  "Textile",
  "Packaging",
  "Signage",
]

const productionOptions: ProductionSpeed[] = ["Fast", "Standard", "Custom"]

const currency = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

export function getProductBySlug(slug: string) {
  return products.find((product) => product.id === slug)
}

export default function ShopPage() {
  const [filter, setFilter] = useState<(typeof categories)[number]>("Krejt")
  const [search, setSearch] = useState("")
  const [maxPrice, setMaxPrice] = useState(300)
  const [productionFilters, setProductionFilters] = useState<ProductionSpeed[]>(
    [],
  )
  const [sort, setSort] = useState("featured")
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [quickView, setQuickView] = useState<Product | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [queryHydrated, setQueryHydrated] = useState(false)
  const [orderRef] = useState(
    () => `CUBE-${Date.now().toString().slice(-6)}`,
  )
  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  })
  const [cart, setCart] = useState<CartItem[]>(() => {
    return readStoredJson<CartItem[]>("cube-shop-cart-v1", [])
  })
  const [favorites, setFavorites] = useState<string[]>(() => {
    return readStoredJson<string[]>("cube-shop-favorites-v1", [])
  })

  useEffect(() => {
    writeStoredJson("cube-shop-cart-v1", cart)
  }, [cart])

  useEffect(() => {
    writeStoredJson("cube-shop-favorites-v1", favorites)
  }, [favorites])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const nextCategory = params.get("category")
    const nextProduction = params
      .get("production")
      ?.split(",")
      .filter((value): value is ProductionSpeed =>
        productionOptions.includes(value as ProductionSpeed),
      )

    if (nextCategory && categories.includes(nextCategory as (typeof categories)[number])) {
      setFilter(nextCategory as (typeof categories)[number])
    }
    setSearch(params.get("q") ?? "")
    setSort(params.get("sort") ?? "featured")
    setFavoritesOnly(params.get("saved") === "1")
    setProductionFilters(nextProduction ?? [])

    const nextMaxPrice = Number(params.get("max"))
    if (Number.isFinite(nextMaxPrice) && nextMaxPrice >= 35 && nextMaxPrice <= 300) {
      setMaxPrice(nextMaxPrice)
    }

    setQueryHydrated(true)
  }, [])

  useEffect(() => {
    if (!queryHydrated) return

    const params = new URLSearchParams()
    if (filter !== "Krejt") params.set("category", filter)
    if (search.trim()) params.set("q", search.trim())
    if (sort !== "featured") params.set("sort", sort)
    if (maxPrice < 300) params.set("max", String(maxPrice))
    if (productionFilters.length) {
      params.set("production", productionFilters.join(","))
    }
    if (favoritesOnly) params.set("saved", "1")

    const query = params.toString()
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}`
    window.history.replaceState(null, "", nextUrl)
  }, [
    favoritesOnly,
    filter,
    maxPrice,
    productionFilters,
    queryHydrated,
    search,
    sort,
  ])

  useEffect(() => {
    if (!cartOpen && !quickView && !filtersOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [cartOpen, filtersOpen, quickView])

  const visibleProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const filtered = products.filter((product) => {
      const matchesCategory =
        filter === "Krejt" || product.category === filter
      const matchesSearch =
        !normalizedSearch ||
        `${product.name} ${product.category} ${product.description} ${product.material}`
          .toLowerCase()
          .includes(normalizedSearch)
      const matchesPrice = product.price <= maxPrice
      const matchesProduction =
        !productionFilters.length ||
        productionFilters.includes(product.production)
      const matchesFavorite =
        !favoritesOnly || favorites.includes(product.id)

      return (
        matchesCategory &&
        matchesSearch &&
        matchesPrice &&
        matchesProduction &&
        matchesFavorite
      )
    })

    return [...filtered].sort((a, b) => {
      if (sort === "price-low") return a.price - b.price
      if (sort === "price-high") return b.price - a.price
      if (sort === "name") return a.name.localeCompare(b.name)
      return Number(Boolean(b.featured)) - Number(Boolean(a.featured))
    })
  }, [
    favorites,
    favoritesOnly,
    filter,
    maxPrice,
    productionFilters,
    search,
    sort,
  ])

  const activeFilterCount =
    Number(filter !== "Krejt") +
    Number(Boolean(search)) +
    Number(maxPrice < 300) +
    productionFilters.length +
    Number(favoritesOnly)

  const cartDetails = cart.flatMap((item) => {
    const product = products.find((candidate) => candidate.id === item.productId)
    return product ? [{ ...item, product }] : []
  })

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = cartDetails.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  )

  const orderHref = useMemo(() => {
    const items = cartDetails
      .map(
        ({ product, quantity }) =>
          `- ${product.name} × ${quantity}: ${currency.format(
            product.price * quantity,
          )}`,
      )
      .join("\n")

    const body = [
      `Porosia: ${orderRef}`,
      "",
      items,
      "",
      `Totali orientues: ${currency.format(subtotal)}`,
      "",
      `Emri: ${customer.name}`,
      `Email: ${customer.email}`,
      `Telefoni: ${customer.phone}`,
      `Adresa: ${customer.address}`,
      `Shënime: ${customer.notes || "—"}`,
    ].join("\n")

    return `mailto:hello@kube.studio?subject=${encodeURIComponent(
      `Porosi e re ${orderRef}`,
    )}&body=${encodeURIComponent(body)}`
  }, [cartDetails, customer, orderRef, subtotal])

  function addToCart(productId: string) {
    setCart((current) => {
      const existing = current.find((item) => item.productId === productId)

      if (existing) {
        return current.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }

      return [...current, { productId, quantity: 1 }]
    })
    setCartOpen(true)
    setCheckoutOpen(false)
  }

  function toggleFavorite(productId: string) {
    setFavorites((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    )
  }

  function toggleProduction(speed: ProductionSpeed) {
    setProductionFilters((current) =>
      current.includes(speed)
        ? current.filter((item) => item !== speed)
        : [...current, speed],
    )
  }

  function clearFilters() {
    setFilter("Krejt")
    setSearch("")
    setMaxPrice(300)
    setProductionFilters([])
    setFavoritesOnly(false)
  }

  function changeQuantity(productId: string, change: number) {
    setCart((current) =>
      current.flatMap((item) => {
        if (item.productId !== productId) return [item]
        const quantity = item.quantity + change
        return quantity > 0 ? [{ ...item, quantity }] : []
      }),
    )
  }

  function removeFromCart(productId: string) {
    setCart((current) =>
      current.filter((item) => item.productId !== productId),
    )
  }

  function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    window.location.assign(orderHref)
  }

  return (
    <div className="agency-site shop-page">
      <SiteNoise />
      <SiteHeader />

      <main className="shop-main">
        <div className="shop-compact-head" id="top">
          <div>
            <span>K/06 · CUSTOM PRINT & MERCHANDISE</span>
            <h1>SHOP.</h1>
          </div>
          <p>Zgjidhe produktin, sasinë dhe dërgoje për konfirmim.</p>
          <button type="button" onClick={() => setCartOpen(true)}>
            <ShoppingBag />
            Cart
            <span>{String(itemCount).padStart(2, "0")}</span>
          </button>
        </div>

        <section className="shop-assurance" aria-label="Shop benefits">
          <article>
            <PackageCheck />
            <span>01</span>
            <strong>Artwork check</strong>
          </article>
          <article>
            <Truck />
            <span>02</span>
            <strong>Dërgesë Kosovë</strong>
          </article>
          <article>
            <ShieldCheck />
            <span>03</span>
            <strong>Para prodhimit</strong>
          </article>
        </section>

        <section className="shop-category-browser">
          <header>
            <span>Shfleto sipas kategorisë</span>
            <strong>20 produkte / 05 koleksione</strong>
          </header>
          <div>
            {categories.slice(1).map((category, index) => (
              <button
                className={filter === category ? "active" : ""}
                data-category={category.toLowerCase()}
                type="button"
                key={category}
                onClick={() => {
                  setFilter(category)
                  document
                    .querySelector(".shop-catalog")
                    ?.scrollIntoView({ behavior: "smooth" })
                }}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{category}</strong>
                <small>
                  {products.filter((product) => product.category === category).length}{" "}
                  products
                </small>
                <ArrowRight />
              </button>
            ))}
          </div>
        </section>

        <section className="shop-catalog">
          <header className="shop-catalog-heading">
            <div>
              <span>01 / Katalogu</span>
              <h2>ZGJIDH<br />FORMATIN.</h2>
            </div>
            <div>
              <p>
                Çmimet janë orientuese dhe bazohen në specifikat e listuara.
                Para prodhimit e konfirmojmë materialin, artwork-un dhe afatin.
              </p>
            </div>
          </header>

          <div className="shop-commerce-toolbar">
            <label className="shop-search">
              <Search />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Kërko produkte, material, kategori..."
                aria-label="Kërko produktet"
              />
              {search && (
                <button
                  type="button"
                  aria-label="Pastro kërkimin"
                  onClick={() => setSearch("")}
                >
                  <X />
                </button>
              )}
            </label>

            <button
              className="shop-mobile-filter"
              type="button"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal />
              Filtrat
              {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
            </button>

            <label className="shop-sort">
              <span>Sort</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="featured">Featured first</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="name">Name: A–Z</option>
              </select>
            </label>

            <button
              className={favoritesOnly ? "shop-saved active" : "shop-saved"}
              type="button"
              onClick={() => setFavoritesOnly((current) => !current)}
              aria-pressed={favoritesOnly}
            >
              <Heart />
              Saved
              <span>{favorites.length}</span>
            </button>
          </div>

          <div className="shop-results-bar">
            <p>
              <strong>{String(visibleProducts.length).padStart(2, "0")}</strong>
              rezultate
              {filter !== "Krejt" && <span>në {filter}</span>}
            </p>
            {activeFilterCount > 0 && (
              <button type="button" onClick={clearFilters}>
                <RotateCcw />
                Pastro {activeFilterCount} filtra
              </button>
            )}
          </div>

          <div className="shop-catalog-layout">
            <aside
              className={filtersOpen ? "shop-filters open" : "shop-filters"}
              aria-label="Filtrat e produkteve"
            >
              <header>
                <div>
                  <SlidersHorizontal />
                  <strong>FILTERS</strong>
                </div>
                <button
                  type="button"
                  aria-label="Mbylli filtrat"
                  onClick={() => setFiltersOpen(false)}
                >
                  <X />
                </button>
              </header>

              <fieldset>
                <legend>Category</legend>
                {categories.map((category) => (
                  <label key={category}>
                    <input
                      type="radio"
                      name="shop-category"
                      checked={filter === category}
                      onChange={() => setFilter(category)}
                    />
                    <span>{category}</span>
                    <small>
                      {category === "Krejt"
                        ? products.length
                        : products.filter(
                            (product) => product.category === category,
                          ).length}
                    </small>
                  </label>
                ))}
              </fieldset>

              <fieldset>
                <legend>Production time</legend>
                {productionOptions.map((speed) => (
                  <label key={speed}>
                    <input
                      type="checkbox"
                      checked={productionFilters.includes(speed)}
                      onChange={() => toggleProduction(speed)}
                    />
                    <span>{speed}</span>
                    <small>
                      {speed === "Fast"
                        ? "1–3 days"
                        : speed === "Standard"
                          ? "4–7 days"
                          : "8+ days"}
                    </small>
                  </label>
                ))}
              </fieldset>

              <fieldset className="shop-price-filter">
                <legend>Max price</legend>
                <div>
                  <span>€35</span>
                  <strong>{currency.format(maxPrice)}</strong>
                </div>
                <input
                  type="range"
                  min="35"
                  max="300"
                  step="5"
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(Number(event.target.value))}
                  aria-label="Çmimi maksimal"
                />
              </fieldset>

              <button
                className={favoritesOnly ? "shop-filter-saved active" : "shop-filter-saved"}
                type="button"
                onClick={() => setFavoritesOnly((current) => !current)}
              >
                <Heart />
                Vetëm të ruajturat
                <span>{favorites.length}</span>
              </button>

              <footer>
                <button type="button" onClick={clearFilters}>
                  Reset all
                </button>
                <button type="button" onClick={() => setFiltersOpen(false)}>
                  Shiko {visibleProducts.length} rezultate
                </button>
              </footer>
            </aside>

            <div className="shop-results">
              {!visibleProducts.length && (
                <div className="shop-no-results">
                  <Search />
                  <strong>S’gjetëm asnjë produkt.</strong>
                  <p>Provo një term tjetër ose pastro filtrat aktivë.</p>
                  <button type="button" onClick={clearFilters}>
                    Pastro filtrat
                  </button>
                </div>
              )}

              <div className="shop-product-grid">
                {visibleProducts.map((product) => {
                  const saved = favorites.includes(product.id)
                  const cartQuantity =
                    cart.find((item) => item.productId === product.id)?.quantity ??
                    0

                  return (
                      <article
                        className="shop-product"
                        data-tone={product.tone}
                        key={product.id}
                      >
                        <div className="shop-product-visual">
                          {product.image && (
                            <ResponsiveImage
                              image={product.image}
                              sizes="(max-width: 760px) 50vw, (max-width: 1100px) 50vw, 33vw"
                            />
                          )}
                          <div className="shop-product-topline">
                            <span>{product.number}</span>
                            <div>
                              <button
                                className={saved ? "active" : ""}
                                type="button"
                                aria-label={
                                  saved
                                    ? `Largo ${product.name} nga saved`
                                    : `Ruaje ${product.name}`
                                }
                                onClick={() => toggleFavorite(product.id)}
                              >
                                <Heart />
                              </button>
                              <button
                                type="button"
                                aria-label={`Quick view ${product.name}`}
                                onClick={() => setQuickView(product)}
                              >
                                <Eye />
                              </button>
                            </div>
                          </div>
                          {product.badge && (
                            <span className="shop-product-badge">{product.badge}</span>
                          )}
                          <strong aria-hidden="true">{product.name}</strong>
                          <i>{product.category}</i>
                        </div>
                        <div className="shop-product-info">
                          <div>
                            <span>
                              {product.category} / {product.quantityLabel}
                            </span>
                            <strong>
                              <a href={`/shop/${product.id}`}>{product.name}</a>
                            </strong>
                          </div>
                          <p>{product.description}</p>
                          <div className="shop-product-meta">
                            <span>{product.production}</span>
                            <span>{product.material}</span>
                            <span>Logo-ready</span>
                          </div>
                          <footer>
                            <div>
                              <span>Nga</span>
                              <strong>{currency.format(product.price)}</strong>
                            </div>
                            <button
                              type="button"
                              aria-label={`${
                                cartQuantity > 0
                                  ? `${cartQuantity} në cart — shto edhe një`
                                  : "Shto"
                              } ${product.name}`}
                              onClick={() => addToCart(product.id)}
                            >
                              <span>{cartQuantity > 0 ? cartQuantity : "Shto"}</span>
                              <Plus />
                            </button>
                          </footer>
                        </div>
                      </article>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />

      <AnimatePresence>
        {quickView && (
          <>
            <motion.button
              className="shop-quick-backdrop"
              type="button"
              aria-label="Mbylle quick view"
              onClick={() => setQuickView(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.section
              className="shop-quick-view"
              role="dialog"
              aria-modal="true"
              aria-labelledby="shop-quick-title"
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                className="shop-quick-close"
                type="button"
                aria-label="Mbylle"
                onClick={() => setQuickView(null)}
              >
                <X />
              </button>
              <div className="shop-quick-visual" data-tone={quickView.tone}>
                {quickView.image && (
                  <ResponsiveImage
                    image={quickView.image}
                    sizes="(max-width: 760px) 100vw, 50vw"
                  />
                )}
                <span>{quickView.number}</span>
                <strong aria-hidden="true">{quickView.name}</strong>
                <i>{quickView.category}</i>
              </div>
              <div className="shop-quick-copy">
                <div className="shop-quick-kicker">
                  <span>{quickView.category}</span>
                  {quickView.badge && <strong>{quickView.badge}</strong>}
                </div>
                <h2 id="shop-quick-title">{quickView.name}</h2>
                <p>{quickView.description}</p>
                <dl>
                  <div>
                    <dt>Package</dt>
                    <dd>{quickView.quantityLabel}</dd>
                  </div>
                  <div>
                    <dt>Material</dt>
                    <dd>{quickView.material}</dd>
                  </div>
                  <div>
                    <dt>Production</dt>
                    <dd>{quickView.production}</dd>
                  </div>
                  <div>
                    <dt>Personalization</dt>
                    <dd>Logo-ready</dd>
                  </div>
                </dl>
                <div className="shop-quick-price">
                  <div>
                    <span>Starting at</span>
                    <strong>{currency.format(quickView.price)}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      addToCart(quickView.id)
                      setQuickView(null)
                    }}
                  >
                    Add to cart
                    <Plus />
                  </button>
                </div>
                <small>
                  <Sparkles />
                  Artwork check dhe konfirmimi i materialit përfshihen.
                </small>
              </div>
            </motion.section>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.button
              className="shop-cart-backdrop"
              type="button"
              aria-label="Mbylle cart-in"
              onClick={() => setCartOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              className="shop-cart"
              role="dialog"
              aria-modal="true"
              aria-labelledby="shop-cart-title"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            >
              <header>
                <div>
                  <span>{checkoutOpen ? "Checkout" : "Your selection"}</span>
                  <h2 id="shop-cart-title">
                    {checkoutOpen ? "POROSIA." : "CART."}
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label="Mbylle"
                  onClick={() => setCartOpen(false)}
                >
                  <X />
                </button>
              </header>

              {!checkoutOpen ? (
                <>
                  <div className="shop-cart-items">
                    {!cartDetails.length && (
                      <div className="shop-cart-empty">
                        <ShoppingBag />
                        <strong>Cart-i është bosh.</strong>
                        <p>Zgjidhe një produkt për me fillu porosinë.</p>
                        <button type="button" onClick={() => setCartOpen(false)}>
                          Shiko produktet
                          <ArrowRight />
                        </button>
                      </div>
                    )}

                    {cartDetails.map(({ product, quantity }) => (
                      <article key={product.id}>
                        <div
                          className="shop-cart-thumb"
                          data-tone={product.tone}
                          aria-hidden="true"
                        >
                          {product.number}
                        </div>
                        <div>
                          <span>{product.quantityLabel}</span>
                          <strong>{product.name}</strong>
                          <small>{currency.format(product.price)} / paketë</small>
                        </div>
                        <div className="shop-cart-quantity">
                          <button
                            type="button"
                            aria-label={`Zvogëlo ${product.name}`}
                            onClick={() => changeQuantity(product.id, -1)}
                          >
                            <Minus />
                          </button>
                          <span>{quantity}</span>
                          <button
                            type="button"
                            aria-label={`Rrite ${product.name}`}
                            onClick={() => changeQuantity(product.id, 1)}
                          >
                            <Plus />
                          </button>
                        </div>
                        <strong className="shop-cart-line-price">
                          {currency.format(product.price * quantity)}
                        </strong>
                        <button
                          className="shop-cart-remove"
                          type="button"
                          aria-label={`Largo ${product.name}`}
                          onClick={() => removeFromCart(product.id)}
                        >
                          <Trash2 />
                        </button>
                      </article>
                    ))}
                  </div>

                  {!!cartDetails.length && (
                    <footer className="shop-cart-total">
                      <div>
                        <span>Totali orientues</span>
                        <strong>{currency.format(subtotal)}</strong>
                      </div>
                      <button type="button" onClick={() => setCheckoutOpen(true)}>
                        Vazhdo në checkout
                        <ArrowRight />
                      </button>
                    </footer>
                  )}
                </>
              ) : (
                <form className="shop-checkout" onSubmit={submitOrder}>
                  <button
                    className="shop-checkout-back"
                    type="button"
                    onClick={() => setCheckoutOpen(false)}
                  >
                    ← Kthehu te cart-i
                  </button>

                  <div className="shop-checkout-fields">
                    <label>
                      <span>Emri dhe mbiemri *</span>
                      <input
                        required
                        value={customer.name}
                        onChange={(event) =>
                          setCustomer((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      <span>Email *</span>
                      <input
                        required
                        type="email"
                        value={customer.email}
                        onChange={(event) =>
                          setCustomer((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      <span>Telefoni *</span>
                      <input
                        required
                        type="tel"
                        value={customer.phone}
                        onChange={(event) =>
                          setCustomer((current) => ({
                            ...current,
                            phone: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      <span>Adresa e dërgesës *</span>
                      <input
                        required
                        value={customer.address}
                        onChange={(event) =>
                          setCustomer((current) => ({
                            ...current,
                            address: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      <span>Shënime</span>
                      <textarea
                        rows={4}
                        value={customer.notes}
                        onChange={(event) =>
                          setCustomer((current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                        placeholder="Afati, ngjyrat ose informata tjera..."
                      />
                    </label>
                  </div>

                  <div className="shop-checkout-summary">
                    <span>{orderRef}</span>
                    <strong>{itemCount} produkte</strong>
                    <strong>{currency.format(subtotal)}</strong>
                  </div>

                  <button className="shop-order-submit" type="submit">
                    Dërgo porosinë me email
                    <ArrowRight />
                  </button>
                  <p>
                    Pagesa nuk merret online ende. Pas email-it e konfirmojmë
                    artwork-un, afatin dhe totalin final.
                  </p>
                </form>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
