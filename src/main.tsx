import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './polish.css'
import App from './App.tsx'

const root = document.getElementById('root')!
const app = (
  <StrictMode>
    <App pathname={window.location.pathname} />
  </StrictMode>
)

// Prerendered route HTML is intentionally crawler-first and does not share the
// interactive intro shell's tree. Mount cleanly to avoid a hydration reset
// while the WebGL lanyard is starting.
root.replaceChildren()
createRoot(root).render(app)
