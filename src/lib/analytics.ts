import type { BeforeSendEvent } from '@vercel/analytics'

// Invitation credentials and customer query strings never belong in analytics.
export function filterAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  const url = new URL(event.url)
  if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) return null
  url.search = ''
  url.hash = ''
  return { ...event, url: url.href }
}
