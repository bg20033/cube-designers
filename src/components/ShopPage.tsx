import {
  addCartItem,
  cartLineKey,
  getSelection,
  getProductVariant,
  resolveCart,
  sanitizeCart,
} from "@/data/commerce"
import { ProductOptions } from "@/components/store/ProductOptions"
import { SizeFinishPicker, isPrintProduct } from "@/components/store/SizeFinishPicker"
import { OrderEmail } from "@/components/store/OrderEmail"
import { useOrderAvailability } from "@/components/shop/useOrderAvailability"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react"
import {
  ArrowRight,
  Check,
  Frame,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react"
import { ResponsiveImage } from "@/components/ResponsiveImage"
import Storefront from "@/components/store/Storefront"
import { ShopOverview } from "@/components/store/ShopOverview"
import { ShopProductCard } from "@/components/store/ShopProductCard"
import { StoreDialog } from "@/components/store/StoreDialog"
import { readStoredJson, writeStoredJson } from "@/components/shop/persistence"
import { cropStyle } from "@/components/store/PrintSurface"
import { FilterMenu } from "@/components/store/FilterMenu"
import { MAX_ITEMS } from "@/components/shop/wall-layout"
import {
  facetGroups,
  matchesFilters,
  readFilters,
  writeFilters,
  type FilterValue,
} from "@/components/store/poster-filters"
import {
  products,
  productCategories,
  getProductBySlug,
  getPosterSize,
  parseVariantId,
  type Product,
  type CartItem,
  type ProductCategory,
} from "@/data/products"
import { useShopProducts } from "@/components/shop/useShopProducts"
import { apiRequest } from "@/lib/api"
import { businessCategories, getShopCategoryOptions, matchesShopCategory, shopCategoryLabel, parentShopCategory } from "@/data/shop-navigation"

export {
  products,
  getProductBySlug,
  type Product,
  type CartItem,
  type ProductCategory,
}
export type { ProductionSpeed } from "@/data/products"
const currency = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
})
const BUSINESS = "Biznes"
const PAGE_SIZE = 24
const matchesCategory = matchesShopCategory
const categories = ["Krejt", "Biznes", "Postera", "Paketa", ...businessCategories.map((item) => item.value)]

