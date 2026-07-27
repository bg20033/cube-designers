import {
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
} from "react"
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  Monitor,
  Palette,
  Printer,
  ShoppingBag,
  Sparkles,
} from "lucide-react"
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react"

type RouteId = "brand" | "print" | "digital" | "commerce"
type RouteFilter = "all" | RouteId

type RouteDefinition = {
  id: RouteId
  label: string
  index: string
  color: string
  icon: ElementType
  path: string
  signalPoints: Array<{ x: number; y: number }>
  mapLabel: string
  mapPosition: CSSProperties
}

type RoadmapMilestone = {
  id: string
  number: string
  title: string
  days: string
  startDay: number
  endDay: number
  checkpoint: number
  statement: string
  activities: string[]
  gate: string
  handoff: string
  team: string
  result: string
  deliverables: Record<RouteId, string[]>
}

const routes: RouteDefinition[] = [
  {
    id: "brand",
    label: "Brand",
    index: "01",
    color: "#7657ff",
    icon: Palette,
    path: "M62 250 C96 250 112 118 148 118 C192 118 224 106 278 106 C366 106 454 118 536 135 C608 150 660 176 709 190 C764 207 802 250 838 250",
    signalPoints: [
      { x: 148, y: 118 },
      { x: 278, y: 106 },
      { x: 536, y: 135 },
      { x: 709, y: 190 },
      { x: 838, y: 250 },
    ],
    mapLabel: "IDENTITET",
    mapPosition: { "--label-x": "21%", "--label-y": "17%" } as CSSProperties,
  },
  {
    id: "print",
    label: "Print",
    index: "02",
    color: "#d5ff3f",
    icon: Printer,
    path: "M62 250 C98 250 112 202 148 202 C192 202 226 194 278 194 C366 194 454 203 536 213 C606 221 660 224 709 226 C764 229 802 250 838 250",
    signalPoints: [
      { x: 148, y: 202 },
      { x: 278, y: 194 },
      { x: 536, y: 213 },
      { x: 709, y: 226 },
      { x: 838, y: 250 },
    ],
    mapLabel: "PRODHIM",
    mapPosition: { "--label-x": "25%", "--label-y": "35%" } as CSSProperties,
  },
  {
    id: "digital",
    label: "Digital",
    index: "03",
    color: "#ff6a16",
    icon: Monitor,
    path: "M62 250 C98 250 112 298 148 298 C192 298 226 306 278 306 C366 306 454 296 536 287 C606 279 660 276 709 274 C764 271 802 250 838 250",
    signalPoints: [
      { x: 148, y: 298 },
      { x: 278, y: 306 },
      { x: 536, y: 287 },
      { x: 709, y: 274 },
      { x: 838, y: 250 },
    ],
    mapLabel: "EKSPERIENCË",
    mapPosition: { "--label-x": "31%", "--label-y": "60%" } as CSSProperties,
  },
  {
    id: "commerce",
    label: "E-commerce",
    index: "04",
    color: "#f4efe4",
    icon: ShoppingBag,
    path: "M62 250 C96 250 112 382 148 382 C192 382 224 394 278 394 C366 394 454 382 536 365 C608 350 660 324 709 310 C764 293 802 250 838 250",
    signalPoints: [
      { x: 148, y: 382 },
      { x: 278, y: 394 },
      { x: 536, y: 365 },
      { x: 709, y: 310 },
      { x: 838, y: 250 },
    ],
    mapLabel: "SHITJE",
    mapPosition: { "--label-x": "23%", "--label-y": "78%" } as CSSProperties,
  },
]

