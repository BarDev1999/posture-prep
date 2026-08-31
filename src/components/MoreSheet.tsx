import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { LEVELS } from '../lib/levels.ts'
import { useAppDispatch, useSettings } from '../state/AppContext.tsx'

/**
 * The bottom sheet behind "More". The difficulty control lives here rather than
 * behind another screen, so setting a level is one tap to open and one tap to
 * choose, from anywhere in the app.
 */

type Destination = { to: string; label: string; detail: string }

const DESTINATIONS: Destination[] = [
  { to: '/library', label: 'Reference', detail: 'Articles, and search across everything' },
  { to: '/mock', label: 'Mock exam', detail: '25 questions, weighted like the real one' },
  { to: '/explain', label: 'Explain it back', detail: 'Say a concept in your own words' },
  { to: '/settings', label: 'Settings', detail: 'Exam date, appearance, your data' },
]

export function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useSettings()
  const dispatch = useAppDispatch()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    panelRef.current?.querySelector<HTMLButtonElement>('button[data-level]')?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="more-sheet-title"
        className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 id="more-sheet-title" className="text-sm font-semibold">
            More
          </h2>
          <button type="button" onClick={onClose} className="min-h-11 px-3 text-sm text-muted hover:text-ink">
            Close
          </button>
        </div>

        <section className="border-b border-line p-3">
          <h3 className="px-1 text-xs font-semibold tracking-wide text-muted uppercase">Difficulty</h3>
          <ul className="mt-2 space-y-1">
            {LEVELS.map((level) => {
              const active = settings.level === level.value
              return (
                <li key={level.value}>
                  <button
                    type="button"
                    data-level={level.value}
                    aria-pressed={active}
                    onClick={() => {
                      dispatch({ type: 'set-level', level: level.value })
                      onClose()
                    }}
                    className={`flex w-full flex-col gap-1 rounded border p-3 text-left ${
                      active ? 'border-accent bg-accent-soft' : 'border-transparent hover:bg-surface2'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <span className="font-mono text-xs text-muted">L{level.value}</span>
                      {level.name}
                      {active ? <span className="text-xs font-normal text-accent">current</span> : null}
                    </span>
                    <span className="text-xs leading-relaxed text-muted">{level.blurb}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="mt-2 px-1 text-xs leading-relaxed text-faint">
            Changing level never touches progress. The fact drill reads the same at every level, the level
            decides which questions practice serves, and the mock exam ignores it because a mock that
            served only easy questions would not be a mock.
          </p>
        </section>

        <nav className="p-3">
          <ul className="space-y-1">
            {DESTINATIONS.map((destination) => (
              <li key={destination.to}>
                <Link
                  to={destination.to}
                  onClick={onClose}
                  className="flex min-h-14 flex-col justify-center rounded px-3 hover:bg-surface2"
                >
                  <span className="text-sm font-semibold">{destination.label}</span>
                  <span className="text-xs text-muted">{destination.detail}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}
