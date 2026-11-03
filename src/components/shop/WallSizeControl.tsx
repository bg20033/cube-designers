import { useEffect, useRef, useState } from "react"

export function WallSizeControl({
  label,
  value,
  limits,
  onChange,
  onValidity,
  onGestureStart,
}: {
  label: string
  value: number
  limits: readonly [number, number]
  onChange: (value: number, record?: boolean) => void
  onGestureStart: () => void
  onValidity: (valid: boolean) => void
}) {
  const [draft, setDraft] = useState(String(value))
  const gesture = useRef({ active: false, recorded: false })
  const number = Number(draft)
  const valid =
    draft !== "" &&
    Number.isInteger(number) &&
    number >= limits[0] &&
    number <= limits[1]
  useEffect(() => {
    setDraft(String(value))
  }, [value])
  useEffect(() => {
    onValidity(valid)
  }, [valid, onValidity])
  return (
    <div className="wall-size-control">
      <label>
        <span>{label}</span>
        <div>
          <input
            type="number"
            aria-label={label}
            inputMode="numeric"
            min={limits[0]}
            max={limits[1]}
            step="1"
            value={draft}
            aria-invalid={!valid}
            onChange={(event) => {
              setDraft(event.target.value)
              const next = Number(event.target.value)
              if (
                event.target.value !== "" &&
                Number.isInteger(next) &&
                next >= limits[0] &&
                next <= limits[1]
              )
                onChange(next)
            }}
          />
          <span>cm</span>
        </div>
      </label>
      <input
        type="range"
        aria-label={`${label} — rrëshqitësi`}
        min={limits[0]}
        max={limits[1]}
        step="1"
        value={value}
        onPointerDown={() => {
          gesture.current = { active: true, recorded: false }
        }}
        onPointerUp={() => {
          gesture.current.active = false
        }}
        onPointerCancel={() => {
          gesture.current.active = false
        }}
        onBlur={() => {
          gesture.current.active = false
        }}
        onChange={(event) => {
          setDraft(event.target.value)
          if (gesture.current.active && !gesture.current.recorded) {
            onGestureStart()
            gesture.current.recorded = true
          }
          onChange(Number(event.target.value), !gesture.current.active)
        }}
      />
      <small className={valid ? "" : "is-invalid"}>
        {valid
          ? `${limits[0]}–${limits[1]} cm`
          : `Vendos një numër nga ${limits[0]} deri ${limits[1]} cm.`}
      </small>
    </div>
  )
}