const milestones: RoadmapMilestone[] = [
  {
    id: "kuptojme",
    number: "01",
    title: "Kuptojmë",
    days: "DITA 01—10",
    startDay: 1,
    endDay: 10,
    checkpoint: 10,
    statement:
      "E gjejmë problemin e vërtetë para se të fillojmë me zgjidhjen.",
    activities: [
      "Auditojmë markën, tregun dhe konkurrencën.",
      "Flasim me ekipin dhe i qartësojmë objektivat.",
      "Vendosim prioritetet dhe masat e suksesit.",
      "Dokumentojmë rreziqet, mundësitë dhe kufizimet.",
    ],
    gate: "Brief + scope të aprovuara",
    handoff: "Research → Strategy",
    team: "Strategy · Client lead",
    result: "Një brief i qartë dhe një drejtim ku pajtohet krejt ekipi.",
    deliverables: {
      brand: ["Audit i identitetit", "Harta e perceptimit", "Gap analysis"],
      print: ["Inventar i materialeve", "Kërkesat e prodhimit", "Material matrix"],
      digital: ["Audit i website-it", "Harta e përmbajtjes", "UX friction log"],
      commerce: ["Audit i katalogut", "Rrjedha aktuale e porosisë", "Operations map"],
    },
  },
  {
    id: "definojme",
    number: "02",
    title: "Definojmë",
    days: "DITA 11—25",
    startDay: 11,
    endDay: 25,
    checkpoint: 25,
    statement:
      "Kaosin e kthejmë në një drejtim kreativ dhe komercial që testohet.",
    activities: [
      "Definojmë pozicionimin dhe premtimin e markës.",
      "Ndërtojmë arkitekturën e mesazhit dhe përmbajtjes.",
      "Zgjedhim drejtimin kreativ, kanalet dhe formatet.",
      "Testojmë konceptin para se të hyjë në prodhim.",
    ],
    gate: "Drejtimi kreativ i aprovuar",
    handoff: "Strategy → Creative",
    team: "Strategy · Design",
    result: "Një ide qendrore që i drejton të gjitha vendimet.",
    deliverables: {
      brand: ["Pozicionimi i markës", "Drejtimi verbal e vizual", "Message hierarchy"],
      print: ["Sistemi i formateve", "Plani i materialeve", "Production direction"],
      digital: ["Information architecture", "Wireframes kryesore", "Component scope"],
      commerce: ["Arkitektura e katalogut", "Rruga ideale e checkout-it", "Commerce rules"],
    },
  },
  {
    id: "ndertojme",
    number: "03",
    title: "Ndërtojmë",
    days: "DITA 26—55",
    startDay: 26,
    endDay: 55,
    checkpoint: 55,
    statement:
      "Strategjia bëhet sistem real, i përdorshëm dhe gati për treg.",
    activities: [
      "Dizajnojmë sistemin vizual dhe komponentët.",
      "Prodhojmë asetet fizike dhe digjitale.",
      "Ndërtojmë, lidhim dhe testojmë produktin.",
      "Dokumentojmë sistemin për përdorim të përditshëm.",
    ],
    gate: "System review i kaluar",
    handoff: "Build → Quality assurance",
    team: "Design · Dev · Production",
    result: "Marka nuk është më ide. Është një sistem që punon.",
    deliverables: {
      brand: ["Identiteti final", "Brand guidelines", "Template library"],
      print: ["Paketimi dhe collateral", "Skedarë print-ready", "Production specs"],
      digital: ["UI system dhe website", "Content dhe motion assets", "CMS structure"],
      commerce: ["Produkte, cart dhe checkout", "Pagesa dhe integrimet", "Order automation"],
    },
  },
  {
    id: "lansojme",
    number: "04",
    title: "Lansojmë",
    days: "DITA 56—75",
    startDay: 56,
    endDay: 75,
    checkpoint: 75,
    statement:
      "Çdo pjesë del në publik si një moment i vetëm dhe i koordinuar.",
    activities: [
      "Bëjmë quality assurance në çdo touchpoint.",
      "Koordinojmë prodhimin, deployment-in dhe kampanjën.",
      "Dorëzojmë sistemin dhe e përgatisim ekipin.",
      "Monitorojmë ditët e para dhe reagojmë shpejt.",
    ],
    gate: "Go-live approval",
    handoff: "Launch → Growth",
    team: "QA · Content · Production",
    result: "Një lansim që duket i qëllimshëm në çdo kanal.",
    deliverables: {
      brand: ["Launch toolkit", "Templates për ekipin", "Usage onboarding"],
      print: ["Proof dhe production QA", "Dorëzimi i materialeve", "Supplier handoff"],
      digital: ["Cross-device QA", "Deployment dhe handoff", "Analytics baseline"],
      commerce: ["Test orders dhe payments", "Shop live me shipping", "Operations handoff"],
    },
  },
  {
    id: "permiresojme",
    number: "05",
    title: "Përmirësojmë",
    days: "DITA 76—90",
    startDay: 76,
    endDay: 90,
    checkpoint: 90,
    statement:
      "Të dhënat dhe feedback-u e kthejnë lansimin në sistem për rritje.",
    activities: [
      "Lexojmë feedback-un, analytics dhe sjelljen.",
      "Rregullojmë pikat me ndikimin më të madh.",
      "Definojmë backlog-un dhe ciklin e ardhshëm.",
      "E kthejmë mësimin në standarde të reja të sistemit.",
    ],
    gate: "90-day review",
    handoff: "Insights → Next sprint",
    team: "Growth · Client team",
    result: "Një sistem që mëson, përmirësohet dhe rritet.",
    deliverables: {
      brand: ["Brand governance", "Prioritetet e komunikimit", "Template update plan"],
      print: ["Sistemi i porosive të reja", "Specifikat e furnitorëve", "Stock priorities"],
      digital: ["Performance improvements", "Roadmap i përmbajtjes", "SEO + accessibility backlog"],
      commerce: ["Conversion improvements", "Backlog i rritjes", "Retention test plan"],
    },
  },
]

