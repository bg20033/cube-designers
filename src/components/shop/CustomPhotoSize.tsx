import { useEffect, useId, useState } from "react"
import { Link2, Unlink2 } from "lucide-react"
import { customSizeId } from "@/data/products"

export function CustomPhotoSize({
  dims,
  aspect,
  locked,
  canLock,
  onLock,
  onChange,
  onValidity,
}: {
  dims: readonly [number, number]
  aspect: number
  locked: boolean
  canLock: boolean
  onLock: () => void
  onChange: (dims: [number, number]) => void
  onValidity: (valid: boolean) => void
}) {
  const id = useId()
  const [printWidth, printHeight] = dims
  const [width, setWidth] = useState(String(printWidth))
  const [height, setHeight] = useState(String(printHeight))
  const [invalid, setInvalid] = useState(false)
  useEffect(() => {
    setWidth(String(printWidth))
    setHeight(String(printHeight))
    setInvalid(false)
    onValidity(true)
  }, [printWidth, printHeight, onValidity])
  function edit(axis: 0 | 1, value: string) {
    const number = value === "" ? NaN : Number(value)
    const other =
      locked && Number.isFinite(number)
        ? String(
            Math.round((axis === 0 ? number / aspect : number * aspect) * 10) /
              10,
          )
        : axis === 0
          ? height
          : width
    const nextWidth = axis === 0 ? value : other
    const nextHeight = axis === 1 ? value : other
    setWidth(nextWidth)
    setHeight(nextHeight)
    const next: [number, number] = [
      nextWidth === "" ? NaN : Number(nextWidth),
      nextHeight === "" ? NaN : Number(nextHeight),
    ]
    const valid = !!customSizeId(...next)
    setInvalid(!valid)
    onValidity(valid)
    if (valid) onChange(next)
  }
  return (
    <div className="photo-custom-size">
      <div className="photo-custom-fields">
        {[
          ["Gjerësia e printit", width],
          ["Lartësia e printit", height],
        ].map(([label, value], index) => (
          <label key={label}>
            <span>{label}</span>
            <div>
              <input
                aria-label={label}
                type="number"
                inputMode="decimal"
                min={10}
                max={70}
                step={0.1}
                value={value}
                aria-invalid={invalid}
                aria-describedby={`${id}-hint`}
                onChange={(event) => edit(index as 0 | 1, event.target.value)}
              />
              <span>cm</span>
            </div>
          </label>
        ))}
      </div>
      <button
        type="button"
        className="photo-ratio-lock"
        aria-pressed={locked}
        disabled={!canLock}
        onClick={onLock}
      >
        {locked ? <Link2 /> : <Unlink2 />}
        {locked ? "Proporcioni i fotos i lidhur" : "Ruaj proporcionin e fotos"}
      </button>
      <p
        id={`${id}-hint`}
        className={`photo-custom-hint${invalid ? " is-invalid" : ""}`}
        role={invalid ? "alert" : undefined}
      >
        {invalid
          ? "Vendos 10–70 cm me maksimum një presje dhjetore; ana më e shkurtër deri 50 cm."
          : "10–70 cm · ana më e shkurtër deri 50 cm · saktësi 0,1 cm"}
      </p>
    </div>
  )
}
