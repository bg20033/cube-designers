import { useEffect, useState, type FormEvent } from "react"
import { Download, Pencil, Plus, Trash2, X } from "lucide-react"

import { apiRequest } from "@/lib/api"
import { ResponsiveImage, portfolioImages } from "@/components/ResponsiveImage"
import { products as staticProducts, type Product } from "@/data/products"
import { currency, type StoredProduct } from "@/components/admin/types"

const categories: Product["category"][] = ["Print", "Promo", "Textile", "Packaging", "Signage"]
const tones: Product["tone"][] = ["orange", "violet", "acid", "paper"]
const speeds: Product["production"][] = ["Fast", "Standard", "Custom"]
const badges = ["", "Bestseller", "New", "Eco"] as const
const imageKeys = portfolioImages
  .map((image) => image.key)
  .filter((key) => key.startsWith("shop-"))

type Draft = StoredProduct & { previousId?: string }

function emptyDraft(count: number): Draft {
  return {
    product: {
      id: "",
      number: String(count + 1).padStart(2, "0"),
      name: "",
      category: "Print",
      price: 0,
      quantityLabel: "",
      description: "",
      tone: "paper",
      production: "Standard",
      material: "",
    },
    active: true,
    sortOrder: count,
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function ProductForm({
  draft,
  onClose,
  onSaved,
}: {
  draft: Draft
  onClose: () => void
  onSaved: (products: StoredProduct[]) => void
}) {
  const [value, setValue] = useState(draft)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const isNew = !draft.previousId
  const product = value.product

  function update<Key extends keyof Product>(key: Key, next: Product[Key]) {
    setValue((current) => ({ ...current, product: { ...current.product, [key]: next } }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    const result = await apiRequest<{ products: StoredProduct[] }>("/api/admin/products", {
      method: "POST",
      body: value,
    })
    setBusy(false)
    if (!result.ok) return setError(result.error)
    onSaved(result.data.products)
  }

  return (
    <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="product-form-title">
      <form className="admin-modal-card" onSubmit={submit}>
        <header>
          <h2 id="product-form-title">{isNew ? "Produkt i ri" : product.name}</h2>
          <button type="button" className="admin-icon-button" onClick={onClose} aria-label="Mbylle">
            <X />
          </button>
        </header>

        <div className="admin-form-grid">
          <label className="is-wide">
            <span>Emri *</span>
            <input
              required
              value={product.name}
              onChange={(event) => {
                update("name", event.target.value)
                if (isNew) update("id", slugify(event.target.value))
              }}
            />
          </label>
          <label>
            <span>Slug (URL) *</span>
            <input
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={product.id}
              onChange={(event) => update("id", event.target.value)}
            />
          </label>
          <label>
            <span>Numri</span>
            <input value={product.number} onChange={(event) => update("number", event.target.value)} />
          </label>
          <label>
            <span>Kategoria</span>
            <select
              value={product.category}
              onChange={(event) => update("category", event.target.value as Product["category"])}
            >
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Çmimi (€) *</span>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={product.price}
              onChange={(event) => update("price", Number(event.target.value))}
            />
          </label>
          <label>
            <span>Sasia *</span>
            <input
              required
              placeholder="100 copë"
              value={product.quantityLabel}
              onChange={(event) => update("quantityLabel", event.target.value)}
            />
          </label>
          <label>
            <span>Materiali *</span>
            <input
              required
              value={product.material}
              onChange={(event) => update("material", event.target.value)}
            />
          </label>
          <label>
            <span>Prodhimi</span>
            <select
              value={product.production}
              onChange={(event) => update("production", event.target.value as Product["production"])}
            >
              {speeds.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Ngjyra e kartës</span>
            <select
              value={product.tone}
              onChange={(event) => update("tone", event.target.value as Product["tone"])}
            >
              {tones.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Badge</span>
            <select
              value={product.badge ?? ""}
              onChange={(event) =>
                update("badge", (event.target.value || undefined) as Product["badge"])
              }
            >
              {badges.map((item) => <option key={item} value={item}>{item || "—"}</option>)}
            </select>
          </label>
          <label className="is-wide">
            <span>Përshkrimi *</span>
            <textarea
              required
              rows={3}
              value={product.description}
              onChange={(event) => update("description", event.target.value)}
            />
          </label>
          <label className="is-wide">
            <span>Foto — zgjidh një ekzistuese ose ngjit një URL</span>
            <input
              list="admin-image-keys"
              placeholder="shop-business-cards ose https://…"
              value={product.image ?? ""}
              onChange={(event) => update("image", event.target.value || undefined)}
            />
            <datalist id="admin-image-keys">
              {imageKeys.map((key) => <option key={key} value={key} />)}
            </datalist>
          </label>
          {product.image && (
            <div className="admin-image-preview is-wide">
              <ResponsiveImage image={product.image} alt="" sizes="200px" />
            </div>
          )}
          <label>
            <span>Renditja</span>
            <input
              type="number"
              value={value.sortOrder}
              onChange={(event) =>
                setValue((current) => ({ ...current, sortOrder: Number(event.target.value) }))
              }
            />
          </label>
          <div className="admin-form-checks">
            <label className="admin-check">
              <input
                type="checkbox"
                checked={value.active}
                onChange={(event) =>
                  setValue((current) => ({ ...current, active: event.target.checked }))
                }
              />
              Aktiv në shop
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={Boolean(product.featured)}
                onChange={(event) => update("featured", event.target.checked || undefined)}
              />
              I veçuar (featured)
            </label>
          </div>
        </div>

        {error && <p className="admin-error" role="alert">{error}</p>}

        <footer>
          <button type="button" className="admin-button is-ghost" onClick={onClose}>
            Anulo
          </button>
          <button type="submit" className="admin-button is-primary" disabled={busy}>
            {busy ? "Po ruhet…" : "Ruaj produktin"}
          </button>
        </footer>
      </form>
    </div>
  )
}

export function ProductsPanel() {
  const [items, setItems] = useState<StoredProduct[] | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    void apiRequest<{ products: StoredProduct[] }>("/api/admin/products").then((result) => {
      if (result.ok) setItems(result.data.products)
      else setError(result.error)
    })
  }, [])

  async function importStatic() {
    const result = await apiRequest<{ products: StoredProduct[] }>(
      "/api/admin/products?action=import",
      { method: "POST", body: {} },
    )
    if (result.ok) setItems(result.data.products)
    else setError(result.error)
  }

  async function toggleActive(item: StoredProduct) {
    const result = await apiRequest<{ products: StoredProduct[] }>("/api/admin/products", {
      method: "POST",
      body: { ...item, active: !item.active, previousId: item.product.id },
    })
    if (result.ok) setItems(result.data.products)
    else setError(result.error)
  }

  async function remove(item: StoredProduct) {
    if (!window.confirm(`Me fshi "${item.product.name}"?`)) return
    const result = await apiRequest<{ products: StoredProduct[] }>(
      `/api/admin/products?id=${encodeURIComponent(item.product.id)}`,
      { method: "DELETE" },
    )
    if (result.ok) setItems(result.data.products)
    else setError(result.error)
  }

  if (!items) {
    return error ? <p className="admin-error">{error}</p> : <p className="admin-empty">Duke i ngarku produktet…</p>
  }

  return (
    <section className="admin-panel">
      <header className="admin-panel-head">
        <div>
          <h1>Produktet</h1>
          <p>
            {items.length
              ? `${items.filter((item) => item.active).length} aktive nga ${items.length}`
              : "Shop-i po përdor katalogun statik të faqes."}
          </p>
        </div>
        <div className="admin-toolbar">
          <button
            className="admin-button is-primary"
            type="button"
            onClick={() => setDraft(emptyDraft(items.length))}
          >
            <Plus />
            Produkt i ri
          </button>
        </div>
      </header>

      {error && <p className="admin-error" role="alert">{error}</p>}

      {!items.length && (
        <div className="admin-callout">
          <strong>Ende s'ka produkte në databazë.</strong>
          <p>
            Shop-i tani shfaq {staticProducts.length} produktet që janë në kod. Importoji
            një herë këtu dhe pastaj i menaxhon krejt nga dashboard-i: çmime, foto,
            produkte të reja. Kur databaza ka produkte, shop-i përdor vetëm ato.
          </p>
          <button className="admin-button is-primary" type="button" onClick={importStatic}>
            <Download />
            Importo {staticProducts.length} produktet ekzistuese
          </button>
        </div>
      )}

      {!!items.length && (
        <div className="admin-table-wrap">
          <table className="admin-table admin-product-table">
            <thead>
              <tr>
                <th>Produkti</th>
                <th>Kategoria</th>
                <th>Çmimi</th>
                <th>Aktiv</th>
                <th><span className="sr-only">Veprime</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.product.id} className={item.active ? "" : "is-inactive"}>
                  <td>
                    <div className="admin-product-cell">
                      <span className="admin-thumb">
                        {item.product.image && (
                          <ResponsiveImage image={item.product.image} alt="" sizes="48px" />
                        )}
                      </span>
                      <span>
                        {item.product.name}
                        <small>{item.product.quantityLabel} · /shop/{item.product.id}</small>
                      </span>
                    </div>
                  </td>
                  <td>{item.product.category}</td>
                  <td>{currency.format(item.product.price)}</td>
                  <td>
                    <label className="admin-switch">
                      <input
                        type="checkbox"
                        checked={item.active}
                        onChange={() => void toggleActive(item)}
                        aria-label={`${item.product.name} aktiv`}
                      />
                      <span />
                    </label>
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="admin-icon-button"
                        aria-label={`Ndrysho ${item.product.name}`}
                        onClick={() => setDraft({ ...item, previousId: item.product.id })}
                      >
                        <Pencil />
                      </button>
                      <button
                        type="button"
                        className="admin-icon-button is-danger"
                        aria-label={`Fshij ${item.product.name}`}
                        onClick={() => void remove(item)}
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {draft && (
        <ProductForm
          draft={draft}
          onClose={() => setDraft(null)}
          onSaved={(next) => {
            setItems(next)
            setDraft(null)
          }}
        />
      )}
    </section>
  )
}
