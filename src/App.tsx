import { lazy, Suspense, useEffect, useState, type ComponentType } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { isAdminPath, matchRoute, type RouteKey } from "@/app/routes"
import { RoutePathProvider } from "@/app/RouteContext"

// Every page is its own chunk. main.tsx (and the prerenderer) load the current
// page first, so it renders synchronously and hydration never suspends.
function lazyPage<P extends object>(
  load: () => Promise<{ default: ComponentType<P> }>,
) {
  let loaded: ComponentType<P> | undefined
  const preload = () =>
    load().then((module) => {
      loaded = module.default
      return module
    })
  const Lazy = lazy(preload) as unknown as ComponentType<P>
  function Page(props: P) {
    // Picked once per mount so a later load never swaps the component type.
    const [Component] = useState(() => loaded ?? Lazy)
    return <Component {...props} />
  }
  return Object.assign(Page, { preload })
}

const Lanyard = lazy(() => import("@/components/layout/Lanyard"))
const LANYARD_INTRO_ENABLED = false
const HomePage = lazyPage(() => import("@/components/HomePage"))
const AboutPage = lazyPage(() => import("@/components/AboutPage"))
const WorkPage = lazyPage(() => import("@/components/WorkPage"))
const ProjectBriefPage = lazyPage(() => import("@/components/ProjectBriefPage"))
const ShopPage = lazyPage(() => import("@/components/ShopPage"))
const SmartGlassPage = lazyPage(() => import("@/components/shop/SmartGlassPage"))
const InvitationsPage = lazyPage(() => import("@/components/invitations/OnlineInvitationsPage"))
const PhotoPrintPage = lazyPage(
  () => import("@/components/shop/PhotoPrintPage"),
)
const WallPlannerPage = lazyPage(
  () => import("@/components/shop/WallPlannerPage"),
)
const ProductDetailPage = lazyPage(
  () => import("@/components/shop/ProductDetailPage"),
)
const NotFoundPage = lazyPage(() => import("@/components/NotFoundPage"))
const AdminPage = lazyPage(() => import("@/components/admin/AdminPage"))
const ServicePage = lazyPage(() => import("@/components/services/ServicePage"))

const routePages: Record<RouteKey, { preload: () => Promise<unknown> }> = {
  home: HomePage,
  about: AboutPage,
  services: AboutPage,
  work: WorkPage,
  shop: ShopPage,
  "smart-glass": SmartGlassPage,
  invitations: InvitationsPage,
  wall: WallPlannerPage,
  photo: PhotoPrintPage,
  product: ProductDetailPage,
  "start-project": ProjectBriefPage,
  service: ServicePage,
}

export function preloadPage(pathname: string) {
  if (isAdminPath(pathname)) return AdminPage.preload()
  const route = matchRoute(pathname)
  return (route ? routePages[route.key] : NotFoundPage).preload()
}

function PageFallback() {
  return (
    <div className="page-fallback" role="status" aria-label="Duke hapur faqen">
      <span>CUBE DESIGNERS</span>
    </div>
  )
}

function App({ pathname }: { pathname?: string }) {
  const currentPath =
    pathname ?? (typeof window === "undefined" ? "/" : window.location.pathname)

  if (isAdminPath(currentPath)) {
    return (
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    )
  }

  return <SiteApp currentPath={currentPath} />
}

