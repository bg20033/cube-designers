import { useEffect, useRef, type ReactNode } from "react"
import { X } from "lucide-react"

export function StoreDialog({
  children,
  onClose,
  title,
  drawer = false,
}: {
  children: ReactNode
  onClose: () => void
  title: string
  drawer?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    const opener = document.activeElement
    dialog?.showModal()
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
      dialog?.close()
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className={`cube-dialog${drawer ? " cube-drawer" : ""}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault()
        ref.current?.close()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="cube-dialog-body">
        <button
          className="cube-dialog-close"
          type="button"
          aria-label="Mbyll"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        {children}
      </div>
    </dialog>
  )
}
