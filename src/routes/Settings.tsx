import { useRef, useState } from 'react'
import { LEVELS } from '../lib/levels.ts'
import { content } from '../lib/content.ts'
import { isValidISODate, todayISO } from '../lib/date.ts'
import { daysUntilExam } from '../lib/session.ts'
import { parseFactMarkdown } from '../lib/importFacts.ts'
import {
  DEFAULT_EXAM_DATE,
  exportFilename,
  exportPayload,
  isPersistent,
  parseImport,
  summarise,
} from '../lib/storage.ts'
import { useAppDispatch, useProgress } from '../state/AppContext.tsx'
import type { ExtraFact, ProgressState, ThemeSetting } from '../types/progress.ts'

const THEMES: { value: ThemeSetting; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

const RESET_WORD = 'reset'

export function Settings() {
  const progress = useProgress()
  const dispatch = useAppDispatch()
  const today = todayISO()
  const daysLeft = daysUntilExam(progress.settings.examDate, today)

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-4">
      <h1 className="eyebrow">Settings</h1>

      <section className="mt-3 sheet p-4">
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
          className="mt-3 min-h-12 w-full rounded-sm border border-rule bg-raised px-3 text-base"
        />
        <p className="mt-2 font-mono text-xs text-faint">
          {daysLeft >= 0 ? `${daysLeft} days from today` : `${Math.abs(daysLeft)} days ago`}
        </p>
      </section>

      <section className="mt-4 sheet p-4">
        <h2 className="text-sm font-semibold">Difficulty</h2>
        <p className="mt-1 text-xs text-muted">Also reachable from More on the bottom bar, on any screen.</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              aria-pressed={progress.settings.level === level.value}
              onClick={() => dispatch({ type: 'set-level', level: level.value })}
              className={`min-h-12 rounded-sm border px-2 text-xs font-semibold ${
                progress.settings.level === level.value
                  ? 'border-accent bg-accent-soft text-ink'
                  : 'border-rule bg-raised text-muted hover:text-ink'
              }`}
            >
              {level.name}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 sheet p-4">
        <h2 className="text-sm font-semibold">Appearance</h2>
        <p className="mt-1 text-xs text-muted">System follows the phone setting.</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {THEMES.map((theme) => (
            <button
              key={theme.value}
              type="button"
              aria-pressed={progress.settings.theme === theme.value}
              onClick={() => dispatch({ type: 'set-theme', theme: theme.value })}
              className={`min-h-12 rounded-sm border px-2 text-xs font-semibold ${
                progress.settings.theme === theme.value
                  ? 'border-accent bg-accent-soft text-ink'
                  : 'border-rule bg-raised text-muted hover:text-ink'
              }`}
            >
              {theme.label}
            </button>
          ))}
        </div>
      </section>

      <ExportImport state={progress} />

      <ExtraContent extraFacts={progress.extraFacts} />

      <section className="mt-4 sheet p-4">
        <h2 className="text-sm font-semibold">Content</h2>
        <dl className="mt-2 grid grid-cols-2 gap-y-1 font-mono text-xs text-muted">
          <dt>Facts</dt>
          <dd className="text-right">
            {content.counts.facts} built in
            {progress.extraFacts.length > 0 ? ` + ${progress.extraFacts.length} imported` : ''}
          </dd>
          <dt>Questions</dt>
          <dd className="text-right">{content.counts.questions}</dd>
          <dt>Reference articles</dt>
          <dd className="text-right">{content.counts.articles}</dd>
          <dt>Mock attempts</dt>
          <dd className="text-right">{progress.mockAttempts.length}</dd>
          <dt>Storage</dt>
          <dd className="text-right">{isPersistent() ? 'localStorage' : 'this session only'}</dd>
        </dl>
      </section>

      <ResetProgress />
    </div>
  )
}

// ------------------------------------------------------------ export, import

