/** Copy in place, including browsers that deny the asynchronous Clipboard API. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* Try the browser's selection-based copy while the click is active. */ }

  const active = document.activeElement
  const selection = window.getSelection()
  const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, i) => selection.getRangeAt(i).cloneRange()) : []
  const field = document.createElement("textarea")
  field.value = text
  field.readOnly = true
  field.tabIndex = -1
  field.setAttribute("aria-hidden", "true")
  Object.assign(field.style, { position: "fixed", top: "0", left: "0", opacity: "0", fontSize: "16px", pointerEvents: "none" })
  // A modal can still be open while a newly created invitation is being saved.
  const container = document.querySelector("dialog[open]") ?? document.body
  container.append(field)
  try {
    field.focus({ preventScroll: true })
    field.select()
    field.setSelectionRange(0, text.length)
    return document.execCommand("copy")
  } catch { return false }
  finally {
    field.remove()
    if (active instanceof HTMLElement && active.isConnected) active.focus({ preventScroll: true })
    if (selection) {
      selection.removeAllRanges()
      for (const range of ranges) if (range.commonAncestorContainer.isConnected) selection.addRange(range)
    }
  }
}
