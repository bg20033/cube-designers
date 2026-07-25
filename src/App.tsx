import {
  ArrowRight,
  ArrowUpRight,
  Asterisk,
  Menu,
  Monitor,
  MousePointer2,
  Palette,
  PenTool,
  Printer,
  Sparkles,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

const navItems = [
  { label: "Design", href: "#design" },
  { label: "Creative", href: "#creative" },
  { label: "Digital", href: "#digital" },
  { label: "Marketing", href: "#marketing" },
  { label: "Services", href: "#services" },
]

const services = [
  {
    number: "01",
    title: "Brand identity",
    description: "Strategji, emërtim, logo dhe sistem vizual që punon kudo.",
    icon: Palette,
  },
  {
    number: "02",
    title: "Print & packaging",
    description: "Nga kartëvizita te paketimi — detaje që mund t’i prekësh.",
    icon: Printer,
  },
  {
    number: "03",
    title: "Creative campaigns",
    description: "Ide të mëdha, art direction dhe përmbajtje që lëviz njerëzit.",
    icon: Sparkles,
  },
  {
    number: "04",
    title: "Web & digital",
    description: "Faqe dhe eksperienca digjitale të shpejta, të qarta, të bukura.",
    icon: Monitor,
  },
  {
    number: "05",
    title: "Social media",
    description: "Sistem përmbajtjeje, dizajn dhe menaxhim me ritëm konstant.",
    icon: MousePointer2,
  },
  {
    number: "06",
    title: "Digital marketing",
    description: "Fushata me targetim, optimizim dhe matje reale të rezultateve.",
    icon: PenTool,
  },
]

function scrollToContact() {
  document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" })
}

function App() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Kube Studio - Ballina">
          KUBE<span>®</span>
        </a>

        <nav className="desktop-nav" aria-label="Navigimi kryesor">
          {navItems.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <Button className="header-cta" size="lg" onClick={scrollToContact}>
          Nis një projekt
          <ArrowUpRight data-icon="inline-end" />
        </Button>

        <Sheet>
          <SheetTrigger
            render={
              <Button
                className="mobile-menu"
                variant="outline"
                size="icon-lg"
                aria-label="Hap menynë"
              />
            }
          >
            <Menu />
          </SheetTrigger>
          <SheetContent className="mobile-sheet">
            <SheetHeader>
              <SheetTitle className="sheet-brand">KUBE®</SheetTitle>
              <SheetDescription>
                Studio kreative për brende që duan të dallohen.
              </SheetDescription>
            </SheetHeader>
            <nav className="mobile-nav" aria-label="Navigimi mobil">
              {navItems.map((item, index) => (
                <SheetClose key={item.href} render={<a href={item.href} />}>
                  <span>0{index + 1}</span>
                  {item.label}
                  <ArrowUpRight />
                </SheetClose>
              ))}
            </nav>
            <div className="sheet-contact">
              <p>Ke një ide në mendje?</p>
              <a href="mailto:hello@kube.studio">hello@kube.studio</a>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <main>
        <section className="hero" id="top">
          <div className="hero-copy">
            <Badge className="eyebrow-badge" variant="outline">
              <span className="status-dot" />
              Creative agency · Prishtinë
            </Badge>

            <h1>
              Ide që s’mund
              <span className="hero-line">
                t’i <em>injorosh.</em>
              </span>
            </h1>

            <div className="hero-bottom">
              <p>
                Ne krijojmë identitete, kampanja dhe eksperienca digjitale që
                e bëjnë brandin tënd të duket, të ndihet dhe të mbahet mend.
              </p>
              <div className="hero-actions">
                <Button
                  className="primary-cta"
                  size="lg"
                  onClick={scrollToContact}
                >
                  Le të krijojmë
                  <ArrowRight data-icon="inline-end" />
                </Button>
                <Button
                  className="text-cta"
                  variant="ghost"
                  size="lg"
                  onClick={() =>
                    document
                      .querySelector("#design")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Shiko çka bëjmë
                </Button>
              </div>
            </div>
          </div>

          <div className="hero-art" aria-label="Kompozim grafik i Kube Studio">
            <div className="art-grid" />
            <div className="art-sticker sticker-one">
              <Asterisk />
              <span>THINK</span>
              <strong>LOUD.</strong>
            </div>
            <div className="art-sticker sticker-two">
              <span>Creative</span>
              <span>Design</span>
              <span>Digital</span>
            </div>
            <div className="art-orbit">
              <span>K</span>
            </div>
            <div className="art-caption">
              <span>Independent creative studio</span>
              <span>42.6629° N</span>
            </div>
          </div>

          <div className="hero-ticker" aria-hidden="true">
            <span>DESIGN</span>
            <Asterisk />
            <span>PRINT</span>
            <Asterisk />
            <span>DIGITAL</span>
            <Asterisk />
            <span>MARKETING</span>
            <Asterisk />
          </div>
        </section>

        <section className="section design-section" id="design">
          <div className="section-kicker">
            <span>01</span>
            <p>Design & Print</p>
          </div>

          <div className="section-heading">
            <h2>
              Identitet që duket mirë.
              <br />
              <em>Sistem që punon fort.</em>
            </h2>
            <p>
              Nuk bëjmë vetëm logo. Ndërtojmë një gjuhë të plotë vizuale — nga
              ideja e parë deri te detaji i fundit në print.
            </p>
          </div>

          <div className="design-showcase">
            <Card className="identity-card">
              <CardHeader>
                <Badge variant="secondary">BRAND SYSTEM / 2026</Badge>
                <CardTitle>Një brand, çdo pikë kontakti.</CardTitle>
                <CardDescription>
                  Strategji · Logo · Tipografi · Ngjyra · Brand guidelines
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="identity-visual">
                  <div className="identity-mark">K</div>
                  <div className="color-stack">
                    <span />
                    <span />
                    <span />
                  </div>
                  <p>BUILT TO BE SEEN®</p>
                </div>
              </CardContent>
            </Card>

            <Card className="print-card">
              <CardHeader>
                <Printer />
                <Badge variant="outline">INK ON PAPER</Badge>
              </CardHeader>
              <CardContent>
                <div className="paper-stack">
                  <div className="paper paper-back">KUBE / 02</div>
                  <div className="paper paper-front">
                    <span>MAKE</span>
                    <strong>IT REAL.</strong>
                    <small>Premium print & packaging</small>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="section creative-section" id="creative">
          <div className="creative-noise" />
          <div className="section-kicker light">
            <span>02</span>
            <p>Creative</p>
          </div>

          <div className="creative-grid">
            <div className="creative-title">
              <Badge className="creative-badge">IDEA FIRST</Badge>
              <h2>
                Të bukurën
                <br />
                e bëjmë <em>të guximshme.</em>
              </h2>
            </div>

            <div className="creative-copy">
              <p>
                Koncepte që kanë arsye të ekzistojnë. Art direction që ndalet
                në feed. Copy që tingëllon si brandi yt — jo si të gjithë.
              </p>
              <ul>
                <li>
                  <span>01</span>Creative direction
                </li>
                <li>
                  <span>02</span>Campaign concepts
                </li>
                <li>
                  <span>03</span>Content production
                </li>
                <li>
                  <span>04</span>Copywriting
                </li>
              </ul>
            </div>
          </div>

          <div className="creative-marquee" aria-hidden="true">
            <span>WEIRD IS GOOD</span>
            <Sparkles />
            <span>SAFE IS BORING</span>
            <Sparkles />
            <span>IDEAS MOVE PEOPLE</span>
          </div>
        </section>

        <section className="section digital-section" id="digital">
          <div className="section-kicker">
            <span>03</span>
            <p>Digital</p>
          </div>

          <div className="digital-intro">
            <h2>
              Digital, por
              <br />
              <em>shumë njerëzor.</em>
            </h2>
            <div>
              <p>
                Eksperienca digjitale që janë të thjeshta për t’u përdorur dhe
                të vështira për t’u harruar.
              </p>
              <Button variant="outline" size="lg" onClick={scrollToContact}>
                Fol me ekipin
                <ArrowUpRight data-icon="inline-end" />
              </Button>
            </div>
          </div>

          <div className="browser-card">
            <div className="browser-top">
              <div>
                <span />
                <span />
                <span />
              </div>
              <p>kube.studio/work</p>
              <ArrowUpRight />
            </div>
            <div className="browser-content">
              <Badge>LIVE EXPERIENCE</Badge>
              <h3>Great design gets a reaction.</h3>
              <div className="browser-shape">
                <span>CLICK</span>
                <ArrowUpRight />
              </div>
              <div className="browser-meta">
                <p>Strategy + UX/UI + Development</p>
                <p>Scroll to explore ↓</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section marketing-section" id="marketing">
          <div className="section-kicker">
            <span>04</span>
            <p>Marketing</p>
          </div>

          <div className="marketing-grid">
            <div>
              <Badge className="black-badge">GROW WITH INTENT</Badge>
              <h2>
                Jo vetëm likes.
                <br />
                <em>Rezultate.</em>
              </h2>
            </div>

            <div className="marketing-panel">
              <div className="metric">
                <span>Reach</span>
                <strong>2.4M</strong>
                <Badge>+84%</Badge>
              </div>
              <Separator />
              <div className="metric">
                <span>ROAS</span>
                <strong>4.8×</strong>
                <Badge>+31%</Badge>
              </div>
              <Separator />
              <p>
                Strategji, performance marketing dhe përmbajtje që kthen
                vëmendjen në veprim.
              </p>
            </div>
          </div>
        </section>

        <section className="section services-section" id="services">
          <div className="section-kicker">
            <span>05</span>
            <p>Services</p>
          </div>

          <div className="services-heading">
            <h2>Gjithçka që i duhet një brandi për të ecur përpara.</h2>
            <p>
              Ekip kompakt, ide të mëdha dhe një proces i qartë nga brief-i te
              rezultati.
            </p>
          </div>

          <div className="services-grid">
            {services.map((service) => {
              const Icon = service.icon
              return (
                <Card className="service-card" key={service.number}>
                  <CardHeader>
                    <span className="service-number">{service.number}</span>
                    <Icon />
                    <CardTitle>{service.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{service.description}</p>
                    <ArrowUpRight />
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        <section className="contact-section" id="contact">
          <div className="contact-top">
            <Badge className="contact-badge">
              <span className="status-dot" />
              Po pranojmë projekte të reja
            </Badge>
            <p>Ke diçka në mendje?</p>
          </div>

          <a className="contact-link" href="mailto:hello@kube.studio">
            Le ta bëjmë
            <br />
            <em>realitet.</em>
            <ArrowUpRight />
          </a>

          <div className="contact-details">
            <div>
              <span>Email</span>
              <a href="mailto:hello@kube.studio">hello@kube.studio</a>
            </div>
            <div>
              <span>Na gjen</span>
              <p>Prishtinë, Kosovë</p>
            </div>
            <div>
              <span>Social</span>
              <div>
                <a href="#top">Instagram</a>
                <a href="#top">LinkedIn</a>
                <a href="#top">Behance</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <a className="brand footer-brand" href="#top">
          KUBE<span>®</span>
        </a>
        <p>Creative studio — Design, print & digital.</p>
        <p>© 2026 Kube Studio</p>
      </footer>
    </div>
  )
}

export default App
