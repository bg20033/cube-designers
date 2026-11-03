// Set physical JPEG density without re-encoding pixels. Some ImageIO writes
// set X/Y density but leave JFIF units at 0, making PDF tools assume 72 dpi.
export function withJpegDpi(bytes, dpi) {
  if (!Number.isInteger(dpi) || dpi < 1 || dpi > 65535)
    throw new Error("DPI jo valid.")
  const data = Buffer.from(bytes)
  if (data[0] !== 0xff || data[1] !== 0xd8)
    throw new Error("Skedari nuk është JPEG.")
  let offset = 2
  while (offset + 4 <= data.length && data[offset] === 0xff) {
    const marker = data[offset + 1]
    if (marker === 0xda || marker === 0xd9) break
    const length = data.readUInt16BE(offset + 2)
    if (length < 2 || offset + 2 + length > data.length)
      throw new Error("JPEG i dëmtuar.")
    if (
      marker === 0xe0 &&
      length >= 16 &&
      data.toString("ascii", offset + 4, offset + 9) === "JFIF\0"
    ) {
      data[offset + 11] = 1 // Dots per inch, rather than aspect ratio only.
      data.writeUInt16BE(dpi, offset + 12)
      data.writeUInt16BE(dpi, offset + 14)
      return data
    }
    offset += length + 2
  }
  const header = Buffer.from("ffe000104a46494600010101000000000000", "hex")
  header.writeUInt16BE(dpi, 12)
  header.writeUInt16BE(dpi, 14)
  return Buffer.concat([data.subarray(0, 2), header, data.subarray(2)])
}
