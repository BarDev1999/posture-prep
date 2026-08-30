import { LEVELS } from '../lib/levels.ts'
import { content } from '../lib/content.ts'
import { isValidISODate, todayISO } from '../lib/date.ts'
import { daysUntilExam } from '../lib/session.ts'
import { DEFAULT_EXAM_DATE, isPersistent } from '../lib/storage.ts'
import { useAppDispatch, useProgress } from '../state/AppContext.tsx'
import type { ThemeSetting } from '../types/progress.ts'

const THEMES: { value: ThemeSetting; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export function Settings() {
  const progress = useProgress()
  const dispatch = useAppDispatch()
  const today = todayISO()
  const daysLeft = daysUntilExam(progress.settings.examDate, today)

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-4">
      <h1 className="font-mono text-xs tracking-[0.14em] text-muted uppercase">Settings</h1>

      <section className="mt-3 border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold">Exam date</h2>
        <p className="mt-1 text-xs text-muted">
          Drives the countdown on the home screen. Defaults to {DEFAULT_EXAM_DATE}.
        </p>
        <input
          type="date"
          value={progress.settings.examDate}
          onChange={(event) => {
            if (isValidISODate(event.target.value)) {
              dispatch({ type: 'set-exam-date', examDate: event.target.value })
            }
          }}
          className="mt-3 min-h-12 w-full rounded border border-line bg-surface2 px-3 text-base"
        />
        <p className="mt-2 font-mono text-xs text-faint">
          {daysLeft >= 0 ? `${daysLeft} days from today` : `${Math.abs(daysLeft)} days ago`}
        </p>
      </section>

      <section className="mt-4 border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold">Difficulty</h2>
        <p className="mt-1 text-xs text-muted">Also reachable from the bottom bar on any screen.</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              aria-pressed={progress.settings.level === level.value}
              onClick={() => dispatch({ type: 'set-level', level: level.value })}
              className={`min-h-12 rounded border px-2 text-xs font-semibold ${
                progress.settings.level === level.value
                  ? 'border-accent bg-accent-soft text-ink'
                  : 'border-line bg-surface2 text-muted hover:text-ink'
              }`}
            >
              {level.name}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold">Appearance</h2>
        <p className="mt-1 text-xs text-muted">System follows the phone setting.</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {THEMES.map((theme) => (
            <button
              key={theme.value}
              type="button"
              aria-pressed={progress.settings.theme === theme.value}
              onClick={() => dispatch({ type: 'set-theme', theme: theme.value })}
              className={`min-h-12 rounded border px-2 text-xs font-semibold ${
                progress.settings.theme === theme.value
                  ? 'border-accent bg-accent-soft text-ink'
                  : 'border-line bg-surface2 text-muted hover:text-ink'
              }`}
            >
              {theme.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold">Content</h2>
        <dl className="mt-2 grid grid-cols-2 gap-y-1 font-mono text-xs text-muted">
          <dt>Facts</dt>
          <dd className="text-right">
            {content.counts.facts} ({content.counts.priorityFacts} priority)
          </dd>
          <dt>Questions</dt>
          <dd className="text-right">{content.counts.questions}</dd>
          <dt>Reference articles</dt>
          <dd className="text-right">{content.counts.articles}</dd>
          <dt>Storage</dt>
          <dd className="text-right">{isPersistent() ? 'localStorage' : 'this session only'}</dd>
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-faint">
          Export, import and reset arrive in a later stage. Progress is written to this browser only,
          so drilling on the phone and on a laptop keeps two separate records for now.
        </p>
      </section>
    </div>
  )
}