const nodePositions = [16.45, 30.9, 59.55, 78.75, 93.1]
const phaseGeometry = [
  { x: 62, width: 86 },
  { x: 148, width: 130 },
  { x: 278, width: 258 },
  { x: 536, width: 173 },
  { x: 709, width: 129 },
]

function RouteFilters({
  activeRoute,
  onChange,
  className = "",
}: {
  activeRoute: RouteFilter
  onChange: (route: RouteFilter) => void
  className?: string
}) {
  return (
    <div
      className={`rm2-route-filters ${className}`}
      aria-label="Filtro roadmap-in sipas shërbimit"
    >
      <button
        className={activeRoute === "all" ? "is-active" : ""}
        type="button"
        aria-pressed={activeRoute === "all"}
        onClick={() => onChange("all")}
      >
        <span>00</span>
        Të gjitha
      </button>
      {routes.map((route) => {
        const Icon = route.icon
        return (
          <button
            className={activeRoute === route.id ? "is-active" : ""}
            style={{ "--route-color": route.color } as CSSProperties}
            type="button"
            aria-pressed={activeRoute === route.id}
            onClick={() => onChange(route.id)}
            key={route.id}
          >
            <Icon aria-hidden="true" />
            {route.label}
          </button>
        )
      })}
    </div>
  )
}

