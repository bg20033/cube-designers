import { createContext, useContext, type ReactNode } from "react"

import { normalizePathname } from "@/app/routes"

const RoutePathContext = createContext("/")

export function RoutePathProvider({
  pathname,
  children,
}: {
  pathname: string
  children: ReactNode
}) {
  return (
    <RoutePathContext.Provider value={normalizePathname(pathname)}>
      {children}
    </RoutePathContext.Provider>
  )
}

export function useRoutePath() {
  return useContext(RoutePathContext)
}
