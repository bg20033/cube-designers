import type { CSSProperties, PointerEvent } from "react"
import type { Guest, Invitation, Wedding } from "./model"
import { formatDate } from "./model"
import { coupleNames } from "./ceremony-utils"
import "@fontsource-variable/fraunces/full.css"
import "@fontsource-variable/fraunces/full-italic.css"
import "./ceremony.css"
import "./couture.css"

function BotanicalRelief() {
  return <svg className="couture-botanical" viewBox="0 0 200 450" fill="none" aria-hidden="true"><path d="M90 450C160 310 30 195 130 0" /><path d="M105 375C25 360 24 310 28 283C90 295 119 323 105 375ZM106 310C181 288 190 251 180 213C116 229 97 263 106 310ZM87 238C20 223 20 186 31 156C84 167 106 204 87 238ZM89 172C163 163 183 119 170 86C111 99 87 127 89 172ZM105 96C58 83 49 57 57 27C105 39 119 61 105 96Z" /></svg>
}

export default function InvitationCard({ wedding, guest, small = false, hero = false }: {
  wedding: Pick<Wedding, "names" | "message" | "design" | "events"> | Invitation
  guest?: Guest; small?: boolean; hero?: boolean
}) {
  const selectedEvents = wedding.events.filter((event) => !guest || guest.events.includes(event.id))
  const mainEvent = selectedEvents.find((event) => event.id === "dasma") ?? selectedEvents.at(-1)
  const names = coupleNames(wedding.names)
  const NamesTag = hero ? "h1" : "div"
  // The longest single word sets how small the names may get, so whole words fit the card.
  const longestWord = Math.max(1, ...`${names.first} ${names.second ?? ""}`.split(/\s+/).map((word) => word.length))
  const GuestTag = hero ? "h2" : "strong"
  function tilt(event: PointerEvent<HTMLDivElement>) {
    if (!hero || event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const bounds = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty("--card-rx", `${-(event.clientY - bounds.top - bounds.height / 2) / bounds.height * 5}deg`)
    event.currentTarget.style.setProperty("--card-ry", `${(event.clientX - bounds.left - bounds.width / 2) / bounds.width * 6}deg`)
  }
  return <div className={`inv-card couture-card inv-theme-${wedding.design}${small ? " inv-card-small" : ""}${hero ? " couture-card-hero" : ""}`} onPointerMove={tilt} onPointerLeave={(event) => { event.currentTarget.style.setProperty("--card-rx", "0deg"); event.currentTarget.style.setProperty("--card-ry", "0deg") }}>
    <div className="couture-paper-edge" aria-hidden="true" />
    <div className="couture-emboss" aria-hidden="true" />
    <div className="couture-orbits" aria-hidden="true"><i /><i /><i /></div>
    <BotanicalRelief />
    <div className="couture-folds" aria-hidden="true"><i /><i /><i /></div>
    <div className="inv-card-content">
      <div className="couture-monogram" aria-hidden="true">{names.initials}</div>
      <span className="inv-card-eyebrow">ME GËZIM JU FTOJMË</span>
      <NamesTag className="inv-card-names" style={{ "--name-chars": longestWord } as CSSProperties}><span>{names.first}</span>{names.second && <><span className="couture-amp"> & </span><span>{names.second}</span></>}</NamesTag>
      <p className="inv-card-message">{guest?.message || wedding.message}</p>
      {mainEvent && <div className="simple-card-details"><div className="couture-divider" aria-hidden="true"><i /></div><div className="inv-card-date">{formatDate(mainEvent.date)}</div>{mainEvent.venue && <span className="inv-card-location">{mainEvent.venue} · {mainEvent.time}</span>}</div>}
      {guest && <div className="inv-card-recipient"><span>Me kënaqësi presim</span><GuestTag>{guest.name}</GuestTag><small>{guest.capacity} {guest.capacity === 1 ? "vend i rezervuar" : "vende të rezervuara"}</small></div>}
    </div>
  </div>
}
