import { useEffect, useRef } from "react"
import { ArrowUpRight, Menu } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import Noise from "@/components/Noise"
import RotatingText, {
  type RotatingTextRef,
} from "@/components/RotatingText"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useRoutePath } from "@/app/RouteContext"

const headerTexts = ["CUBE DESIGNERS", "DESIGN", "PRINT", "DIGITAL"]

const navItems = [
  { label: "Shërbimet", href: "/#services" },
  { label: "Puna", href: "/work", path: "/work" },
  { label: "Shop", href: "/shop", path: "/shop" },
  { label: "Rreth nesh", href: "/about", path: "/about" },
  { label: "Roadmap", href: "/roadmap", path: "/roadmap" },
  { label: "Kontakt", href: "/#contact" },
]

type SiteHeaderProps = {
  serviceLabel?: string | null
}

export function SiteNoise() {
  return (
    <div className="site-noise" aria-hidden="true">
      <Noise patternSize={180} patternRefreshInterval={4} patternAlpha={9} />
    </div>
  )
}

export function SiteHeader({ serviceLabel = null }: SiteHeaderProps) {
  const headerTextRef = useRef<RotatingTextRef>(null)
  const currentPath = useRoutePath()

  useEffect(() => {
    const currentText = serviceLabel?.toUpperCase() ?? "CUBE DESIGNERS"
    const textIndex = headerTexts.indexOf(currentText)
    if (textIndex >= 0) headerTextRef.current?.jumpTo(textIndex)
  }, [serviceLabel])

  function openProjectBrief() {
    window.location.assign("/start-project")
  }

  return (
    <header className="agency-header">
      <a
        className="brand brand-light"
        href="/#top"
        aria-label={serviceLabel ?? "CUBE DESIGNERS"}
      >
        <RotatingText
          ref={headerTextRef}
          texts={headerTexts}
          auto={false}
          splitBy="characters"
          animatePresenceMode="wait"
          staggerDuration={0.01}
          staggerFrom="first"
          initial={{ y: "70%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-70%", opacity: 0 }}
          transition={{
            type: "spring",
            damping: 32,
            stiffness: 420,
            mass: 0.7,
          }}
          mainClassName="brand-label"
        />
        <AnimatePresence initial={false}>
          {!serviceLabel && (
            <motion.span
              className="brand-mark"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              ®
            </motion.span>
          )}
        </AnimatePresence>
      </a>

      <nav className="agency-nav" aria-label="Navigimi kryesor">
        {navItems.map((item) => (
          <a
            href={item.href}
            key={item.href}
            aria-current={item.path === currentPath ? "page" : undefined}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <Button className="header-project" size="lg" onClick={openProjectBrief}>
        Nis një projekt
        <ArrowUpRight data-icon="inline-end" />
      </Button>

      <Sheet>
        <SheetTrigger
          render={
            <Button
              className="agency-menu"
              variant="outline"
              size="icon-lg"
              aria-label="Hap menynë"
            />
          }
        >
          <Menu />
        </SheetTrigger>
        <SheetContent className="agency-sheet">
          <SheetHeader>
            <SheetTitle className="sheet-logo">CUBE®</SheetTitle>
            <SheetDescription>
              Design, print & digital — krejt në një vend.
            </SheetDescription>
          </SheetHeader>
          <nav className="sheet-links">
            {navItems.map((item, index) => (
              <SheetClose key={item.href} render={<a href={item.href} />}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {item.label}
                <ArrowUpRight />
              </SheetClose>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  )
}

export function ContactSection() {
  return (
    <section className="closing-cta" id="contact">
      <div className="closing-top">
        <Badge>
          <span />
          Po pranojmë projekte të reja
        </Badge>
        <p>Design · Print · Digital</p>
      </div>

      <a href="/start-project">
        Ke një ide?
        <span>Hajde ta bëjmë të madhe.</span>
        <ArrowUpRight />
      </a>

      <div className="closing-info">
        <div>
          <span>Email</span>
          <a href="mailto:hello@kube.studio">hello@kube.studio</a>
        </div>
        <div>
          <span>Studio</span>
          <p>Suharekë, Kosovë</p>
        </div>
        <div>
          <span>Social</span>
          <p>Instagram · Behance · LinkedIn</p>
        </div>
      </div>
    </section>
  )
}

export function SiteFooter() {
  return (
    <footer className="agency-footer">
      <a className="brand" href="/#top">
        CUBE DESIGNERS<span>®</span>
      </a>
      <p>© 2026 CUBE DESIGNERS</p>
      <a href="#top">Kthehu lart ↑</a>
    </footer>
  )
}
