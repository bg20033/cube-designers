import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react"
import { ArrowRight, ArrowUpRight, Check, MoveDown } from "lucide-react"
import { motion, MotionConfig, useReducedMotion } from "motion/react"

import OptionWheel from "@/components/OptionWheel"
import { getPortfolioImage, ResponsiveImage } from "@/components/ResponsiveImage"
import wheelSound from "@/assets/2222.wav"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export type StoryItem = {
  title: string
  eyebrow: string
  project: string
  image: string
  description: string
  result: string
  deliverables: string[]
}

export type StoryGroup = {
  id: string
  number: string
  category: string
  tone: "paper" | "orange" | "violet"
  items: StoryItem[]
}

type ServiceStoryProps = {
  id: string
  groups: StoryGroup[]
  onHeaderLabelChange?: (label: string | null) => void
}

const toneColors: Record<
  StoryGroup["tone"],
  { backgroundColor: string; color: string }
> = {
  paper: { backgroundColor: "#f5f1e7", color: "#0b0b0d" },
  orange: { backgroundColor: "#f97316", color: "#ffffff" },
  violet: { backgroundColor: "#6d52ff", color: "#ffffff" },
}

const scrollStepSvh = 17

// Card swaps animate only opacity and transform: a blur filter on this large
// image layer cost a full repaint every frame.
const cardMotionVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction < 0 ? -16 : 16 }),
  active: { opacity: 1, x: 0 },
}