function PhaseDetails({
  milestone,
  activeRoute,
  mobile = false,
}: {
  milestone: RoadmapMilestone
  activeRoute: RouteFilter
  mobile?: boolean
}) {
  const visibleRoutes =
    activeRoute === "all"
      ? routes
      : routes.filter((route) => route.id === activeRoute)

  return (
    <article className={mobile ? "rm2-mobile-card" : "rm2-inspector-card"}>
      <header className="rm2-card-header">
        <div>
          <span>FAZA {milestone.number} / 05</span>
          <strong>{milestone.days}</strong>
        </div>
        <b>{String(milestone.checkpoint).padStart(2, "0")}</b>
      </header>

      <div className="rm2-card-intro">
        <h2>{milestone.title}</h2>
        <p>{milestone.statement}</p>
      </div>

      <div className="rm2-card-section">
        <span>ÇKA BËJMË</span>
        <ol>
          {milestone.activities.map((activity, index) => (
            <li key={activity}>
              <small>{String(index + 1).padStart(2, "0")}</small>
              <p>{activity}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="rm2-card-gates">
        <div>
          <span>DECISION GATE</span>
          <strong>{milestone.gate}</strong>
        </div>
        <div>
          <span>HANDOFF</span>
          <strong>{milestone.handoff}</strong>
        </div>
        <div>
          <span>CORE TEAM</span>
          <strong>{milestone.team}</strong>
        </div>
      </div>

      <div className="rm2-card-section rm2-card-outputs">
        <span>
          {activeRoute === "all"
            ? "OUTPUTS NË KATËR ROUTES"
            : `OUTPUTS / ${visibleRoutes[0].label.toUpperCase()}`}
        </span>
        <div>
          {visibleRoutes.map((route) => (
            <section
              style={{ "--route-color": route.color } as CSSProperties}
              key={route.id}
            >
              <strong>{route.label}</strong>
              <ul>
                {milestone.deliverables[route.id].map((deliverable) => (
                  <li key={deliverable}>
                    <Check aria-hidden="true" />
                    {deliverable}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      <footer className="rm2-card-result">
        <Sparkles aria-hidden="true" />
        <div>
          <span>REZULTATI</span>
          <strong>{milestone.result}</strong>
        </div>
      </footer>
    </article>
  )
}

function SignalMap({
  activeRoute,
  activePhase,
  lineProgress,
  scanPosition,
  reduceMotion,
  onNodeClick,
}: {
  activeRoute: RouteFilter
  activePhase: number
  lineProgress: MotionValue<number>
  scanPosition: MotionValue<string>
  reduceMotion: boolean | null
  onNodeClick: (index: number) => void
}) {
  return (
    <div className="rm2-map-shell">
      <div className="rm2-map-copy">
        <span>90 DITË / NJË SISTEM I LIDHUR</span>
        <h1>
          NGA IDEJA
          <em>TE SIGNALI.</em>
        </h1>
        <p>
          Katër routes punojnë paralelisht dhe bashkohen në një sistem që është
          gati për treg.
        </p>
      </div>

      <div className="rm2-map-canvas">
        <div className="rm2-map-grid" aria-hidden="true" />
        <motion.div
          className="rm2-map-scan"
          style={reduceMotion ? { left: `${nodePositions[activePhase]}%` } : { left: scanPosition }}
          aria-hidden="true"
        />

        <svg
          className="rm2-map-routes"
          viewBox="0 0 900 500"
          role="img"
          aria-labelledby="rm2-map-title rm2-map-description"
          preserveAspectRatio="none"
        >
          <title id="rm2-map-title">Harta e transformimit 90-ditor</title>
          <desc id="rm2-map-description">
            Brand, Print, Digital dhe E-commerce ndahen pas auditit dhe
            bashkohen përsëri në ditën 90.
          </desc>

          <g className="rm2-phase-zones" aria-hidden="true">
            {phaseGeometry.map((phase, index) => (
              <g
                className={[
                  activePhase === index ? "is-active" : "",
                  activePhase > index ? "is-complete" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={milestones[index].id}
              >
                <rect
                  x={phase.x}
                  y="34"
                  width={phase.width}
                  height="412"
                />
                <line
                  x1={phase.x + phase.width}
                  y1="34"
                  x2={phase.x + phase.width}
                  y2="446"
                />
              </g>
            ))}
          </g>

          <path
            className="rm2-map-spine"
            d="M62 250 H838"
            pathLength="1"
          />
          {routes.map((route) => {
            const muted = activeRoute !== "all" && activeRoute !== route.id
            return (
              <g
                className={muted ? "is-muted" : ""}
                style={{ "--route-color": route.color } as CSSProperties}
                key={route.id}
              >
                <path className="rm2-route-base" d={route.path} />
                <motion.path
                  className="rm2-route-progress"
                  d={route.path}
                  pathLength="1"
                  style={{ pathLength: reduceMotion ? 1 : lineProgress }}
                />
              </g>
            )
          })}
        </svg>

        <div className="rm2-route-markers" aria-hidden="true">
          {routes.map((route) => {
            const muted = activeRoute !== "all" && activeRoute !== route.id
            return route.signalPoints.map((point, index) => (
              <i
                className={[
                  index <= activePhase ? "is-complete" : "",
                  muted ? "is-muted" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={
                  {
                    "--point-x": `${(point.x / 9).toFixed(3)}%`,
                    "--point-y": `${(point.y / 5).toFixed(3)}%`,
                    "--route-color": route.color,
                  } as CSSProperties
                }
                key={`${route.id}-${index}`}
              />
            ))
          })}
        </div>

        <div className="rm2-phase-status" aria-hidden="true">
          {milestones.map((milestone, index) => (
            <div
              className={[
                activePhase === index ? "is-active" : "",
                activePhase > index ? "is-complete" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={milestone.id}
            >
              <span>{milestone.number}</span>
              <strong>
                {String(milestone.startDay).padStart(2, "0")}—
                {String(milestone.endDay).padStart(2, "0")}
              </strong>
            </div>
          ))}
        </div>

        <div className="rm2-map-origin" aria-hidden="true">
          <span>DITA</span>
          <strong>00</strong>
        </div>

        <div className="rm2-map-end" aria-hidden="true">
          <strong>90</strong>
          <span>LIVE</span>
        </div>

        {routes.map((route) => (
          <div
            className={`rm2-map-route-label ${
              activeRoute !== "all" && activeRoute !== route.id
                ? "is-muted"
                : ""
            }`}
            style={
              {
                ...route.mapPosition,
                "--route-color": route.color,
              } as CSSProperties
            }
            key={route.id}
            aria-hidden="true"
          >
            <i />
            {route.mapLabel}
          </div>
        ))}

        <div className="rm2-map-nodes">
          {milestones.map((milestone, index) => (
            <button
              className={activePhase === index ? "is-active" : ""}
              style={{ "--node-x": `${nodePositions[index]}%` } as CSSProperties}
              type="button"
              aria-label={`Shko te ${milestone.title}, ${milestone.days}`}
              aria-pressed={activePhase === index}
              onClick={() => onNodeClick(index)}
              key={milestone.id}
            >
              <i />
              <span>{String(milestone.checkpoint).padStart(2, "0")}</span>
              <small>{milestone.title}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="rm2-map-help">
        <ArrowDown aria-hidden="true" />
        <span>SCROLL PËR TA AKTIVIZUAR HARTËN</span>
      </div>
    </div>
  )
}

export default function RoadmapView() {
  const journeyRef = useRef<HTMLElement>(null)
  const [activeRoute, setActiveRoute] = useState<RouteFilter>("all")
  const [activePhase, setActivePhase] = useState(0)
  const [currentDay, setCurrentDay] = useState(0)
  const reduceMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: journeyRef,
    offset: ["start start", "end end"],
  })
  const storyProgress = useTransform(
    scrollYProgress,
    [0, 0.9],
    [0, 1],
  )
  const smoothProgress = useSpring(storyProgress, {
    stiffness: 120,
    damping: 26,
    mass: 0.35,
  })
  const lineProgress = useTransform(
    storyProgress,
    [0, 0.96],
    [0, 1],
  )
  const scanPosition = useTransform(
    smoothProgress,
    [0, 1],
    ["6.9%", "93.1%"],
  )

  useMotionValueEvent(storyProgress, "change", (value) => {
    const nextPhase = Math.min(
      milestones.length - 1,
      Math.max(0, Math.floor(value * milestones.length)),
    )
    setActivePhase(nextPhase)
    setCurrentDay(
      reduceMotion
        ? milestones[nextPhase].endDay
        : Math.min(90, Math.max(0, Math.round(value * 90))),
    )
  })

  const scrollToPhase = (index: number) => {
    const journey = journeyRef.current
    if (!journey) return

    const journeyTop = window.scrollY + journey.getBoundingClientRect().top
    const journeyDistance = Math.max(0, journey.offsetHeight - window.innerHeight)
    const storyTarget = milestones[index].endDay / 90
    const rawTarget = storyTarget * 0.9

    window.scrollTo({
      top: journeyTop + journeyDistance * rawTarget,
      behavior: reduceMotion ? "auto" : "smooth",
    })
  }

  return (
    <section className="rm2-roadmap">
      <section className="rm2-journey" ref={journeyRef}>
        <div className="rm2-sticky-stage">
          <div className="rm2-stage-topbar">
            <div>
              <span>CUBE / ROADMAP</span>
              <strong>TRANSFORMIMI 90-DITOR</strong>
            </div>
            <RouteFilters
              activeRoute={activeRoute}
              onChange={setActiveRoute}
            />
            <div className="rm2-live-day" aria-live="polite">
              <span>DITA</span>
              <strong>{String(currentDay).padStart(2, "0")}</strong>
              <i>
                <motion.b
                  style={{
                    scaleX: reduceMotion
                      ? milestones[activePhase].endDay / 90
                      : lineProgress,
                  }}
                />
              </i>
              <small>90</small>
            </div>
          </div>

          <div className="rm2-stage-workspace">
            <SignalMap
              activeRoute={activeRoute}
              activePhase={activePhase}
              lineProgress={lineProgress}
              scanPosition={scanPosition}
              reduceMotion={reduceMotion}
              onNodeClick={scrollToPhase}
            />

            <aside className="rm2-inspector" aria-live="polite">
              <div className="rm2-inspector-label">
                <span>LIVE INSPECTOR</span>
                <i />
                <strong>
                  {activeRoute === "all"
                    ? "SISTEMI I PLOTË"
                    : routes.find((route) => route.id === activeRoute)?.label}
                </strong>
              </div>
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={`${activePhase}-${activeRoute}`}
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                >
                  <PhaseDetails
                    milestone={milestones[activePhase]}
                    activeRoute={activeRoute}
                  />
                </motion.div>
              </AnimatePresence>
            </aside>
          </div>
        </div>

        <div className="rm2-scroll-track" aria-hidden="true">
          {milestones.map((milestone, index) => (
            <div id={`rm2-step-${index}`} key={milestone.id} />
          ))}
        </div>

        <div className="rm2-mobile-journey">
          <header>
            <span>CUBE / ROADMAP</span>
            <h1>
              NGA IDEJA
              <em>TE SIGNALI.</em>
            </h1>
            <p>
              90 ditë. Katër routes. Një sistem i lidhur dhe gati për treg.
            </p>
          </header>
          <RouteFilters
            className="rm2-mobile-filters"
            activeRoute={activeRoute}
            onChange={setActiveRoute}
          />
          <div className="rm2-mobile-line" aria-hidden="true" />
          <div className="rm2-mobile-cards">
            {milestones.map((milestone) => (
              <PhaseDetails
                milestone={milestone}
                activeRoute={activeRoute}
                mobile
                key={milestone.id}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="rm2-system-reveal">
        <header>
          <span>DITA 00 / DITA 90</span>
          <h2>
            PJESËT NUK RRINË MË
            <em>TË SHKËPUTURA.</em>
          </h2>
          <p>
            Në ditën 90 çdo pikë kontakti e vazhdon të njëjtën ide — nga logoja
            te paketimi, website-i dhe porosia.
          </p>
        </header>

        <div className="rm2-system-comparison">
          <article className="rm2-fragmented">
            <div className="rm2-system-meta">
              <span>GJENDJA</span>
              <strong>DITA 00</strong>
            </div>
            <div className="rm2-fragment-field" aria-label="Sistem i fragmentuar">
              {routes.map((route, index) => (
                <div
                  className={
                    activeRoute !== "all" && activeRoute !== route.id
                      ? "is-muted"
                      : ""
                  }
                  style={
                    {
                      "--route-color": route.color,
                      "--fragment-index": index,
                    } as CSSProperties
                  }
                  key={route.id}
                >
                  <span>{route.index}</span>
                  <strong>{route.label}</strong>
                </div>
              ))}
            </div>
            <p>Katër drejtime. Katër gjuhë. Asnjë sistem.</p>
          </article>

          <article className="rm2-connected">
            <div className="rm2-system-meta">
              <span>REZULTATI</span>
              <strong>DITA 90</strong>
            </div>
            <div className="rm2-connected-field" aria-label="Sistem i lidhur">
              <div className="rm2-connection-lines" aria-hidden="true" />
              {routes.map((route) => (
                <div
                  className={
                    activeRoute !== "all" && activeRoute !== route.id
                      ? "is-muted"
                      : ""
                  }
                  style={{ "--route-color": route.color } as CSSProperties}
                  key={route.id}
                >
                  <span>{route.index}</span>
                  <strong>{route.label}</strong>
                  <i />
                </div>
              ))}
              <b>CUBE</b>
            </div>
            <p>Një signal. Një sistem. Gati për rritje.</p>
          </article>
        </div>
      </section>

      <section className="rm2-final-cta">
        <div>
          <Sparkles aria-hidden="true" />
          <span>DITA E PARË FILLON KËTU</span>
        </div>
        <a href="/start-project">
          NIS TRANSFORMIMIN
          <ArrowUpRight aria-hidden="true" />
        </a>
        <p>Brand. Print. Digital. E-commerce. Një ekip për krejt sistemin.</p>
      </section>
    </section>
  )
}
