import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell.tsx'
import { Home } from './routes/Home.tsx'
import { Drill } from './routes/Drill.tsx'
import { Settings } from './routes/Settings.tsx'
import { AppProvider } from './state/AppContext.tsx'

/**
 * Hash routing on purpose. The app is served from a GitHub Pages subpath where
 * a deep link to /drill would hit a 404 before the service worker exists, and a
 * hash route sidesteps that without a redirect shim.
 */
export function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/drill" element={<Drill />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  )
}
