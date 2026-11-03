import { beforeEach, describe, expect, it, vi } from "vitest"
import { products } from "../../src/data/products"

const mock = vi.hoisted(() => ({
  db: vi.fn(),
  catalog: vi.fn(),
  list: vi.fn(),
  sql: vi.fn(),
}))
vi.mock("../../api/_lib/db.js", () => ({
  db: mock.db,
  getCatalog: mock.catalog,
  listProducts: mock.list,
}))
import { POST } from "../../api/orders"
import { GET as getStatus } from "../../api/shop-status"
import { GET as getProducts } from "../../api/products"

const customer = {
  name: "Test CUBE",
  email: "test@example.com",
  phone: "+38344123456",
  address: "Suharekë",
  notes: "",
}
const requestId = "b370e532-a858-47e9-815d-880a74e3e407"
const saved = new Map<string, { reference: string; request_hash: string }>()
function order(changes = {}) {
  return new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      requestId,
      customer,
      items: [{ productId: "forma-blue", variantId: "a2", quantity: 2 }],
      ...changes,
    }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  saved.clear()
  mock.db.mockResolvedValue(mock.sql)
  mock.catalog.mockResolvedValue(products)
  mock.sql.mockImplementation(
    async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const query = strings.join("?")
      if (query.includes("insert into orders")) {
        const key = values[4] as string
        if (saved.has(key)) return []
        saved.set(key, {
          reference: values[0] as string,
          request_hash: values[5] as string,
        })
        return [{ id: 1 }]
      }
      if (query.includes("where request_key"))
        return saved.has(values[0] as string)
          ? [saved.get(values[0] as string)]
          : []
      return []
    },
  )
})

describe("order API", () => {
  it("retries one request without creating a second order", async () => {
    const first = await POST(order())
    const second = await POST(order())
    expect(first.status).toBe(201)
    expect(second.status).toBe(200)
    const a = await first.json()
    const b = await second.json()
    expect(a.reference).toBe(b.reference)
    expect(a.total).toBe(30)
    expect(saved.size).toBe(1)
  })
  it("rejects reusing an order request with changed customer data", async () => {
    await POST(order())
    const response = await POST(
      order({ customer: { ...customer, name: "Another name" } }),
    )
    expect(response.status).toBe(409)
    expect(saved.size).toBe(1)
  })
  it("returns validation errors without reporting false success", async () => {
    expect((await POST(order({ items: [] }))).status).toBe(400)
    expect((await POST(order({ website: "bot" }))).status).toBe(400)
    expect(
      (await POST(order({ customer: { ...customer, email: "invalid" } })))
        .status,
    ).toBe(400)
    expect(
      (await POST(order({ customer: { ...customer, phone: "" } }))).status,
    ).toBe(400)
    expect(saved.size).toBe(0)
  })
  it("accepts an order without an email; the phone is enough", async () => {
    const response = await POST(
      order({
        requestId: "6f1c2a7e-0d4b-4c1e-9a3f-2b8d7e6c5a41",
        customer: { ...customer, email: "" },
      }),
    )
    expect(response.status).toBe(201)
  })
})

describe("shop availability", () => {
  it("only reports online ordering when the database answers", async () => {
    expect(await (await getStatus()).json()).toEqual({ ordersAvailable: true })
    mock.db.mockRejectedValue(new Error("not configured"))
    expect(await (await getStatus()).json()).toEqual({ ordersAvailable: false })
  })
  it("keeps a deliberately empty managed catalog empty", async () => {
    mock.list.mockResolvedValue([
      { product: products[0], active: false, sortOrder: 0 },
    ])
    const response = await getProducts(
      new Request("http://localhost/api/products"),
    )
    expect(await response.json()).toMatchObject({ managed: true, products: [] })
  })
  it("sends each shared variant list once", async () => {
    const posters = products
      .filter(
        (product) => product.id === "forma-blue" || product.id === "diell",
      )
      .map((product, sortOrder) => ({ product, active: true, sortOrder }))
    mock.list.mockResolvedValue(posters)
    const body = await (
      await getProducts(new Request("http://localhost/api/products"))
    ).json()
    expect(body.variantSets).toHaveLength(1)
    expect(body.variantSets[0]).toEqual(posters[0].product.variants)
    expect(
      body.products.map((item: { variantSet: number }) => item.variantSet),
    ).toEqual([0, 0])
    expect(body.products[0].variants).toBeUndefined()
  })
})
