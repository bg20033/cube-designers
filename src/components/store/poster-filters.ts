import { parseVariantId, type Product } from "@/data/products"

// Poster facets for the shop and the wall planner. Each group is a
// multi-select: a product matches a group when it has any selected value,
// and must match every group that has a selection.
export type FilterValue = Record<string, string[]>

type Facet = {
  id: string
  label: string
  values: (product: Product) => string[]
  // Option order: by first appearance, or newest first for decades.
  order?: (a: string, b: string) => number
}

// Archive and museum descriptions carry the poster's year.
function decade(product: Product) {
  const year = /\b(18[5-9]\d|19\d\d|20[0-2]\d)\b/.exec(product.description)?.[1]
  return year ? [`${year.slice(0, 3)}0`] : []
}

const POSTER_SIZES: Record<string, string> = {
  a5: "A5",
  a4: "A4",
  a3: "A3",
  a2: "A2",
}

export const posterFacets: Facet[] = [
  {
    id: "seria",
    label: "Seria",
    values: (product) =>
      product.category === "Paketa"
        ? ["Paketa"]
        : product.series
          ? [product.series]
          : [],
  },
  {
    id: "dekada",
    label: "Dekada",
    values: decade,
    order: (a, b) => Number(a) - Number(b),
  },
  {
    id: "madhesia",
    label: "Madhësia",
    values: (product) => [
      ...new Set(
        (product.variants ?? []).flatMap((variant) => {
          const size = parseVariantId(variant.id)?.size
          return size && size in POSTER_SIZES ? [size] : []
        }),
      ),
    ],
    order: (a, b) =>
      Object.keys(POSTER_SIZES).indexOf(a) - Object.keys(POSTER_SIZES).indexOf(b),
  },
]

export function optionLabel(group: string, value: string) {
  if (group === "dekada")
    return `${value}–${String(Number(value) + 9).slice(2)}`
  if (group === "madhesia") return POSTER_SIZES[value] ?? value
  return value
}

// Groups with their options and how many of `products` have each.
export function facetGroups(products: Product[]) {
  return posterFacets.flatMap((facet) => {
    const counts = new Map<string, number>()
    for (const product of products)
      for (const value of facet.values(product))
        counts.set(value, (counts.get(value) ?? 0) + 1)
    const values = [...counts.keys()]
    if (facet.order) values.sort(facet.order)
    return values.length > 1
      ? [
          {
            id: facet.id,
            label: facet.label,
            options: values.map((value) => ({
              value,
              label: optionLabel(facet.id, value),
              count: counts.get(value)!,
            })),
          },
        ]
      : []
  })
}

export function matchesFilters(product: Product, value: FilterValue) {
  return posterFacets.every((facet) => {
    const selected = value[facet.id]
    return (
      !selected?.length ||
      facet.values(product).some((entry) => selected.includes(entry))
    )
  })
}

export const filterCount = (value: FilterValue) =>
  Object.values(value).reduce((sum, list) => sum + list.length, 0)

// URL form: ?seria=Kinema,Muzikë&dekada=1930
export function readFilters(params: URLSearchParams): FilterValue {
  return Object.fromEntries(
    posterFacets.flatMap((facet) => {
      const raw = params.get(facet.id)
      return raw ? [[facet.id, raw.split(",").filter(Boolean)]] : []
    }),
  )
}

export function writeFilters(params: URLSearchParams, value: FilterValue) {
  for (const facet of posterFacets)
    if (value[facet.id]?.length) params.set(facet.id, value[facet.id].join(","))
}
