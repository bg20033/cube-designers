import { useEffect, useRef, useState } from "react"
import { Copy, Mail } from "lucide-react"

export function OrderEmail({ text, href }: { text: string; href: string }) {
  const [copied, setCopied] = useState("")
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus()
  }, [])
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied("Porosia u kopjua.")
    } catch {
      setCopied("Kopjoje tekstin nga fusha më poshtë.")
    }
  }
  return (
    <div className="cube-email-order">
      <h3 ref={heading} tabIndex={-1}>
        Gati për email.
      </h3>
      <p>
        Kërkesa ende s’është dërguar. Hape email-in dhe dërgoje vetë, ose
        kopjoje tekstin te <strong>info@cube-designers.com</strong>.
      </p>
      <textarea
        aria-label="Përmbledhja e porosisë për email"
        rows={7}
        readOnly
        value={text}
      />
      <a className="cube-button cube-button-dark" href={href}>
        <Mail size={16} /> Hap email-in me porosinë
      </a>
      <button className="cube-text-link" type="button" onClick={copy}>
        <Copy size={14} /> Kopjo porosinë
      </button>
      <span role="status">{copied}</span>
    </div>
  )
}
