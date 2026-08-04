import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { ArrowRight, ArrowUpRight, Check, MoveDown } from "lucide-react"
import { AnimatePresence, motion, MotionConfig } from "motion/react"

import OptionWheel from "@/components/OptionWheel"
import { ResponsiveImage } from "@/components/ResponsiveImage"
import wheelSound from "@/assets/223.mp3"
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

const scrollStepSvh = 24

const cardMotionVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    y: direction < 0 ? -22 : 22,
    scale: 0.99,
  }),
  active: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  exit: (direction: number) => ({
    opacity: 0,
    y: direction < 0 ? 16 : -16,
    scale: 0.995,
  }),
}

export default function ServiceStory({
  id,
  groups,
  onHeaderLabelChange,
}: ServiceStoryProps) {
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
  }, [activeIndex])

  const handleCardPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return
    const card = event.currentTarget

    const bounds = card.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width
    const y = (event.clientY - bounds.top) / bounds.height

    card.style.setProperty("--card-rx", `${(0.5 - y) * 3.2}deg`)
    card.style.setProperty("--card-ry", `${(x - 0.5) * 4.2}deg`)
    card.style.setProperty("--glow-x", `${x * 100}%`)
    card.style.setProperty("--glow-y", `${y * 100}%`)
  }

  const resetCardTilt = (event: ReactPointerEvent<HTMLDivElement>) => {
    const card = event.currentTarget
    card.style.setProperty("--card-rx", "0deg")
    card.style.setProperty("--card-ry", "0deg")
    card.style.setProperty("--glow-x", "50%")
    card.style.setProperty("--glow-y", "50%")
  }

  useEffect(() => {
    let frame = 0

    const updateFromScroll = () => {
      frame = 0
      const section = sectionRef.current
      if (!section) return

      const rect = section.getBoundingClientRect()
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

      const travel = Math.max(section.offsetHeight - window.innerHeight, 1)
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

    updateFromScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)

    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
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
        transition={{ duration: 1.05, ease: [0.4, 0, 0.2, 1] }}
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
              items={entries.map(({ item }) => item.title)}
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
              smoothing={105}
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
            <AnimatePresence
              initial={false}
              mode="wait"
              custom={cardDirection}
            >
              <motion.div
                className="story-card-shell"
                key={`${activeGroup.id}-${activeIndex}`}
                custom={cardDirection}
                variants={cardMotionVariants}
                initial="enter"
                animate="active"
                exit="exit"
                transition={{
                  duration: 0.34,
                  ease: [0.22, 1, 0.36, 1],
                }}
                onPointerMove={handleCardPointerMove}
                onPointerLeave={resetCardTilt}
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
                  Shiko shërbimin
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
                        window.location.href =
                          "mailto:hello@kube.studio?subject=Projekt i ri"
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
            </AnimatePresence>
          </div>

          <div className="story-progress" aria-hidden="true">
            {entries.map(({ item, group }, index) => (
              <motion.span
                animate={{
                  height: index === activeIndex ? 42 : 18,
                  opacity: index === activeIndex ? 1 : 0.22,
                }}
                transition={{
                  type: "spring",
                  stiffness: 420,
                  damping: 34,
                }}
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
