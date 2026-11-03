import { useCallback, useState } from "react"
import type { Wall } from "./wall-layout"

const LIMIT = 40
export function useWallHistory(initial: () => Wall) {
  const [history, setHistory] = useState(() => ({
    past: [] as Wall[],
    present: initial(),
    future: [] as Wall[],
  }))
  const setWall = useCallback(
    (next: Wall | ((current: Wall) => Wall), record = true) => {
      setHistory((current) => {
        const present =
          typeof next === "function" ? next(current.present) : next
        if (present === current.present) return current
        return {
          past: record
            ? [...current.past, current.present].slice(-LIMIT)
            : current.past,
          present,
          future: [],
        }
      })
    },
    [],
  )
  const checkpoint = useCallback(
    () =>
      setHistory((current) => ({
        ...current,
        past: [...current.past, current.present].slice(-LIMIT),
        future: [],
      })),
    [],
  )
  const undo = useCallback(
    () =>
      setHistory((current) =>
        current.past.length
          ? {
              past: current.past.slice(0, -1),
              present: current.past[current.past.length - 1],
              future: [current.present, ...current.future].slice(0, LIMIT),
            }
          : current,
      ),
    [],
  )
  const redo = useCallback(
    () =>
      setHistory((current) =>
        current.future.length
          ? {
              past: [...current.past, current.present].slice(-LIMIT),
              present: current.future[0],
              future: current.future.slice(1),
            }
          : current,
      ),
    [],
  )
  return {
    wall: history.present,
    setWall,
    checkpoint,
    undo,
    redo,
    canUndo: !!history.past.length,
    canRedo: !!history.future.length,
  }
}
