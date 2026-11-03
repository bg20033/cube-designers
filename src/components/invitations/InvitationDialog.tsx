import { useEffect, useRef, type ReactNode } from "react"
import { X } from "lucide-react"

export default function InvitationDialog({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const opener = document.activeElement
    const dialog = ref.current
    dialog?.showModal()
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
      dialog?.close()
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])
  return <dialog className={`inv-dialog${wide ? " inv-dialog-wide" : ""}`} ref={ref} aria-label={title} onCancel={(e) => { e.preventDefault(); onClose() }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
    <div className="inv-dialog-header"><h2>{title}</h2><button type="button" className="inv-icon-button" aria-label="Mbyll" onClick={onClose}><X size={20} /></button></div>
    {children}
  </dialog>
}
