import { useEffect, useRef } from 'react'
import { LEVELS } from '../lib/levels.ts'
import { useAppDispatch, useSettings } from '../state/AppContext.tsx'

/**
 * The difficulty control. One tap on the bottom bar opens it, a second tap sets
 * the level, which is the two tap ceiling the brief asks for. Changing level
 * only writes the setting, so nothing about progress is touched.
 */
export function LevelSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
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
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close the difficulty control"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="level-sheet-title"
        className="relative w-full max-w-lg border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 id="level-sheet-title" className="text-sm font-semibold">
            Difficulty
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-3 text-sm text-muted hover:text-ink"
          >
            Close
          </button>
        </div>

        <ul className="p-2">
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

        <p className="border-t border-line px-4 py-3 text-xs leading-relaxed text-faint">
          The level is saved and never resets progress. It changes question practice and the query
          sandbox, which arrive in the next stage. The fact drill reads the same at every level.
        </p>
      </div>
    </div>
  )
}
