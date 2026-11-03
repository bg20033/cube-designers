import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { Check, ChevronDown, SlidersHorizontal } from "lucide-react"
import { filterCount, type FilterValue } from "./poster-filters"

type Group = {
  id: string
  label: string
  options: { value: string; label: string; count: number }[]
}

// A compact multi-select: one button that opens grouped checkboxes.
export function FilterMenu({
  groups,
  value,
  onChange,
  label = "Filtro",
  children,
  extraActiveCount = 0,
  onReset,
}: {
  groups: Group[]
  value: FilterValue
  onChange: (value: FilterValue) => void
  label?: string
  children?: ReactNode
  extraActiveCount?: number
  onReset?: () => void
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const count = filterCount(value) + extraActiveCount

  useEffect(() => {
    if (!open) return
    const close = (event: Event) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === "Escape"
          : !root.current?.contains(event.target as Node)
      ) {
        setOpen(false)
        if (event instanceof KeyboardEvent) trigger.current?.focus()
      }
    }
    document.addEventListener("pointerdown", close)
    document.addEventListener("keydown", close)
    return () => {
      document.removeEventListener("pointerdown", close)
      document.removeEventListener("keydown", close)
    }
  }, [open])

  const toggle = (group: string, option: string) => {
    const current = value[group] ?? []
    onChange({
      ...value,
      [group]: current.includes(option)
        ? current.filter((entry) => entry !== option)
        : [...current, option],
    })
  }

  return (
    <div className="filter-menu" ref={root}>
      <button
        ref={trigger}
        type="button"
        className={`filter-menu-button${count ? " is-active" : ""}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        <SlidersHorizontal size={15} />
        {label}
        {count > 0 && <span className="filter-menu-count">{count}</span>}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="filter-menu-panel" id={panelId} role="group" aria-label={label}>
          {groups.map((group) => (
            <fieldset key={group.id}>
              <legend>{group.label}</legend>
              {group.options.map((option) => {
                const checked = !!value[group.id]?.includes(option.value)
                return (
                  <label key={option.value}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(group.id, option.value)}
                    />
                    <span className="filter-menu-check" aria-hidden="true">
                      {checked && <Check size={11} />}
                    </span>
                    {option.label}
                    <small>{option.count}</small>
                  </label>
                )
              })}
            </fieldset>
          ))}
          {children}
          <div className="filter-menu-footer">
            <button
              type="button"
              disabled={!count}
              onClick={() => onReset ? onReset() : onChange({})}
            >
              Pastro
            </button>
            <button
              type="button"
              className="is-primary"
              onClick={() => { setOpen(false); trigger.current?.focus() }}
            >
              Gati
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
