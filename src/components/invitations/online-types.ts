import type { Wedding } from "./model.js"

export type InvitationOrderStatus = "pending" | "active" | "suspended" | "cancelled"
export type InvitationCustomer = { name: string; email: string; phone: string }
export type InvitationOrder = {
  id: string
  reference: string
  customer: InvitationCustomer
  status: InvitationOrderStatus
  payment_status: "unpaid" | "paid"
  total: number | null
  notes?: string
  revision: number
  created_at: string
  source_submission_id?: number | null
  guest_count?: number
}
export type InvitationDashboard = {
  order: InvitationOrder
  wedding: Wedding
  administrator: boolean
}
export type OnlineController = {
  data: InvitationDashboard
  save: (wedding: Wedding) => Promise<Wedding>
  respond: (guestToken: string, responses: Wedding["guests"][number]["responses"]) => Promise<boolean>
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

export const invitationStatusLabels: Record<InvitationOrderStatus, string> = {
  pending: "Në pritje të pagesës", active: "Aktive", suspended: "Pezulluar", cancelled: "Anuluar",
}

export type InvitationAccess = { id: string; reference: string; email: string; password: string }
