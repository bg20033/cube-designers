import { useRef, useState } from "react"
import {
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react"

export type RouteId = "brand" | "print" | "digital" | "commerce"
export type RouteFilter = "all" | RouteId

type RoadmapPhase = {
  endDay: number
}

export function getPhaseIndex(day: number, phases: RoadmapPhase[]) {
  const index = phases.findIndex((phase) => day <= phase.endDay)
  return index === -1 ? phases.length - 1 : Math.max(0, index)
}

export function useRoadmapController(phases: RoadmapPhase[]) {
  const journeyRef = useRef<HTMLElement>(null)
  const [activeRoute, setActiveRoute] = useState<RouteFilter>("all")
  const [activePhase, setActivePhase] = useState(0)
  const [currentDay, setCurrentDay] = useState(0)
  const reduceMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: journeyRef,
    offset: ["start start", "end end"],
  })
  const storyProgress = useTransform(scrollYProgress, [0, 0.9], [0, 1])
  const smoothProgress = useSpring(storyProgress, {
    stiffness: 120,
    damping: 26,
    mass: 0.35,
  })
  const lineProgress = useTransform(storyProgress, [0, 0.96], [0, 1])

  useMotionValueEvent(storyProgress, "change", (value) => {
    const rawDay = Math.min(90, Math.max(0, Math.round(value * 90)))
    const nextPhase = getPhaseIndex(rawDay, phases)

    setActivePhase(nextPhase)
    setCurrentDay(reduceMotion ? phases[nextPhase].endDay : rawDay)
  })

  function scrollToPhase(index: number) {
    const journey = journeyRef.current
    if (!journey) return

    const journeyTop = window.scrollY + journey.getBoundingClientRect().top
    const journeyDistance = Math.max(
      0,
      journey.offsetHeight - window.innerHeight,
    )
    const storyTarget = phases[index].endDay / 90
    const rawTarget = storyTarget * 0.9

    window.scrollTo({
      top: journeyTop + journeyDistance * rawTarget,
      behavior: reduceMotion ? "auto" : "smooth",
    })
  }

  return {
    journeyRef,
    activeRoute,
    setActiveRoute,
    activePhase,
    currentDay,
    reduceMotion,
    smoothProgress,
    lineProgress,
    scrollToPhase,
  }
}
