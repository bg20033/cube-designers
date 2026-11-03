import { describe, expect, it } from "vitest"
import { withJpegDpi } from "../../scripts/print-metadata.mjs"

describe("print file physical density", () => {
  it("writes DPI units as well as the density without changing encoded pixels", () => {
    const input = Buffer.from(
      "ffd8ffe000104a46494600010100012c012c0000ffda000200112233ffd9",
      "hex",
    )
    const output = withJpegDpi(input, 300)
    expect(input[13]).toBe(0)
    expect(output[13]).toBe(1)
    expect(output.readUInt16BE(14)).toBe(300)
    expect(output.readUInt16BE(16)).toBe(300)
    expect(output.subarray(20)).toEqual(input.subarray(20))
    expect(output.length).toBe(input.length)
  })
  it("adds a JFIF header to JPEGs that only contain an Exif marker", () => {
    const input = Buffer.from("ffd8ffe1000645786966ffda000200112233ffd9", "hex")
    const output = withJpegDpi(input, 300)
    expect(output.toString("ascii", 6, 11)).toBe("JFIF\0")
    expect(output[13]).toBe(1)
    expect(output.subarray(20)).toEqual(input.subarray(2))
  })
  it("rejects invalid density and malformed input", () => {
    expect(() => withJpegDpi(Buffer.from("not a jpeg"), 300)).toThrow()
    expect(() => withJpegDpi(Buffer.from("ffd8ffd9", "hex"), 0)).toThrow()
    expect(() => withJpegDpi(Buffer.from("ffd8ffe000ff", "hex"), 300)).toThrow()
  })
})
