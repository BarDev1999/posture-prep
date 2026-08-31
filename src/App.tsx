import { Suspense, lazy } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell.tsx'
import { Home } from './routes/Home.tsx'
import { Drill } from './routes/Drill.tsx'
import { Practice } from './routes/Practice.tsx'
import { Article, Library } from './routes/Library.tsx'
import { Mock } from './routes/Mock.tsx'
import { Explain } from './routes/Explain.tsx'
import { Settings } from './routes/Settings.tsx'
import { AppProvider } from './state/AppContext.tsx'

// SQLite compiled to WebAssembly is over a megabyte. It is precached for
// offline use but only fetched when the sandbox is actually opened, so the
// first paint on a phone does not wait for it.
const Sandbox = lazy(() => import('./routes/Sandbox.tsx'))

/**
 * Hash routing on purpose. The app is served from a GitHub Pages subpath where
 * a deep link to /drill would 404 before the service worker exists, and a hash
 * route sidesteps that without a redirect shim.
 */
export function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/drill" element={<Drill />} />
            <Route path="/practice" element={<Practice />} />
            <Route
              path="/sandbox"
              element={
                <Suspense fallback={<Loading label="Loading SQLite" />}>
                  <Sandbox />
                </Suspense>
              }
            />
            <Route path="/library" element={<Library />} />
            <Route path="/library/:slug" element={<Article />} />
            <Route path="/mock" element={<Mock />} />
            <Route path="/explain" element={<Explain />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  )
}

function Loading({ label }: { label: string }) {
  return (
    <p className="mx-auto w-full max-w-2xl px-4 py-8 text-sm text-muted" role="status">
      {label}
    </p>
  )
}
