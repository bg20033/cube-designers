import { lazy, Suspense, useState } from "react"

import {
  CollaborationProof,
  FeaturedWork,
} from "@/components/GrowthSections"
import ServiceStory, {
  type StoryGroup,
  type StoryItem,
} from "@/components/ServiceStory"
import {
  SiteHeader,
  SiteNoise,
} from "@/components/SiteChrome"
import DareContact from "@/components/DareContact"

const PixelBlast = lazy(() => import("@/components/PixelBlast"))

const tickerItems = [
  "Brand systems",
  "Print objects",
  "Digital experiences",
  "Creative direction",
  "Campaigns",
]

const designItems: StoryItem[] = [
  {
    title: "Brand Identity",
    eyebrow: "Strategy / Identity",
    project: "LUMË — Brand System",
    image: "sermova-brand-system",
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
    image: "altec-brand-system",
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
    image: "shop-menu",
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
    image: "shop-catalog",
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
    image: "shop-flyer",
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
    image: "shop-business-cards",
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
    image: "shop-stickers",
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
    image: "shop-rollup",
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
    image: "shop-apparel-kit",
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
    image: "sermova-logo-paper",
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
    image: "altec-office-sign",
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
    image: "sermova-brand-system",
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
    image: "shop-flyer",
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
    image: "production-detail",
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
    image: "shop-notebook",
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

export default function HomePage({ effectsEnabled = true }: { effectsEnabled?: boolean }) {
  const [headerService, setHeaderService] = useState<string | null>(null)

  return (
    <div className="agency-site">
      {effectsEnabled && <SiteNoise />}
      <SiteHeader serviceLabel={headerService} />

      <main>
        <section className="blast-hero" id="top">
          <div className="pixel-layer">
            {effectsEnabled ? (
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
            ) : (
              <div className="pixel-fallback" />
            )}
          </div>
          <div className="hero-vignette" />
          <div className="hero-grid" />

          <div className="hero-meta">
            <p>Suharekë · Kosovo </p>
          </div>

          <div className="blast-copy">
            <h1>
              <small className="hero-kicker">
                Agjenci kreative në Suharekë · Branding, print & marketing digjital
              </small>
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
        <DareContact />
      </main>
    </div>
  )
}
