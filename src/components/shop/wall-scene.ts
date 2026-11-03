// Scene coordinates share the planner's centimetres. This SVG is used both
// behind the draggable prints and in the downloaded image.
export const FLOOR_CM = 34
export const SOFA_FLOOR_OFFSET = 7
export const SOFA_ASSET = {
  src: "/media/collections/wall/linen-sofa.webp",
  width: 1983,
  height: 793,
  crop: { x: 0, y: 91, width: 1983, height: 650 },
} as const

export function roomSceneSvg(
  width: number,
  height: number,
  color: string,
  furnished = true,
) {
  const h = height + FLOOR_CM
  const paint = /^#[0-9a-f]{6}$/i.test(color) ? color : "#f3f1ec"
  const seams = Array.from({ length: 19 }, (_, i) => {
    const x = ((i - 5) * width) / 8
    return `<path d="M${x} ${height}L${width / 2 + (x - width / 2) * 1.3} ${h}"/>`
  }).join("")
  const rugHalf = Math.min(122, width * 0.44)
  const rug = furnished
    ? `<path d="M${width / 2 - rugHalf * 0.92} ${height + 4}h${rugHalf * 1.84}l${rugHalf * 0.12} 26H${width / 2 - rugHalf * 1.04}z" fill="#4b4030" opacity=".12" filter="url(#soft)"/><path d="M${width / 2 - rugHalf * 0.92} ${height + 3}h${rugHalf * 1.84}l${rugHalf * 0.12} 26H${width / 2 - rugHalf * 1.04}z" fill="#ded6c7" stroke="#c9c0b0" stroke-width=".35"/><path d="M${width / 2 - rugHalf * 0.94} ${height + 26}h${rugHalf * 1.88}" stroke="#f3efe6" stroke-width=".45" opacity=".65"/>`
    : ""
  const grain = Array.from({ length: 55 }, (_, i) => {
    const x = (i * 37.17) % width
    return `<path d="M${x} ${height}q${i % 2 ? 2 : -2} ${FLOOR_CM / 2} ${(x - width / 2) * 0.3} ${FLOOR_CM}" opacity="${0.05 + (i % 4) * 0.012}"/>`
  }).join("")
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width * 4}" height="${h * 4}" viewBox="0 0 ${width} ${h}">
  <defs>
    <linearGradient id="ceiling" x2="0" y2="1"><stop stop-color="#000" stop-opacity=".09"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
    <linearGradient id="skirt-shade" x2="0" y2="1"><stop stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".1"/></linearGradient>
    <radialGradient id="corners" cx=".5" cy=".45" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".07"/></radialGradient>
    <linearGradient id="wood" x2="0" y2="1"><stop stop-color="#ac9476"/><stop offset=".16" stop-color="#c1ac8e"/><stop offset="1" stop-color="#d6c4a6"/></linearGradient>
    <linearGradient id="skirting" x2="0" y2="1"><stop stop-color="#fff" stop-opacity=".9"/><stop offset=".15" stop-color="#e9e5de"/><stop offset=".9" stop-color="#ddd8ce"/><stop offset="1" stop-color="#8a8172"/></linearGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="1.2"/></filter>
  </defs>
  <path fill="${paint}" d="M0 0h${width}v${height}H0z"/>
  <!-- One flat paint colour; only soft shade where the wall meets the ceiling, floor and corners. -->
  <path fill="url(#ceiling)" d="M0 0h${width}v30H0z"/>
  <path fill="url(#skirt-shade)" d="M0 ${height - 40}h${width}v40H0z"/>
  <path fill="url(#corners)" d="M0 0h${width}v${height}H0z"/>
  <path fill="url(#wood)" d="M0 ${height}h${width}v${FLOOR_CM}H0z"/>
  <g fill="none" stroke="#745d41" stroke-width=".16" opacity=".3">${seams}<path d="M0 ${height + 12}h${width}M0 ${height + 29}h${width}"/></g>
  <g fill="none" stroke="#69583f" stroke-width=".12">${grain}</g>
  ${rug}
  <path fill="url(#skirting)" d="M0 ${height - 4}h${width}v4H0z"/>
  <path stroke="#675b48" stroke-opacity=".28" stroke-width=".35" d="M0 ${height + 0.2}h${width}"/>
  </svg>`
}

export function roomSceneSrc(
  width: number,
  height: number,
  color: string,
  furnished = true,
) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(roomSceneSvg(width, height, color, furnished))}`
}