function ExportImport({ state }: { state: ProgressState }) {
  const dispatch = useAppDispatch()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ state: ProgressState; name: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const current = summarise(state)

  const download = () => {
    const blob = new Blob([exportPayload(state)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = exportFilename()
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    // Revoking immediately can cancel the download in some browsers.
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
    setDone(`Downloaded ${exportFilename()}`)
  }

  const chooseFile = async (file: File) => {
    setError(null)
    setDone(null)
    const text = await file.text()
    const parsed = parseImport(text)
    if (!parsed.ok) {
      setError(parsed.error)
      setPending(null)
      return
    }
    setPending({ state: parsed.state, name: file.name })
  }

  return (
    <section className="mt-4 sheet p-4">
      <h2 className="text-sm font-semibold">Your progress</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        There is no account and no server, so this is how progress moves between the phone and a
        laptop: export a file on one, import it on the other.
      </p>

      <button
        type="button"
        onClick={download}
        className="mt-3 min-h-12 w-full rounded-sm border border-rule text-sm font-semibold hover:border-rule-strong"
      >
        Export progress as a file
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void chooseFile(file)
          event.target.value = ''
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="mt-2 min-h-12 w-full rounded-sm border border-rule text-sm font-semibold hover:border-rule-strong"
      >
        Import a progress file
      </button>

      {error ? <p className="mt-3 text-sm text-critical">{error}</p> : null}
      {done ? <p className="mt-3 text-sm text-easy">{done}</p> : null}

      {pending ? (
        <div className="mt-3 border border-hard/60 bg-raised p-3">
          <p className="text-sm font-semibold">Replace everything with {pending.name}?</p>
          <p className="mt-1 text-xs text-muted">
            This overwrites what is on this device. Export first if you want to keep it.
          </p>
          <table className="mt-2 w-full font-mono text-[11px]">
            <thead>
              <tr className="text-faint">
                <th className="text-left font-normal">records</th>
                <th className="text-right font-normal">now</th>
                <th className="text-right font-normal">after</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ['facts', current.facts, summarise(pending.state).facts],
                  ['questions', current.questions, summarise(pending.state).questions],
                  ['sessions', current.sessions, summarise(pending.state).sessions],
                  ['mock attempts', current.mockAttempts, summarise(pending.state).mockAttempts],
                  ['imported facts', current.extraFacts, summarise(pending.state).extraFacts],
                  ['lessons started', current.lessons, summarise(pending.state).lessons],
                ] as const
              ).map(([label, before, after]) => (
                <tr key={label}>
                  <td className="text-muted">{label}</td>
                  <td className="text-right">{before}</td>
                  <td className={`text-right ${after !== before ? 'text-accent' : ''}`}>{after}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setPending(null)}
              className="min-h-12 flex-1 rounded-sm border border-rule text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'replace', state: pending.state })
                setDone(`Restored from ${pending.name}`)
                setPending(null)
              }}
              className="min-h-12 flex-1 rounded-sm bg-accent text-sm font-semibold text-accent-ink"
            >
              Replace
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}

// ----------------------------------------------------------- extra content

function ExtraContent({ extraFacts }: { extraFacts: ExtraFact[] }) {
  const dispatch = useAppDispatch()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ facts: ExtraFact[]; warnings: string[]; name: string } | null>(null)
  const [error, setError] = useState<{ message: string; hint: string } | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const sources = [...new Set(extraFacts.map((fact) => fact.sourceName))]

  const chooseFile = async (file: File) => {
    setError(null)
    setDone(null)
    const text = await file.text()
    const parsed = parseFactMarkdown(text, file.name, extraFacts.length)
    if (!parsed.ok) {
      setError({ message: parsed.error, hint: parsed.hint })
      setPending(null)
      return
    }
    setPending({ facts: parsed.facts, warnings: parsed.warnings, name: file.name })
  }

  return (
    <section className="mt-4 sheet p-4">
      <h2 className="text-sm font-semibold">Add more facts</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        A markdown file in the same shape as the fact deck: a section heading, then numbered questions
        in bold with the answer underneath. Parsed here in the browser and merged into the drill, with
        no rebuild.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept=".md,.markdown,.txt,text/markdown,text/plain"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void chooseFile(file)
          event.target.value = ''
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="mt-3 min-h-12 w-full rounded-sm border border-rule text-sm font-semibold hover:border-rule-strong"
      >
        Import a fact file
      </button>

      {error ? (
        <div className="mt-3 border border-critical/60 bg-raised p-3">
          <p className="text-sm text-critical">{error.message}</p>
          <pre className="mt-2 overflow-x-auto font-mono text-[11px] whitespace-pre-wrap text-muted">
            {error.hint}
          </pre>
        </div>
      ) : null}
      {done ? <p className="mt-3 text-sm text-easy">{done}</p> : null}

      {pending ? (
        <div className="mt-3 border border-accent/60 bg-raised p-3">
          <p className="text-sm font-semibold">
            {pending.facts.length} {pending.facts.length === 1 ? 'fact' : 'facts'} found in {pending.name}
          </p>
          <p className="mt-1 data">
            {pending.facts.filter((fact) => fact.isPriority).length} flagged priority, across sections{' '}
            {[...new Set(pending.facts.map((fact) => fact.section))].sort().join(', ')}
          </p>
          {pending.warnings.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-hard">
              {pending.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setPending(null)}
              className="min-h-12 flex-1 rounded-sm border border-rule text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'import-facts', facts: pending.facts })
                setDone(`Added ${pending.facts.length} facts from ${pending.name}`)
                setPending(null)
              }}
              className="min-h-12 flex-1 rounded-sm bg-accent text-sm font-semibold text-accent-ink"
            >
              Add to the deck
            </button>
          </div>
        </div>
      ) : null}

      {sources.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {sources.map((source) => (
            <li key={source} className="flex items-center justify-between gap-3 border-t border-rule pt-2">
              <span className="truncate text-xs">
                {source}
                <span className="ml-2 data">
                  {extraFacts.filter((fact) => fact.sourceName === source).length} facts
                </span>
              </span>
              <button
                type="button"
                onClick={() => dispatch({ type: 'remove-imported', sourceName: source })}
                className="min-h-11 shrink-0 px-2 text-xs text-missed hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

// -------------------------------------------------------------------- reset

function ResetProgress() {
  const dispatch = useAppDispatch()
  const [typed, setTyped] = useState('')
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)

  if (done) {
    return (
      <section className="mt-4 sheet p-4">
        <p className="text-sm text-muted">Progress reset. Settings were kept.</p>
      </section>
    )
  }

  return (
    <section className="mt-4 border border-critical/40 bg-sheet p-4">
      <h2 className="text-sm font-semibold">Reset progress</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Clears every box, attempt, session and mock result. Settings and imported facts stay. There is
        no undo, so export first.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 min-h-12 w-full rounded-sm border border-critical/60 text-sm font-semibold text-critical"
        >
          Reset progress
        </button>
      ) : (
        <div className="mt-3">
          <label className="block">
            <span className="text-xs text-muted">
              Type <span className="font-mono text-ink">{RESET_WORD}</span> to confirm
            </span>
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="mt-1 min-h-12 w-full rounded-sm border border-rule bg-raised px-3 font-mono text-base"
            />
          </label>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setTyped('')
              }}
              className="min-h-12 flex-1 rounded-sm border border-rule text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={typed.trim().toLowerCase() !== RESET_WORD}
              onClick={() => {
                dispatch({ type: 'reset' })
                setDone(true)
              }}
              className="min-h-12 flex-1 rounded-sm bg-critical text-sm font-semibold text-white disabled:opacity-40"
            >
              Reset everything
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
