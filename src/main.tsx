import { startTransition, StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import './polish.css'
import App, { preloadPage } from './App.tsx'
import { Analytics } from '@vercel/analytics/react'
import { filterAnalyticsEvent } from './lib/analytics'
import { isAdminPath } from './app/routes'

const root = document.getElementById('root')!
const app = (
  <StrictMode>
    <App pathname={window.location.pathname} />
    <Analytics beforeSend={filterAnalyticsEvent} />
  </StrictMode>
)

// Prerendered pages render the same App tree, so React adopts the existing
// HTML instead of rebuilding it. The page chunk loads first so nothing
// suspends mid-hydration. /admin is served the home document and mounts fresh.
const pathname = window.location.pathname
void preloadPage(pathname)
  .catch(() => undefined)
  .then(() => {
    // Vite's unrendered document contains the app-html comment. Only real
    // elements indicate SSR content that React should hydrate.
    if (root.childElementCount > 0 && !isAdminPath(pathname)) {
      // A transition lets React hydrate in small slices instead of one long
      // task, so the page stays responsive while it becomes interactive.
      startTransition(() => {
        hydrateRoot(root, app)
      })
    } else {
      root.replaceChildren()
      createRoot(root).render(app)
    }
  })
