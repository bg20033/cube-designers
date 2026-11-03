import { useEffect, useState } from "react"
import { apiRequest } from "@/lib/api"

export function useOrderAvailability() {
  const [state, setState] = useState<"checking" | "online" | "email">(
    "checking",
  )
  useEffect(() => {
    let active = true
    void apiRequest<{ ordersAvailable: boolean }>("/api/shop-status").then(
      (result) => {
        if (active)
          setState(
            result.ok && result.data.ordersAvailable === true
              ? "online"
              : "email",
          )
      },
    )
    return () => {
      active = false
    }
  }, [])
  return state
}
