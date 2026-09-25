import type { Product } from "@/data/products"

export type SubmissionStatus = "new" | "in_progress" | "done" | "archived"
export type OrderStatus =
  | "new"
  | "confirmed"
  | "in_production"
  | "delivered"
  | "cancelled"

export type Submission = {
  id: number
  kind: "contact" | "project"
  name: string
  email: string
  company: string
  message: string
  details: {
    services?: string[]
    budget?: string
    timeline?: string
    success?: string
  }
  status: SubmissionStatus
  notes: string
  created_at: string
}

export type OrderItem = {
  productId: string
  name: string
  quantityLabel: string
  price: number
  quantity: number
  lineTotal: number
}

export type Order = {
  id: number
  reference: string
  customer: {
    name: string
    email: string
    phone: string
    address: string
    notes: string
  }
  items: OrderItem[]
  total: number
  status: OrderStatus
  notes: string
  created_at: string
}

export type StoredProduct = {
  product: Product
  active: boolean
  sortOrder: number
}

export const submissionStatusLabels: Record<SubmissionStatus, string> = {
  new: "E re",
  in_progress: "Në proces",
  done: "E përfunduar",
  archived: "Arkivuar",
}

export const orderStatusLabels: Record<OrderStatus, string> = {
  new: "E re",
  confirmed: "Konfirmuar",
  in_production: "Në prodhim",
  delivered: "Dërguar",
  cancelled: "Anuluar",
}

export const currency = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
})

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("sq-AL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}
