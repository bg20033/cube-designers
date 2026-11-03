import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useWallHistory } from "./useWallHistory"
import type { Wall } from "./wall-layout"
const start: Wall = {
  width: 300,
  height: 260,
  color: "#f3f1ec",
  sofa: true,
  grid: false,
  items: [],
}

describe("wall editor undo", () => {
  it("undoes and redoes configuration changes", () => {
    const { result } = renderHook(() => useWallHistory(() => start))
    act(() => result.current.setWall((current) => ({ ...current, width: 420 })))
    act(() => result.current.undo())
    expect(result.current.wall.width).toBe(300)
    act(() => result.current.redo())
    expect(result.current.wall.width).toBe(420)
  })
  it("treats a drag gesture as one undo action", () => {
    const { result } = renderHook(() => useWallHistory(() => start))
    act(() => result.current.checkpoint())
    act(() => {
      for (let width = 310; width <= 420; width += 10)
        result.current.setWall((current) => ({ ...current, width }), false)
    })
    act(() => result.current.undo())
    expect(result.current.wall.width).toBe(300)
    expect(result.current.canUndo).toBe(false)
    act(() => result.current.redo())
    expect(result.current.wall.width).toBe(420)
  })
  it("clears the redo branch after a new edit and ignores initial hydration", () => {
    const { result } = renderHook(() => useWallHistory(() => start))
    act(() => result.current.setWall({ ...start, width: 350 }, false))
    expect(result.current.canUndo).toBe(false)
    act(() => result.current.setWall((current) => ({ ...current, width: 400 })))
    act(() => result.current.undo())
    act(() =>
      result.current.setWall((current) => ({ ...current, height: 280 })),
    )
    expect(result.current.canRedo).toBe(false)
    expect(result.current.wall.width).toBe(350)
  })
})