export default function ShopPage() {
  const catalog = useShopProducts()
  const availability = useOrderAvailability()
  const [variantId, setVariantId] = useState<string | undefined>()
  const [emailReady, setEmailReady] = useState(false)
  const [category, setCategory] = useState<string>("Krejt")
  const [filters, setFilters] = useState<FilterValue>({})
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("featured")
  const [maxPrice, setMaxPrice] = useState<number | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const posterCategory = parentShopCategory(category) === "Postera"
  const [quickView, setQuickView] = useState<Product | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [checkout, setCheckout] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [placedOrder, setPlacedOrder] = useState("")
  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  })
  const [cart, setCart] = useState<CartItem[]>(() =>
    sanitizeCart(readStoredJson("cube-shop-cart-v1", [])),
  )
  const initialQueryRead = useRef(false)
  const pendingAdd = useRef<{ id: string; variant?: string } | null>(null)
  const orderReference = useRef("")
  const requestAttempt = useRef<{ payload: string; id: string } | null>(null)

  const addToCart = useCallback(
    (id: string, option?: string) => {
      const product = catalog.find((candidate) => candidate.id === id)
      if (!product) return
      setCart((current) => addCartItem(current, product, option))
      setEmailReady(false)
      setPlacedOrder("")
      setError("")
      setCheckout(false)
      setCartOpen(true)
      setQuickView(null)
    },
    [catalog],
  )
  const categoryNavRef = useRef<HTMLElement>(null)
  useEffect(() => {
    function readLocation(initial = false) {
      const params = new URLSearchParams(window.location.search)
      const requested = params.get("category") === "Maica" ? "Veshje" : params.get("category")
      if (requested?.toLowerCase() === "smart glass") {
        window.location.replace("/shop/smart-glass")
        return
      }
      const nextCategory = categories.includes(requested as (typeof categories)[number])
        ? requested! : productCategories.includes(requested as ProductCategory) ? BUSINESS : "Krejt"
      setCategory(nextCategory)
      setFilters(parentShopCategory(nextCategory) === "Postera" ? readFilters(params) : {})
      setSearch(params.get("q") ?? "")
      setSort(params.get("sort") ?? "featured")
      const max = Number(params.get("max"))
      setMaxPrice(params.has("max") && Number.isFinite(max) && max >= 0 ? max : null)
      setFiltersOpen(false)
      if (params.get("cart") === "1") setCartOpen(true)
      if (initial) {
        const id = params.get("add")
        pendingAdd.current = id ? { id, variant: params.get("variant") ?? undefined } : null
      }
      setHydrated(true)
    }
    if (!initialQueryRead.current) {
      initialQueryRead.current = true
      readLocation(true)
    }
    function navigate(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = (event.target as Element).closest<HTMLAnchorElement>("a[href]")
      if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return
      const url = new URL(link.href, window.location.href)
      if (url.origin !== window.location.origin || url.pathname !== "/shop" || url.searchParams.has("add") || url.searchParams.has("cart")) return
      event.preventDefault()
      window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`)
      link.closest("details")?.removeAttribute("open")
      readLocation()
      window.requestAnimationFrame(() => document.getElementById("catalog")?.scrollIntoView({ behavior: "instant", block: "start" }))
    }
    const onPopState = () => readLocation()
    document.addEventListener("click", navigate)
    window.addEventListener("popstate", onPopState)
    return () => {
      document.removeEventListener("click", navigate)
      window.removeEventListener("popstate", onPopState)
    }
  }, [])
  useEffect(() => {
    if (hydrated) document.documentElement.removeAttribute("data-shop-pending")
  }, [hydrated])
  useEffect(() => {
    const nav = categoryNavRef.current
    const selected = nav?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!nav || !selected || !window.matchMedia("(max-width: 600px)").matches) return
    const bounds = nav.getBoundingClientRect()
    const item = selected.getBoundingClientRect()
    nav.scrollLeft += Math.max(0, item.right - bounds.right + 20) + Math.min(0, item.left - bounds.left - 20)
  }, [category])

  useEffect(() => {
    const pending = pendingAdd.current
    const product = catalog.find((candidate) => candidate.id === pending?.id)
    if (pending && product) {
      pendingAdd.current = null
      if (pending.variant && !getProductVariant(product, pending.variant))
        return
      addToCart(pending.id, pending.variant)
    }
  }, [catalog, addToCart])
  useEffect(() => {
    writeStoredJson("cube-shop-cart-v1", cart)
  }, [cart])
  useEffect(() => {
    if (!hydrated) return
    const params = new URLSearchParams()
    if (category !== "Krejt") params.set("category", category)
    if (parentShopCategory(category) === "Postera") writeFilters(params, filters)
    if (search) params.set("q", search)
    if (sort !== "featured") params.set("sort", sort)
    if (maxPrice !== null) params.set("max", String(maxPrice))
    window.history.replaceState(
      null,
      "",
      `/shop${params.size ? `?${params}` : ""}${window.location.hash}`,
    )
  }, [category, filters, search, sort, maxPrice, hydrated])

  const categoryProducts = useMemo(
    () => catalog.filter((product) => matchesCategory(product, category)),
    [catalog, category],
  )
  const priceCeiling = Math.max(5, Math.ceil(
    categoryProducts.reduce((highest, product) => Math.max(highest, product.price), 0) / 5,
  ) * 5)
  const priceLimit = Math.min(maxPrice ?? priceCeiling, priceCeiling)
  const searchPlaceholder = {
    Postera: "Kërko postera…",
    Paketa: "Kërko paketa…",
    Veshje: "Kërko veshje…",
    Print: "Kërko printime…",
    Textile: "Kërko çanta e tekstil…",
    Promo: "Kërko produkte promocionale…",
    Packaging: "Kërko ambalazh e paketim…",
    Signage: "Kërko reklama e sinjalistikë…",
    Biznes: "Kërko produkte për biznese…",
  }[category] ?? `Kërko në ${category === "Krejt" ? "koleksion" : shopCategoryLabel(category)}…`

  const visibleProducts = useMemo(
    () =>
      categoryProducts
        .filter(
          (product) =>
            (parentShopCategory(category) !== "Postera" || matchesFilters(product, filters)) &&
            product.price <= priceLimit &&
            `${product.name} ${product.category} ${shopCategoryLabel(product.category)} ${product.description} ${product.material}`
              .toLowerCase()
              .includes(search.trim().toLowerCase()),
        )
        .sort((a, b) =>
          sort === "price-low"
            ? a.price - b.price
            : sort === "price-high"
              ? b.price - a.price
              : sort === "name"
                ? a.name.localeCompare(b.name)
                : Number(!!b.featured) - Number(!!a.featured),
        ),
    [categoryProducts, category, filters, priceLimit, search, sort],
  )
  // Any filter change starts again from the first page.
  const filterKey = [
    category,
    JSON.stringify(filters),
    search,
    sort,
    maxPrice,
  ].join("|")
  const [paging, setPaging] = useState({ key: filterKey, shown: PAGE_SIZE })
  const shown = paging.key === filterKey ? paging.shown : PAGE_SIZE
  const filterGroups = useMemo(
    () =>
      parentShopCategory(category) === "Postera" ? facetGroups(categoryProducts) : [],
    [categoryProducts, category],
  )
  const { lines: cartDetails, unavailable } = resolveCart(cart, catalog)
  // Prints that can be previewed on the wall planner (A6 cards cannot).
  const wallCount = cartDetails.reduce((count, line) => {
    const size = line.product.includeVariants
      ? "set"
      : parseVariantId(line.selection.variantId)?.size
    const prints =
      line.product.includes?.length ??
      (line.product.category === "Postera" || line.product.customImage ? 1 : 0)
    return size && size !== "a6" ? count + prints * line.quantity : count
  }, 0)
  const itemCount = cartDetails.reduce(
    (total, item) => total + item.quantity,
    0,
  )
  const subtotal = cartDetails.reduce(
    (total, item) => total + item.quantity * item.selection.price,
    0,
  )
  const orderText = [
    "KËRKESË PËR POROSI — CUBE",
    "",
    `Emri: ${customer.name}`,
    `Telefoni: ${customer.phone}`,
    `Email: ${customer.email || "—"}`,
    `Adresa: ${customer.address}`,
    `Personalizimi: ${customer.notes || "—"}`,
    "",
    ...cartDetails.map(
      (item) =>
        `${item.quantity} × ${item.product.name} (${item.selection.label}) — ${currency.format(item.quantity * item.selection.price)}${item.photo ? ` · foto: ${item.photo.image}` : ""}`,
    ),
    "",
    `Totali i produkteve: ${currency.format(subtotal)}`,
    "Dërgesa, afati dhe çmimi final konfirmohen nga studioja.",
  ].join("\n")
  const orderHref = `mailto:info@cube-designers.com?subject=${encodeURIComponent("Porosi CUBE")}&body=${encodeURIComponent(orderText)}`
  function resetFilters() {
    setFilters({})
    setSearch("")
    setSort("featured")
    setMaxPrice(null)
  }
  function selectCategory(nextCategory: string) {
    const params = new URLSearchParams()
    if (nextCategory !== "Krejt") params.set("category", nextCategory)
    window.history.pushState(null, "", `/shop${params.size ? `?${params}` : ""}${window.location.hash}`)
    setCategory(nextCategory)
    resetFilters()
    setFiltersOpen(false)
  }
  function renderSortControl(showLabel = false) {
    return <label className="cube-sort">
      <span className={showLabel ? undefined : "sr-only"}>Rendit produktet: {shopCategoryLabel(category)}</span>
      <select value={sort} onChange={(event) => setSort(event.target.value)}>
        <option value="featured">Të zgjedhurat</option>
        <option value="price-low">Çmimi: i ulët → i lartë</option>
        <option value="price-high">Çmimi: i lartë → i ulët</option>
        <option value="name">Emri A–Z</option>
      </select>
    </label>
  }
  function renderPriceControls() {
    return <>
      <label><span>Çmimi maksimal <strong>{currency.format(priceLimit)}</strong></span>
        <input type="range" aria-label="Çmimi maksimal" min="0" max={priceCeiling} step="5" value={priceLimit} onChange={(event) => setMaxPrice(Number(event.target.value))} />
      </label>
    </>
  }
  function renderProduct(product: Product, slider = false) {
    return <ShopProductCard
      key={product.id}
      product={product}
      onQuickView={() => { setVariantId(product.defaultVariantId); setQuickView(product) }}
      onAdd={() => addToCart(product.id)}
      slider={slider}
    />
  }
  // Lines never drop below their option's minimum; the bin removes them.
  function changeQuantity(id: string, change: number, minimum = 1) {
    setCart((current) =>
      current.flatMap((item) => {
        if (cartLineKey(item) !== id) return [item]
        const next = Math.max(item.quantity, minimum) + change
        if (next <= 0) return []
        return [{ ...item, quantity: Math.min(Math.max(next, minimum), 999) }]
      }),
    )
  }
  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      sending ||
      !cartDetails.length ||
      unavailable.length ||
      availability === "checking"
    )
      return
    if (availability === "email") {
      setEmailReady(true)
      return
    }
    const items = cartDetails.map(
      ({ productId, quantity, selection, photo }) => ({
        productId,
        quantity,
        ...(selection.variantId ? { variantId: selection.variantId } : {}),
        ...(photo ? { photo } : {}),
      }),
    )
    const payload = JSON.stringify({ customer, items })
    if (requestAttempt.current?.payload !== payload)
      requestAttempt.current = { payload, id: crypto.randomUUID() }
    orderReference.current ||= `CUBE-${Math.floor(100000 + Math.random() * 900000)}`
    setSending(true)
    setError("")
    const result = await apiRequest<{ reference: string }>("/api/orders", {
      method: "POST",
      body: {
        reference: orderReference.current,
        requestId: requestAttempt.current.id,
        website: new FormData(event.currentTarget).get("website") ?? "",
        customer,
        items,
      },
    })
    setSending(false)
    if (result.ok && /^CUBE-\d{6}$/.test(result.data.reference)) {
      setEmailReady(false)
      setPlacedOrder(result.data.reference)
      setCart([])
      orderReference.current = ""
      requestAttempt.current = null
    } else
      setError(
        "Porosia nuk u dërgua. Provo përsëri ose dërgoje me email më poshtë.",
      )
  }

  const overview = category === "Krejt" && !search && maxPrice === null && sort === "featured"

  return (
    <>
      <Storefront onCart={() => setCartOpen(true)} count={itemCount} overview={overview}>
        {overview ? <ShopOverview catalog={catalog} renderProduct={(product) => renderProduct(product, true)} /> : (
        <section
          className="cube-shop-main"
          id="catalog"
          aria-labelledby="catalog-title"
        >
          <h1 className="sr-only" id="catalog-title">Shop</h1>
          <nav
            ref={categoryNavRef}
            className="cube-shop-categories"
            aria-label={`Kategoritë: ${shopCategoryLabel(parentShopCategory(category))}`}
          >
            {getShopCategoryOptions(category).map((item) => item.href ? (
              <a href={item.href} key={item.href}>{item.label}</a>
            ) : (
              <button
                key={item.value}
                type="button"
                className={category === item.value ? "active" : ""}
                aria-pressed={category === item.value}
                onClick={() => {
                  selectCategory(item.value!)
                }}
              >
                {item.label}
                <span>
                  {catalog.filter((p) => matchesCategory(p, item.value!, "")).length}
                </span>
              </button>
            ))}
          </nav>
          {categoryProducts.length > 0 && <div
            className="cube-shop-toolbar"
            role="group"
            aria-label={`Kërkimi dhe filtrat: ${shopCategoryLabel(category)}`}
          >
            <label className="cube-search">
              <Search size={18} />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={`Kërko te ${shopCategoryLabel(category)}`}
              />
              {search && (
                <button
                  type="button"
                  aria-label="Pastro kërkimin"
                  onClick={() => setSearch("")}
                >
                  <X size={16} />
                </button>
              )}
            </label>
            {posterCategory ? (
              <FilterMenu
                key={category}
                label="Seria"
                groups={filterGroups}
                value={filters}
                onChange={setFilters}
                extraActiveCount={Number(maxPrice !== null) + Number(sort !== "featured")}
                onReset={() => { setFilters({}); setMaxPrice(null); setSort("featured") }}
              >
                <div className="poster-menu-controls">
                  {renderSortControl(true)}
                  {renderPriceControls()}
                </div>
              </FilterMenu>
            ) : <>
              <button type="button" className={`cube-filter-button ${filtersOpen ? "active" : ""}`} aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}>
                <SlidersHorizontal size={16} /> Filtrat
              </button>
              {renderSortControl()}
            </>}
          </div>}
          {!posterCategory && categoryProducts.length > 0 && filtersOpen && (
            <div className="cube-filter-panel">
              {renderPriceControls()}
              <button type="button" onClick={resetFilters}>Pastro filtrat</button>
            </div>
          )}
          <div className="cube-result-count" role="status">
            <span>
              {visibleProducts.length} produkte
              {category !== "Krejt"
                ? ` · ${shopCategoryLabel(category)}`
                : ""}
              {category === "Postera" && filters.seria?.length
                ? ` · ${filters.seria.join(", ")}`
                : ""}
            </span>
            <span>Çmime orientuese · Konfirmohen para prodhimit</span>
          </div>
          <div className="cube-shop-grid">
            {visibleProducts.slice(0, shown).map((product) => renderProduct(product))}
          </div>
          {visibleProducts.length > shown && (
            <div className="cube-load-more">
              <button
                className="cube-button cube-button-dark"
                type="button"
                onClick={() =>
                  setPaging({ key: filterKey, shown: shown + PAGE_SIZE })
                }
              >
                Shfaq më shumë <Plus size={16} />
              </button>
              <span>
                {shown} nga {visibleProducts.length} produkte
              </span>
            </div>
          )}
          {!visibleProducts.length && (
            <div className="cube-empty">
              <Search />
              <h2>S’gjetëm asnjë produkt.</h2>
              <p>Provo një kërkim tjetër ose pastro filtrat.</p>
              <button
                className="cube-button"
                type="button"
                onClick={resetFilters}
              >
                Pastro filtrat
              </button>
            </div>
          )}
          {category === "Krejt" && !search && (
            <div className="cube-business-strip">
              <div>
                <strong>Print për biznese</strong>
                <p>
                  Kartëvizita, banera, ambalazh, stickers dhe merch për ekipin.
                </p>
              </div>
              <button
                className="cube-text-link"
                type="button"
                onClick={() => {
                  selectCategory(BUSINESS)
                  document
                    .getElementById("catalog")
                    ?.scrollIntoView({ behavior: "smooth" })
                }}
              >
                Shiko printin për biznese <ArrowRight size={16} />
              </button>
            </div>
          )}
          <div className="cube-shop-help">
            <p>Ke një ide tjetër në mendje?</p>
            <a className="cube-text-link" href="/start-project">
              Ta krijojmë bashkë <ArrowRight size={16} />
            </a>
          </div>
        </section>
        )}
      </Storefront>
      {quickView && (
        <StoreDialog title={quickView.name} onClose={() => setQuickView(null)}>
          <div className="cube-quick-view">
            <div className="cube-quick-image">
              {quickView.image && (
                <ResponsiveImage image={quickView.image} alt={quickView.name} sizes="(max-width: 700px) 90vw, 40vw" style={{ objectFit: "contain" }} />
              )}
            </div>
            <div className="cube-quick-copy">
              <span className="cube-eyebrow">{quickView.category}</span>
              <h2>{quickView.name}</h2>
              <p>{quickView.description}</p>
              {isPrintProduct(quickView) ? (
                <SizeFinishPicker
                  product={quickView}
                  value={variantId}
                  onChange={setVariantId}
                  compact
                />
              ) : (
                <>
                  <dl>
                    <div>
                      <dt>Materiali</dt>
                      <dd>{quickView.material}</dd>
                    </div>
                  </dl>
                  <ProductOptions
                    product={quickView}
                    value={variantId}
                    onChange={setVariantId}
                  />
                </>
              )}
              <strong className="cube-detail-price">
                {currency.format(getSelection(quickView, variantId).price)}
              </strong>
              <span className="cube-product-note">
                Çmim orientues · Pamje ilustruese
              </span>
              <button
                className="cube-button cube-button-dark"
                type="button"
                onClick={() => addToCart(quickView.id, variantId)}
              >
                Shto në shportë <Plus size={17} />
              </button>
              <a className="cube-text-link" href={`/shop/${quickView.id}`}>
                Shiko detajet <ArrowRight size={15} />
              </a>
            </div>
          </div>
        </StoreDialog>
      )}
      {cartOpen && (
        <StoreDialog
          title={checkout ? "Përfundo porosinë" : "Shporta jote"}
          drawer
          onClose={() => setCartOpen(false)}
        >
          <div className="cube-cart">
            <span className="cube-eyebrow">ZGJEDHJET E TUA</span>
            <h2>
              {placedOrder
                ? "U krye."
                : checkout
                  ? "Edhe pak."
                  : "Shporta jote."}
            </h2>
            {!!unavailable.length && (
              <div className="cube-order-error" role="alert">
                <p>
                  {unavailable.length} zgjedhje nuk janë më të disponueshme.
                  Largoji për të vazhduar me porosinë.
                </p>
                <button
                  className="cube-text-link"
                  type="button"
                  onClick={() => {
                    const keys = new Set(unavailable.map(cartLineKey))
                    setCart((current) =>
                      current.filter((item) => !keys.has(cartLineKey(item))),
                    )
                  }}
                >
                  Largo zgjedhjet e padisponueshme
                </button>
              </div>
            )}
            {placedOrder ? (
              <div className="cube-order-success" role="status">
                <PackageCheck size={40} />
                <h3>Porosia u pranua.</h3>
                <strong>{placedOrder}</strong>
                <p>
                  Të kontaktojmë{" "}
                  {customer.email
                    ? `te ${customer.email}`
                    : `në ${customer.phone}`}{" "}
                  për të konfirmuar specifikat, afatin dhe totalin final.
                </p>
                <button
                  className="cube-button"
                  type="button"
                  onClick={() => setCartOpen(false)}
                >
                  Vazhdo te produktet <ArrowRight size={17} />
                </button>
              </div>
            ) : !cartDetails.length ? (
              <div className="cube-cart-empty">
                <ShoppingBag size={42} />
                <h3>Diçka e mirë po të pret.</h3>
                <p>Shporta është ende bosh.</p>
                <button
                  className="cube-button"
                  type="button"
                  onClick={() => setCartOpen(false)}
                >
                  Zbulo produktet <ArrowRight size={17} />
                </button>
              </div>
            ) : checkout ? (
              <form className="cube-checkout" onSubmit={submitOrder}>
                <button
                  className="cube-text-link"
                  type="button"
                  onClick={() => setCheckout(false)}
                >
                  ← Kthehu te shporta
                </button>
                {(
                  [
                    {
                      key: "name",
                      label: "Emri dhe mbiemri",
                      type: "text",
                      auto: "name",
                    },
                    {
                      key: "phone",
                      label: "Telefoni",
                      type: "tel",
                      auto: "tel",
                      placeholder: "+383 4x xxx xxx",
                    },
                    {
                      key: "address",
                      label: "Adresa e dërgesës",
                      type: "text",
                      auto: "street-address",
                      placeholder: "Rruga, numri, qyteti",
                    },
                    {
                      key: "email",
                      label: "Email (opsionale)",
                      type: "email",
                      auto: "email",
                      placeholder: "Për konfirmimin me shkrim",
                    },
                  ] as const
                ).map((field) => (
                  <label key={field.key}>
                    {field.label}
                    <input
                      required={field.key !== "email"}
                      type={field.type}
                      placeholder={
                        "placeholder" in field ? field.placeholder : undefined
                      }
                      autoComplete={field.auto}
                      maxLength={
                        field.key === "address"
                          ? 300
                          : field.key === "phone"
                            ? 40
                            : field.key === "email"
                              ? 254
                              : 160
                      }
                      value={customer[field.key]}
                      onChange={(event) =>
                        setCustomer({
                          ...customer,
                          [field.key]: event.target.value,
                        })
                      }
                    />
                  </label>
                ))}
                {availability === "email" && (
                  <p className="cube-checkout-notice">
                    Për momentin kërkesat për porosi i përgatisim me email.
                    Plotëso të dhënat; në hapin tjetër e dërgon nga email-i yt.
                  </p>
                )}
                <label className="cube-honeypot" aria-hidden="true">
                  Lëre bosh
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
                <label>
                  Shënime / Personalizim
                  <textarea
                    rows={3}
                    maxLength={2000}
                    placeholder="Madhësia e maicës, korniza, ngjyra ose ideja jote…"
                    value={customer.notes}
                    onChange={(event) =>
                      setCustomer({ ...customer, notes: event.target.value })
                    }
                  />
                </label>
                <div className="cube-checkout-lines">
                  {cartDetails.map((item) => (
                    <div key={item.key}>
                      <span>
                        {item.quantity} × {item.product.name}
                        <small>{item.selection.label}</small>
                      </span>
                      <strong>
                        {currency.format(item.quantity * item.selection.price)}
                      </strong>
                    </div>
                  ))}
                </div>
                <div className="cube-cart-total">
                  <span>Totali, pa dërgesën</span>
                  <strong>{currency.format(subtotal)}</strong>
                </div>
                {error && (
                  <div className="cube-order-error" role="alert">
                    <p>{error}</p>
                    <a href={orderHref}>Dërgo porosinë me email ↗</a>
                  </div>
                )}
                <button
                  className="cube-button cube-button-dark"
                  type="submit"
                  disabled={
                    sending ||
                    availability === "checking" ||
                    !!unavailable.length
                  }
                >
                  {sending
                    ? "Po dërgohet…"
                    : availability === "checking"
                      ? "Po kontrollohet…"
                      : availability === "email"
                        ? "Përgatit porosinë me email"
                        : "Dërgo porosinë"}
                  <ArrowRight size={17} />
                </button>
                {emailReady && <OrderEmail text={orderText} href={orderHref} />}
                <p className="cube-product-note">
                  Nuk paguan tani. Studioja të kontakton për ta konfirmuar
                  dërgesën dhe afatin; pastaj nis prodhimi.
                </p>
              </form>
            ) : (
              <>
                <div className="cube-cart-items">
                  {cartDetails.map(
                    ({ product, quantity, key, selection, photo }) => (
                      <article key={key}>
                        <div className="cube-cart-thumb">
                          {photo ? (
                            <span
                              className="cube-cart-photo"
                              style={{
                                aspectRatio: (() => {
                                  const cm = getPosterSize(
                                    parseVariantId(selection.variantId)?.size,
                                  )?.cm ?? [30, 40]
                                  return photo.landscape
                                    ? cm[1] / cm[0]
                                    : cm[0] / cm[1]
                                })(),
                                ...cropStyle(photo.image, photo.crop),
                              }}
                            />
                          ) : (
                            product.image && (
                              <ResponsiveImage image={product.image} alt="" />
                            )
                          )}
                        </div>
                        <div className="cube-cart-item-copy">
                          <h3>{product.name}</h3>
                          <span>
                            {selection.label}
                            {selection.minQuantity > 1 &&
                              ` · min. ${selection.minQuantity} copë`}
                          </span>
                          <strong>
                            {currency.format(selection.price * quantity)}
                          </strong>
                          <div className="cube-quantity">
                            <button
                              type="button"
                              aria-label={`Zvogëlo ${product.name}${selection.variantId ? `, ${selection.label}` : ""}`}
                              disabled={
                                selection.minQuantity > 1 &&
                                quantity <= selection.minQuantity
                              }
                              onClick={() =>
                                changeQuantity(key, -1, selection.minQuantity)
                              }
                            >
                              <Minus size={13} />
                            </button>
                            <span>{quantity}</span>
                            <button
                              type="button"
                              aria-label={`Rrite ${product.name}${selection.variantId ? `, ${selection.label}` : ""}`}
                              onClick={() =>
                                changeQuantity(key, 1, selection.minQuantity)
                              }
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        </div>
                        <button
                          className="cube-cart-remove"
                          type="button"
                          aria-label={`Largo ${product.name}${selection.variantId ? `, ${selection.label}` : ""}`}
                          onClick={() =>
                            setCart((current) =>
                              current.filter(
                                (item) => cartLineKey(item) !== key,
                              ),
                            )
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </article>
                    ),
                  )}
                </div>
                <div className="cube-cart-bottom">
                  <div className="cube-cart-total">
                    <span>Totali, pa dërgesën</span>
                    <strong>{currency.format(subtotal)}</strong>
                  </div>
                  <p className="cube-product-note">
                    Dërgesa dhe specifikat konfirmohen me ty.
                  </p>
                  {wallCount > 0 && (
                    <a className="cube-cart-wall" href="/shop/muri?shporta=1">
                      <Frame size={17} />
                      <span>
                        <strong>Shiko si duken në mur</strong>
                        <small>
                          {wallCount === 1
                            ? "1 poster"
                            : `${Math.min(wallCount, MAX_ITEMS)} postera`}{" "}
                          në madhësinë reale, mbi një divan
                        </small>
                      </span>
                      <ArrowRight size={15} />
                    </a>
                  )}
                  <button
                    className="cube-button cube-button-dark"
                    type="button"
                    disabled={!!unavailable.length}
                    onClick={() => setCheckout(true)}
                  >
                    Vazhdo me porosinë <ArrowRight size={17} />
                  </button>
                  <span className="cube-cart-assurance">
                    <Check size={14} /> Pa pagesë deri në konfirmim
                  </span>
                </div>
              </>
            )}
          </div>
        </StoreDialog>
      )}
    </>
  )
}
