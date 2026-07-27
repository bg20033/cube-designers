export function readStoredJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback

  try {
    const saved = window.localStorage.getItem(key)
    return saved ? (JSON.parse(saved) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeStoredJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage may be unavailable in private browsing or restricted embeds.
  }
}
