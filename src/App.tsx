import { lazy, Suspense, useEffect, useLayoutEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import {
  CollaborationProof,
  FaqSection,
  FeaturedWork,
} from "@/components/GrowthSections"
import ScrollFloat from "@/components/ScrollFloat"
import ServiceStory, {
  type StoryGroup,
  type StoryItem,
} from "@/components/ServiceStory"
import {
  ContactSection,
  SiteFooter,
  SiteHeader,
  SiteNoise,
} from "@/components/SiteChrome"
import { matchRoute } from "@/app/routes"
import { RoutePathProvider } from "@/app/RouteContext"
import Lanyard from "@/components/layout/Lanyard"

const PixelBlast = lazy(() => import("@/components/PixelBlast"))
const AboutPage = lazy(() => import("@/components/AboutPage"))
const RoadmapPage = lazy(() => import("@/components/RoadmapPage"))
const WorkPage = lazy(() => import("@/components/WorkPage"))
const ProjectBriefPage = lazy(() => import("@/components/ProjectBriefPage"))
const ShopPage = lazy(() => import("@/components/ShopPage"))
const ProductDetailPage = lazy(
  () => import("@/components/shop/ProductDetailPage"),
)
const NotFoundPage = lazy(() => import("@/components/NotFoundPage"))

const tickerItems = [
  "Brand systems",
  "Print objects",
  "Digital experiences",
  "Creative direction",
  "Campaigns",
]

function PageFallback() {
  return (
    <div className="page-fallback" role="status" aria-label="Duke hapur faqen">
      <span>CUBE DESIGNERS</span>
    </div>
  )
}

const designItems: StoryItem[] = [
  {
    title: "Brand Identity",
    eyebrow: "Strategy / Identity",
    project: "LUMË — Brand System",
    description:
      "Nga pozicionimi te logoja dhe gjuha vizuale: një sistem i qartë që e bën brandin të dallueshëm në çdo pikë kontakti.",
    result: "Një identitet i plotë, jo vetëm një logo.",
    deliverables: [
      "Brand strategy & positioning",
      "Logo suite dhe brand mark",
      "Color, typography & art direction",
      "Brand guidelines",
    ],
  },
  {
    title: "Visual Systems",
    eyebrow: "Creative Direction",
    project: "NOVA — Visual Language",
    description:
      "Sistem modular me tipografi, ngjyra, forma dhe rregulla që i jep ekipit liri pa humbur konsistencën.",
    result: "Brand që duket njësoj i fortë kudo.",
    deliverables: [
      "Visual design system",
      "Layout & composition rules",
      "Iconography and graphic assets",
      "Ready-to-use templates",
    ],
  },
  {
    title: "Packaging",
    eyebrow: "Product / Packaging",
    project: "MALI — Product Family",
    description:
      "Paketim që bie në sy në raft, tregon historinë e produktit dhe funksionon po aq mirë në dorë sa në fotografi.",
    result: "Më shumë vëmendje, më shumë dëshirë.",
    deliverables: [
      "Packaging concept",
      "Dielines and production files",
      "Label system",
      "Product mockups",
    ],
  },
  {
    title: "Editorial",
    eyebrow: "Publication Design",
    project: "FORMA — Annual Review",
    description:
      "Raporte, katalogë dhe publikime me hierarki të fortë, ritëm vizual dhe detaje që e bëjnë leximin eksperiencë.",
    result: "Informacion kompleks, i bërë i bukur.",
    deliverables: [
      "Editorial concept",
      "Grid and typography system",
      "Infographic direction",
      "Print-ready artwork",
    ],
  },
  {
    title: "Campaign Design",
    eyebrow: "Campaign / Art Direction",
    project: "MOVE — Launch Campaign",
    description:
      "Një ide qendrore e kthyer në key visuals dhe formate që funksionojnë nga billboard-i te telefoni.",
    result: "Një kampanjë, shumë momente të forta.",
    deliverables: [
      "Campaign concept",
      "Key visual system",
      "OOH and digital adaptations",
      "Campaign toolkit",
    ],
  },
]

const printItems: StoryItem[] = [
  {
    title: "Business Print",
    eyebrow: "Corporate / Print",
    project: "KUBE — Everyday Essentials",
    description:
      "Kartëvizita, letterhead, folderë dhe materiale zyre të menduara si një eksperiencë e vetme, premium.",
    result: "Detaje të vogla që bëjnë përshtypje të madhe.",
    deliverables: [
      "Business cards",
      "Stationery system",
      "Presentation folders",
      "Production supervision",
    ],
  },
  {
    title: "Packaging & Labels",
    eyebrow: "Print / Packaging",
    project: "BORA — Shelf Presence",
    description:
      "Strukturë, material, finish dhe artwork — gjithçka që duhet që produkti të dallohet para se të hapet.",
    result: "Paketim që shet para se të flasë.",
    deliverables: [
      "Label and packaging artwork",
      "Material consultation",
      "Prepress and color proofing",
      "Supplier coordination",
    ],
  },
  {
    title: "Large Format",
    eyebrow: "Outdoor / Space",
    project: "CITY — Seen From Afar",
    description:
      "Billboards, banera, signage dhe grafika hapësinore me kompozim të optimizuar për distancë dhe lëvizje.",
    result: "Mesazh që lexohet në një sekondë.",
    deliverables: [
      "Billboard and banner design",
      "Window graphics",
      "Wayfinding and signage",
      "Large-format production files",
    ],
  },
  {
    title: "Merch & Apparel",
    eyebrow: "Culture / Merchandise",
    project: "LOCAL — Wear The Idea",
    description:
      "Merch që njerëzit duan ta veshin: nga koncepti grafik te përzgjedhja e materialit dhe teknika e shtypit.",
    result: "Brandi bëhet pjesë e kulturës.",
    deliverables: [
      "Merchandise concepts",
      "Apparel graphics",
      "Embroidery and screen-print files",
      "Vendor-ready specifications",
    ],
  },
  {
    title: "Premium Finishes",
    eyebrow: "Craft / Detail",
    project: "NOIR — Tactile Edition",
    description:
      "Foil, emboss, letterpress dhe paper engineering për materiale që mbahen mend edhe me sy mbyllur.",
    result: "Një eksperiencë që mund ta prekësh.",
    deliverables: [
      "Paper and finish curation",
      "Foil and emboss preparation",
      "Specialty print prototyping",
      "Press-check supervision",
    ],
  },
]

const digitalItems: StoryItem[] = [
  {
    title: "Web Experiences",
    eyebrow: "UX / UI / Development",
    project: "NEXUS — Digital Flagship",
    description:
      "Faqe të shpejta, responsive dhe të dizajnuara rreth një ideje të fortë — nga user flow te micro-interactions.",
    result: "Një website që ndihet po aq mirë sa duket.",
    deliverables: [
      "UX strategy and wireframes",
      "UI design system",
      "Responsive development",
      "Motion and interaction design",
    ],
  },
  {
    title: "Social Content",
    eyebrow: "Content / Social",
    project: "PULSE — Always On",
    description:
      "Një sistem përmbajtjeje me ritëm, formate dhe art direction që e mban brandin aktiv pa u bërë monoton.",
    result: "Feed koherent, përmbajtje që ndalet.",
    deliverables: [
      "Content strategy",
      "Social design system",
      "Monthly content production",
      "Motion templates",
    ],
  },
  {
    title: "Paid Campaigns",
    eyebrow: "Performance / Creative",
    project: "SHIFT — Growth Sprint",
    description:
      "Kreativë të ndërtuara për testim, targetim dhe optimizim — me fokus te rezultati, jo vetëm te reach-i.",
    result: "Creative performance që mëson dhe rritet.",
    deliverables: [
      "Campaign strategy",
      "Ad creative system",
      "A/B testing variants",
      "Performance reporting",
    ],
  },
  {
    title: "Content Production",
    eyebrow: "Photo / Motion / Copy",
    project: "FRAME — Brand Stories",
    description:
      "Fotografi, video, motion dhe copy nën një drejtim të vetëm kreativ për histori që tingëllojnë si brandi yt.",
    result: "Më pak përmbajtje. Më shumë ndikim.",
    deliverables: [
      "Creative concept and scripts",
      "Photo and video production",
      "Motion graphics",
      "Copywriting",
    ],
  },
  {
    title: "E-commerce",
    eyebrow: "Commerce / Conversion",
    project: "SHOP — Frictionless",
    description:
      "Dyqane digjitale me hierarki të qartë, product storytelling dhe një checkout që e bën blerjen të lehtë.",
    result: "Nga browse te buy, pa fërkim.",
    deliverables: [
      "E-commerce UX",
      "Product page system",
      "Shop development",
      "Conversion optimization",
    ],
  },
]

const serviceGroups: StoryGroup[] = [
  {
    id: "design",
    number: "01",
    category: "Design",
    tone: "paper",
    items: designItems,
  },
  {
    id: "print",
    number: "02",
    category: "Print",
    tone: "orange",
    items: printItems,
  },
  {
    id: "digital",
    number: "03",
    category: "Digital",
    tone: "violet",
    items: digitalItems,
  },
]

export function HomePage({ effectsEnabled = true }: { effectsEnabled?: boolean }) {
  const [headerService, setHeaderService] = useState<string | null>(null)

  return (
    <div className="agency-site">
      {effectsEnabled && <SiteNoise />}
      <SiteHeader serviceLabel={headerService} />

      <main>
        <section className="blast-hero" id="top">
          <div className="pixel-layer">
            {effectsEnabled && (
              <Suspense fallback={<div className="pixel-fallback" />}>
                <PixelBlast
                  variant="square"
                  pixelSize={5}
                  color="#F97316"
                  patternScale={2.1}
                  patternDensity={1.05}
                  pixelSizeJitter={0.45}
                  enableRipples
                  rippleIntensityScale={1.35}
                  rippleThickness={0.13}
                  rippleSpeed={0.35}
                  speed={0.6}
                  edgeFade={0.24}
                  transparent
                  antialias
                />
              </Suspense>
            )}
          </div>
          <div className="hero-vignette" />
          <div className="hero-grid" />

          <div className="hero-meta">
            <p>Suharekë · Kosovo </p>
          </div>

          <div className="blast-copy">
            <h1>
              DESIGN.
              <span>PRINT.</span>
              <em>DIGITAL.</em>
            </h1>
          </div>
          <div className="hero-code" aria-hidden="true">
            <span>K/01</span>
            <strong>IDEAS<br />IN MOTION</strong>
          </div>
        </section>

        <div className="motion-ticker-clip">
          <section className="motion-ticker" aria-label="Creative capabilities">
            <div className="ticker-track">
              {[...tickerItems, ...tickerItems].map((item, index) => (
                <span aria-hidden={index >= tickerItems.length} key={`${item}-${index}`}>
                  {item}
                  <i>✦</i>
                </span>
              ))}
            </div>
          </section>
        </div>

        <section className="manifesto">
          <div className="manifesto-display">
            <ScrollFloat
              containerClassName="manifesto-line"
              textClassName="manifesto-line-text"
              animationDuration={1}
              ease="power3.out"
              scrollStart="top bottom-=8%"
              scrollEnd="bottom center+=12%"
              stagger={0.018}
            >
              WE DON’T DECORATE.
            </ScrollFloat>
            <ScrollFloat
              containerClassName="manifesto-line manifesto-line-accent"
              textClassName="manifesto-line-text"
              animationDuration={1}
              ease="power3.out"
              scrollStart="top bottom-=4%"
              scrollEnd="bottom center+=18%"
              stagger={0.018}
            >
              WE BUILD MEANING.
            </ScrollFloat>
          </div>

        </section>

        <section className="studio-principles" aria-label="How we work">
          <article data-index="01">
            <span>01</span>
            <strong>ONE TEAM</strong>
            <p>Strategy, design dhe production në të njëjtin ritëm.</p>
          </article>
          <article data-index="02">
            <span>02</span>
            <strong>ALL FORMATS</strong>
            <p>Nga pixel-i i parë deri te objekti që e mban në dorë.</p>
          </article>
          <article data-index="03">
            <span>03</span>
            <strong>ZERO BORING</strong>
            <p>Ide të qarta, ekzekutim i guximshëm dhe detaje që mbesin.</p>
          </article>
        </section>

        <ServiceStory
          id="services"
          groups={serviceGroups}
          onHeaderLabelChange={setHeaderService}
        />

        <FeaturedWork />
        <CollaborationProof />
        <FaqSection />
        <ContactSection />
      </main>

      <SiteFooter />
    </div>
  )
}

function App({ pathname }: { pathname?: string }) {
  const [hasEntered, setHasEntered] = useState(false)
  const reduceMotion = useReducedMotion()
  const currentPath =
    pathname ??
    (typeof window === "undefined" ? "/" : window.location.pathname)
  const route = matchRoute(currentPath)

  useLayoutEffect(() => {
    if (document.documentElement.dataset.introSeen === "true") {
      setHasEntered(true)
    }
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
      window.scrollTo({ top: 0, behavior: "instant" })
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
          duration: reduceMotion ? 0.01 : 0.56,
          delay: reduceMotion ? 0 : 0.06,
          ease: [0.22, 1, 0.36, 1],
        }}
        style={{
          visibility: hasEntered ? "visible" : "hidden",
          pointerEvents: hasEntered ? "auto" : "none",
        }}
      >
        <Suspense fallback={<PageFallback />}>
          {route?.key === "home" && <HomePage effectsEnabled={hasEntered} />}
          {route?.key === "about" && <AboutPage />}
          {route?.key === "work" && <WorkPage />}
          {route?.key === "roadmap" && <RoadmapPage />}
          {route?.key === "shop" && <ShopPage />}
          {route?.key === "product" && (
            <ProductDetailPage slug={route.params.slug} />
          )}
          {route?.key === "start-project" && <ProjectBriefPage />}
          {!route && <NotFoundPage />}
        </Suspense>
      </motion.div>

      <AnimatePresence>
        {!hasEntered && (
          <motion.div
            className="lanyard-intro"
            role="button"
            tabIndex={0}
            aria-label="Enter the Cube Designers website"
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
              duration: reduceMotion ? 0.01 : 0.48,
              ease: [0.65, 0, 0.35, 1],
            }}
          >
            <Lanyard onActivate={enterWebsite} />
          </motion.div>
        )}
      </AnimatePresence>
    </RoutePathProvider>
  )
}

export default App