export default function ServiceStory({
  id,
  groups,
  onHeaderLabelChange,
}: ServiceStoryProps) {
  const reduceMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const sectionActiveRef = useRef(false)
  const onHeaderLabelChangeRef = useRef(onHeaderLabelChange)
  const manualSelectionRef = useRef<{
    active: boolean
    scrollY: number
    until: number
  }>({
    active: false,
    scrollY: 0,
    until: 0,
  })
  const [activeIndex, setActiveIndex] = useState(0)
  const variants = cardMotionVariants
  const previousIndexRef = useRef(activeIndex)
  const cardDirection =
    activeIndex >= previousIndexRef.current ? 1 : -1
  const entries = useMemo(
    () =>
      groups.flatMap((group) =>
        group.items.map((item) => ({
          item,
          group,
        })),
      ),
    [groups],
  )
  const wheelItems = useMemo(() => entries.map(({ item }) => item.title), [entries])
  const activeEntry = entries[activeIndex] ?? entries[0]
  const activeItem = activeEntry.item
  const activeGroup = activeEntry.group
  const activeCategoryRef = useRef(activeGroup.category)

  activeCategoryRef.current = activeGroup.category
  onHeaderLabelChangeRef.current = onHeaderLabelChange

  useEffect(() => {
    if (sectionActiveRef.current) {
      onHeaderLabelChangeRef.current?.(activeGroup.category)
    }
  }, [activeGroup.category])

  useEffect(() => {
    previousIndexRef.current = activeIndex
    // Warm the next and previous card images so a swap never waits on the network.
    for (const index of [activeIndex + 1, activeIndex - 1]) {
      const entry = entries[index]
      if (!entry) continue
      const image = typeof entry.item.image === "string" ? getPortfolioImage(entry.item.image) : entry.item.image
      const preload = new Image()
      preload.decoding = "async"
      preload.sizes = "(max-width: 820px) 100vw, 56vw"
      preload.srcset = image.variants.map((variant) => `${variant.src} ${variant.width}w`).join(", ")
    }
  }, [activeIndex, entries])

  useEffect(() => {
    let frame = 0
    // Section geometry is measured only when layout changes. Reading
    // getBoundingClientRect on every scroll frame forced a synchronous
    // style + layout pass right after the wheel had written new styles.
    const geometry = { top: 0, height: 0, viewport: window.innerHeight }

    const measure = () => {
      const section = sectionRef.current
      if (!section) return
      geometry.top = section.getBoundingClientRect().top + window.scrollY
      geometry.height = section.offsetHeight
      geometry.viewport = window.innerHeight
    }

    const updateFromScroll = () => {
      frame = 0
      if (!sectionRef.current) return

      const rectTop = geometry.top - window.scrollY
      const rect = { top: rectTop, bottom: rectTop + geometry.height }
      const sectionIsActive = rect.top <= 76 && rect.bottom > 76

      if (sectionActiveRef.current !== sectionIsActive) {
        sectionActiveRef.current = sectionIsActive
        onHeaderLabelChangeRef.current?.(
          sectionIsActive ? activeCategoryRef.current : null,
        )
      }

      if (manualSelectionRef.current.active) {
        if (performance.now() < manualSelectionRef.current.until) return
        const moved = Math.abs(
          window.scrollY - manualSelectionRef.current.scrollY,
        )
        if (moved < 32) return
        manualSelectionRef.current.active = false
      }

      const travel = Math.max(geometry.height - geometry.viewport, 1)
      const progress = Math.min(Math.max(-rect.top / travel, 0), 1)
      const next = Math.min(
        entries.length - 1,
        Math.floor(progress * entries.length),
      )
      setActiveIndex((current) => (current === next ? current : next))
    }

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(updateFromScroll)
    }

    const onLayoutChange = () => {
      measure()
      onScroll()
    }
    // Content above (images, fonts) can shift the section after mount.
    const resizeObserver = new ResizeObserver(onLayoutChange)
    resizeObserver.observe(document.documentElement)

    measure()
    updateFromScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onLayoutChange)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onLayoutChange)
      if (frame) cancelAnimationFrame(frame)
      if (sectionActiveRef.current) {
        sectionActiveRef.current = false
        onHeaderLabelChangeRef.current?.(null)
      }
    }
  }, [entries.length])

  return (
    <MotionConfig reducedMotion="user">
      <motion.section
        ref={sectionRef}
        className={`service-story story-${activeGroup.tone}`}
        id={id}
        animate={toneColors[activeGroup.tone]}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        style={
          {
            "--story-count": entries.length,
            "--story-height": `${entries.length * scrollStepSvh + 100}svh`,
          } as CSSProperties
        }
      >
      {groups.map((group, groupIndex) => {
        const startIndex = groups
          .slice(0, groupIndex)
          .reduce((total, current) => total + current.items.length, 0)

        return (
          <span
            className="story-anchor"
            id={group.id}
            key={group.id}
            style={{ top: `${startIndex * scrollStepSvh}svh` }}
          />
        )
      })}

      <div className="story-sticky">
        <div className="story-sidebar">
          <div
            className="story-wheel"
            aria-label={`${activeGroup.category} services`}
          >
            <OptionWheel
              items={wheelItems}
              selected={activeIndex}
              defaultSelected={0}
              soundUrl={wheelSound}
              onChange={(index) => {
                if (index === activeIndex) return
                manualSelectionRef.current = {
                  active: true,
                  scrollY: window.scrollY,
                  until: performance.now() + 900,
                }
                setActiveIndex(index)
              }}
              textColor={
                activeGroup.tone === "paper"
                  ? "#8f8b84"
                  : "rgba(255,255,255,.34)"
              }
              activeColor={
                activeGroup.tone === "paper" ? "#17161d" : "#ffffff"
              }
              fontSize={4.3}
              spacing={1.3}
              curve={0.65}
              tilt={7}
              blur={0}
              fade={0.25}
              minOpacity={0}
              inset={64}
              smoothing={65}
              draggable
            />
          </div>

          <motion.div
            className="scroll-cue"
            animate={{ opacity: [0.42, 0.72, 0.42] }}
            transition={{
              duration: 2.4,
              ease: "easeInOut",
              repeat: Infinity,
            }}
          >
            <MoveDown />
            <span>Scroll për të eksploruar</span>
          </motion.div>
        </div>

        <div className="story-stage">
          <div className="story-card-stack">
              <motion.div
                className="story-card-shell"
                key={`${activeGroup.id}-${activeIndex}`}
                custom={cardDirection}
                variants={variants}
                initial="enter"
                animate="active"
                transition={{
                  duration: reduceMotion ? 0 : 0.22,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
          <article className="story-card">
            <div className="story-card-top">
              <Badge variant="outline">{activeItem.eyebrow}</Badge>
              <span>
                {String(activeIndex + 1).padStart(2, "0")} /{" "}
                {String(entries.length).padStart(2, "0")}
              </span>
            </div>

            <div className="story-visual" aria-hidden="true">
              <ResponsiveImage
                image={activeItem.image}
                alt=""
                sizes="(max-width: 820px) 100vw, 56vw"
                loading="eager"
              />
              <div className="visual-grid" />
              <span className="visual-index">
                {String(activeIndex + 1).padStart(2, "0")}
              </span>
              <span className="visual-capability">{activeItem.title}</span>
              <div className="visual-stamp">{activeGroup.category}</div>
              <div className="visual-orbit" />
              <div className="visual-scanline" />
              <div className="visual-labels">
                {activeItem.deliverables.slice(0, 2).map((deliverable) => (
                  <span key={deliverable}>{deliverable}</span>
                ))}
              </div>
              <p>{activeItem.project}</p>
            </div>

            <div className="story-card-body">
              <div>
                <span className="project-label">Selected capability</span>
                <h3>{activeItem.project}</h3>
              </div>
              <p>{activeItem.description}</p>
            </div>

            <div className="story-card-footer">
              <div className="result-chip">
                <span>Rezultati</span>
                <strong>{activeItem.result}</strong>
              </div>

              <Dialog>
                <DialogTrigger
                  render={
                    <Button className="story-modal-trigger" size="lg" />
                  }
                >
                  Hap detajet
                  <ArrowUpRight data-icon="inline-end" />
                </DialogTrigger>
                <DialogContent
                  className={`service-modal modal-${activeGroup.tone}`}
                >
                  <DialogHeader>
                    <Badge>{activeItem.eyebrow}</Badge>
                    <DialogTitle>{activeItem.title}</DialogTitle>
                    <DialogDescription>
                      {activeItem.description}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="modal-project">
                    <span>Shembull pune</span>
                    <strong>{activeItem.project}</strong>
                    <p>{activeItem.result}</p>
                  </div>

                  <div className="modal-deliverables">
                    <span>Çka përfshihet</span>
                    <ul>
                      {activeItem.deliverables.map((deliverable) => (
                        <li key={deliverable}>
                          <Check />
                          {deliverable}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <DialogFooter>
                    <Button
                      className="modal-cta"
                      onClick={() => {
                        window.location.href = `/start-project?service=${encodeURIComponent(
                          activeItem.title,
                        )}`
                      }}
                    >
                      Kërko ofertë
                      <ArrowRight data-icon="inline-end" />
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
              </article>
              </motion.div>
          </div>

          <div className="story-progress" aria-hidden="true">
            {entries.map(({ item, group }, index) => (
              <span
                className={index === activeIndex ? "is-active" : undefined}
                key={`${group.id}-${item.title}`}
              />
            ))}
          </div>
        </div>
      </div>
      </motion.section>
    </MotionConfig>
  )
}
