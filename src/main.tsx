import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App.tsx'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Keeps the installed app current without prompting. The service worker is what
// makes the app open with the network disabled after the first visit.
registerSW({
  immediate: true,
  onRegisterError(error) {
    // Some embedded browsers refuse to register a worker at all. The app still
    // works, it just loses offline, so this stays a note rather than a crash.
    console.info('Offline support unavailable:', error)
  },
})