function SiteApp({ currentPath }: { currentPath: string }) {
  const route = matchRoute(currentPath)
  const introAlreadySeen =
    !LANYARD_INTRO_ENABLED ||
    route?.key !== "home" ||
    (typeof document !== "undefined" &&
      document.documentElement.dataset.introSeen === "true")
  const [hasEntered, setHasEntered] = useState(introAlreadySeen)
  const [effectsReady, setEffectsReady] = useState(introAlreadySeen)
  // WebGL and noise are absent from the prerendered HTML and start once the
  // browser is idle after hydration, so they never delay the first paint or
  // the first tap. Their first frame alone is a ~1s main-thread task on phones.
  const [effectsIdle, setEffectsIdle] = useState(false)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const start = () => setEffectsIdle(true)
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(start, { timeout: 2500 })
      return () => window.cancelIdleCallback(id)
    }
    const id = window.setTimeout(start, 1200)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousOverscroll = document.body.style.overscrollBehavior

    if (!hasEntered) {
      document.body.style.overflow = "hidden"
      document.body.style.overscrollBehavior = "none"
    } else {
      document.body.style.overflow = previousOverflow
      document.body.style.overscrollBehavior = previousOverscroll
    }

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.overscrollBehavior = previousOverscroll
    }
  }, [hasEntered])

  const enterWebsite = () => {
    if (hasEntered) return

    try {
      window.sessionStorage.setItem("cube-intro-entered", "1")
    } catch {
      // The intro still works when storage is unavailable.
    }

    setHasEntered(true)
  }

  return (
    <RoutePathProvider pathname={currentPath}>
      <motion.div
        className="site-reveal"
        aria-hidden={!hasEntered}
        inert={!hasEntered}
        initial={false}
        animate={{
          opacity: hasEntered ? 1 : 0,
          y: hasEntered ? 0 : reduceMotion ? 0 : 22,
        }}
        transition={{
          duration: reduceMotion ? 0.01 : 0.36,
          delay: 0,
          ease: [0.22, 1, 0.36, 1],
        }}
        style={{
          visibility: hasEntered ? "visible" : "hidden",
          pointerEvents: hasEntered ? "auto" : "none",
        }}
      >
        <Suspense fallback={<PageFallback />}>
          {route?.key === "home" && (
            <HomePage
              effectsEnabled={effectsIdle && hasEntered && effectsReady}
            />
          )}
          {route?.key === "about" && <AboutPage />}
          {route?.key === "work" && <WorkPage />}
          {route?.key === "shop" && <ShopPage />}
          {route?.key === "smart-glass" && <SmartGlassPage />}
          {route?.key === "invitations" && <InvitationsPage />}
          {route?.key === "wall" && <WallPlannerPage />}
          {route?.key === "photo" && <PhotoPrintPage />}
          {route?.key === "product" && (
            <ProductDetailPage slug={route.params.slug} />
          )}
          {route?.key === "start-project" && <ProjectBriefPage />}
          {route?.key === "services" && <MovedTo href="/about#sherbimet" />}
          {route?.key === "service" && <ServicePage slug={route.params.slug} />}
          {!route && <NotFoundPage />}
        </Suspense>
      </motion.div>

      <AnimatePresence onExitComplete={() => setEffectsReady(true)}>
        {LANYARD_INTRO_ENABLED && !hasEntered && (
          <motion.div
            className="lanyard-intro"
            role="button"
            tabIndex={0}
            aria-label="Enter the Cube Designers website"
            onClick={reduceMotion ? enterWebsite : undefined}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                enterWebsite()
              }
            }}
            initial={{ opacity: 1 }}
            exit={{
              opacity: 0,
              scale: reduceMotion ? 1 : 1.022,
              filter: reduceMotion ? "blur(0px)" : "blur(5px)",
            }}
            transition={{
              duration: reduceMotion ? 0.01 : 0.3,
              ease: [0.65, 0, 0.35, 1],
            }}
          >
            <div className="lanyard-intro-copy" aria-hidden="true">
              <span>CUBE / ACCESS 001</span>
              <strong>DRAG. PLAY. ENTER.</strong>
              <small>Kliko kartën për me hy</small>
            </div>
            <Suspense fallback={<div className="lanyard-intro-fallback" />}>
              <Lanyard
                onActivate={enterWebsite}
                reducedMotion={Boolean(reduceMotion)}
              />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </RoutePathProvider>
  )
}

export default App

// /sherbime now lives on the About page; servers redirect it too, this covers client-side navigation.
function MovedTo({ href }: { href: string }) {
  useEffect(() => { window.location.replace(href) }, [href])
  return null
}
