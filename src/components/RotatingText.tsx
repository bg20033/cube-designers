import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
} from "react"
import {
  AnimatePresence,
  motion,
  type Target,
  type TargetAndTransition,
  type Transition,
  type VariantLabels,
} from "motion/react"

function cn(...classes: (string | undefined | null | boolean)[]) {
  return classes.filter(Boolean).join(" ")
}

export interface RotatingTextRef {
  next: () => void
  previous: () => void
  jumpTo: (index: number) => void
  reset: () => void
}

export interface RotatingTextProps
  extends Omit<
    ComponentPropsWithoutRef<typeof motion.span>,
    "children" | "transition" | "initial" | "animate" | "exit"
  > {
  texts: string[]
  transition?: Transition
  initial?: boolean | Target | VariantLabels
  animate?: boolean | VariantLabels | TargetAndTransition
  exit?: Target | VariantLabels
  animatePresenceMode?: "sync" | "wait"
  animatePresenceInitial?: boolean
  rotationInterval?: number
  staggerDuration?: number
  staggerFrom?: "first" | "last" | "center" | "random" | number
  loop?: boolean
  auto?: boolean
  splitBy?: string
  onNext?: (index: number) => void
  mainClassName?: string
  splitLevelClassName?: string
  elementLevelClassName?: string
}

const RotatingText = forwardRef<RotatingTextRef, RotatingTextProps>(
  (
    {
      texts,
      transition = { type: "spring", damping: 25, stiffness: 300 },
      initial = { y: "100%", opacity: 0 },
      animate = { y: 0, opacity: 1 },
      exit = { y: "-120%", opacity: 0 },
      animatePresenceMode = "wait",
      animatePresenceInitial = false,
      rotationInterval = 2000,
      staggerDuration = 0,
      staggerFrom = "first",
      loop = true,
      auto = true,
      splitBy = "characters",
      onNext,
      mainClassName,
      splitLevelClassName,
      elementLevelClassName,
      ...rest
    },
    ref,
  ) => {
    const [currentTextIndex, setCurrentTextIndex] = useState(0)

    const splitIntoCharacters = (text: string) => {
      if (typeof Intl !== "undefined" && Intl.Segmenter) {
        const segmenter = new Intl.Segmenter("en", {
          granularity: "grapheme",
        })
        return Array.from(segmenter.segment(text), (segment) => segment.segment)
      }
      return Array.from(text)
    }

    const elements = useMemo(() => {
      const currentText = texts[currentTextIndex]

      if (splitBy === "characters") {
        return currentText.split(" ").map((word, index, words) => ({
          characters: splitIntoCharacters(word),
          needsSpace: index !== words.length - 1,
        }))
      }

      if (splitBy === "words") {
        return currentText.split(" ").map((word, index, words) => ({
          characters: [word],
          needsSpace: index !== words.length - 1,
        }))
      }

      if (splitBy === "lines") {
        return currentText.split("\n").map((line, index, lines) => ({
          characters: [line],
          needsSpace: index !== lines.length - 1,
        }))
      }

      return currentText.split(splitBy).map((part, index, parts) => ({
        characters: [part],
        needsSpace: index !== parts.length - 1,
      }))
    }, [texts, currentTextIndex, splitBy])

    const getStaggerDelay = useCallback(
      (index: number, totalCharacters: number) => {
        if (staggerFrom === "first") return index * staggerDuration
        if (staggerFrom === "last") {
          return (totalCharacters - 1 - index) * staggerDuration
        }
        if (staggerFrom === "center") {
          const center = Math.floor(totalCharacters / 2)
          return Math.abs(center - index) * staggerDuration
        }
        if (staggerFrom === "random") {
          const randomIndex = Math.floor(Math.random() * totalCharacters)
          return Math.abs(randomIndex - index) * staggerDuration
        }
        return Math.abs(staggerFrom - index) * staggerDuration
      },
      [staggerFrom, staggerDuration],
    )

    const handleIndexChange = useCallback(
      (newIndex: number) => {
        setCurrentTextIndex(newIndex)
        onNext?.(newIndex)
      },
      [onNext],
    )

    const next = useCallback(() => {
      const nextIndex =
        currentTextIndex === texts.length - 1
          ? loop
            ? 0
            : currentTextIndex
          : currentTextIndex + 1
      if (nextIndex !== currentTextIndex) handleIndexChange(nextIndex)
    }, [currentTextIndex, texts.length, loop, handleIndexChange])

    const previous = useCallback(() => {
      const previousIndex =
        currentTextIndex === 0
          ? loop
            ? texts.length - 1
            : currentTextIndex
          : currentTextIndex - 1
      if (previousIndex !== currentTextIndex) {
        handleIndexChange(previousIndex)
      }
    }, [currentTextIndex, texts.length, loop, handleIndexChange])

    const jumpTo = useCallback(
      (index: number) => {
        const validIndex = Math.max(0, Math.min(index, texts.length - 1))
        if (validIndex !== currentTextIndex) handleIndexChange(validIndex)
      },
      [texts.length, currentTextIndex, handleIndexChange],
    )

    const reset = useCallback(() => {
      if (currentTextIndex !== 0) handleIndexChange(0)
    }, [currentTextIndex, handleIndexChange])

    useImperativeHandle(
      ref,
      () => ({ next, previous, jumpTo, reset }),
      [next, previous, jumpTo, reset],
    )

    useEffect(() => {
      if (!auto) return
      const intervalId = window.setInterval(next, rotationInterval)
      return () => window.clearInterval(intervalId)
    }, [next, rotationInterval, auto])

    const totalCharacters = elements.reduce(
      (total, word) => total + word.characters.length,
      0,
    )

    return (
      <motion.span
        className={cn(
          "relative flex flex-wrap whitespace-pre-wrap",
          mainClassName,
        )}
        {...rest}
        transition={transition}
      >
        <span className="sr-only">{texts[currentTextIndex]}</span>
        <AnimatePresence
          mode={animatePresenceMode}
          initial={animatePresenceInitial}
        >
          <motion.span
            key={currentTextIndex}
            className={cn(
              splitBy === "lines"
                ? "flex w-full flex-col"
                : "relative flex flex-wrap whitespace-pre-wrap",
            )}
            aria-hidden="true"
          >
            {elements.map((word, wordIndex, words) => {
              const previousCharacters = words
                .slice(0, wordIndex)
                .reduce(
                  (total, previousWord) =>
                    total + previousWord.characters.length,
                  0,
                )

              return (
                <span
                  className={cn("inline-flex", splitLevelClassName)}
                  key={wordIndex}
                >
                  {word.characters.map((character, characterIndex) => (
                    <motion.span
                      className={cn("inline-block", elementLevelClassName)}
                      initial={initial}
                      animate={animate}
                      exit={exit}
                      transition={{
                        ...transition,
                        delay: getStaggerDelay(
                          previousCharacters + characterIndex,
                          totalCharacters,
                        ),
                      }}
                      key={characterIndex}
                    >
                      {character}
                    </motion.span>
                  ))}
                  {word.needsSpace && (
                    <span className="whitespace-pre"> </span>
                  )}
                </span>
              )
            })}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    )
  },
)

RotatingText.displayName = "RotatingText"

export default RotatingText
