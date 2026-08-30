import { useCallback, useEffect, useRef, useState } from 'react'
import { Markdown } from '../components/Markdown.tsx'
import { ResultTable } from '../components/ResultTable.tsx'
import { content, questions } from '../lib/content.ts'
import { todayISO } from '../lib/date.ts'
import { adaptationNote, sqliteReference } from '../lib/sql/adaptations.ts'
import { getSeedCounts, isMutating, resetDatabase, runQuery } from '../lib/sql/db.ts'
import type { QueryOutcome, QueryResult } from '../lib/sql/db.ts'
import { grade, gradeError, gradeReferenceError, orderMatters } from '../lib/sql/grade.ts'
import type { GradeResult } from '../lib/sql/grade.ts'
import { useAppDispatch, useProgress } from '../state/AppContext.tsx'

/**
 * The query sandbox. SQLite runs in the page, the exercises come from the
 * questions tagged SQL in file B, and grading compares result sets so a query
 * written differently from the model answer is still right.
 */

const FREE = 'free'
const STARTER = 'SELECT *\nFROM resources\nLIMIT 10;'

const sqlExercises = questions.filter((question) => question.format === 'SQL')

export default function Sandbox() {
  const progress = useProgress()
  const dispatch = useAppDispatch()
  const today = todayISO()

  const [exerciseId, setExerciseId] = useState<string>(sqlExercises[0]?.id ?? FREE)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [outcome, setOutcome] = useState<QueryOutcome | null>(null)
  const [result, setResult] = useState<GradeResult | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [running, setRunning] = useState(false)
  const [ready, setReady] = useState(false)
  const [dirty, setDirty] = useState(false)
  const startedAt = useRef(Date.now())

  const exercise = exerciseId === FREE ? null : (sqlExercises.find((q) => q.id === exerciseId) ?? null)
  const draft = drafts[exerciseId] ?? (exerciseId === FREE ? STARTER : '')

  // Warms the database up front so the first Run is not a two second wait.
  useEffect(() => {
    let cancelled = false
    runQuery('SELECT 1;').then(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setOutcome(null)
    setResult(null)
    setAttempts(0)
    setRevealed(false)
    startedAt.current = Date.now()
  }, [exerciseId])

  const setDraft = (value: string) => setDrafts((current) => ({ ...current, [exerciseId]: value }))

  const run = useCallback(async () => {
    setRunning(true)
    try {
      const userOutcome = await runQuery(draft)
      setOutcome(userOutcome)
      if (isMutating(draft)) setDirty(true)

      if (!exercise) {
        setResult(null)
        return
      }

      const nextAttempt = attempts + 1
      setAttempts(nextAttempt)

      let graded: GradeResult
      if (!userOutcome.ok) {
        graded = gradeError(userOutcome.error)
      } else {
        const reference = exercise.referenceSql
        if (!reference) {
          graded = gradeReferenceError('This question has no reference query in file C.')
        } else {
          const adapted = sqliteReference(exercise.id, reference)
          const referenceOutcome = await runQuery(adapted.sql)
          if (!referenceOutcome.ok) {
            graded = gradeReferenceError(referenceOutcome.error)
          } else {
            const userResult = lastResult(userOutcome.results)
            const referenceResult = lastResult(referenceOutcome.results)
            graded = grade(userResult, referenceResult, orderMatters(exercise.prompt, adapted.sql))
          }
        }
      }

      setResult(graded)

      const verdict =
        graded.verdict === 'correct' ? 'correct' : graded.verdict === 'right-rows-wrong-order' ? 'partial' : 'wrong'
      dispatch({
        type: 'answer-question',
        questionId: exercise.id,
        sectionId: exercise.section,
        result: verdict,
        today,
        elapsedMs: Math.min(10 * 60 * 1000, Date.now() - startedAt.current),
      })
      startedAt.current = Date.now()

      // One hint, one retry, then the model answer.
      if (verdict !== 'correct' && nextAttempt >= 2) setRevealed(true)
    } finally {
      setRunning(false)
    }
  }, [attempts, dispatch, draft, exercise, today])

  const seed = getSeedCounts()
  const entry = exercise ? progress.questions[exercise.id] : undefined

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-4">
      <h1 className="font-mono text-xs tracking-[0.14em] text-muted uppercase">Query sandbox</h1>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        A real SQLite database in this page, seeded with posture data. Nothing leaves the browser.
      </p>

      <SchemaPanel />

      <label className="mt-4 block">
        <span className="text-xs text-muted">Exercise</span>
        <select
          value={exerciseId}
          onChange={(event) => setExerciseId(event.target.value)}
          className="mt-1 min-h-12 w-full rounded border border-line bg-surface2 px-2 text-sm"
        >
          <option value={FREE}>Free query, no exercise</option>
          {sqlExercises.map((question) => {
            const state = progress.questions[question.id]
            const mark = state?.lastResult === 'correct' ? ' (done)' : state?.inReviewQueue ? ' (review)' : ''
            return (
              <option key={question.id} value={question.id}>
                {question.id} {question.difficulty}
                {mark}
              </option>
            )
          })}
        </select>
      </label>

      {exercise ? (
        <div className="mt-3 border border-line bg-surface p-3">
          <div className="flex flex-wrap gap-2 font-mono text-[11px] text-faint">
            <span>{exercise.id}</span>
            <span>{exercise.difficulty}</span>
            <span>section {exercise.section}</span>
            {entry && entry.attempts > 0 ? <span>{entry.attempts} attempts</span> : null}
          </div>
          <div className="mt-2">
            <Markdown>{exercise.prompt}</Markdown>
          </div>
        </div>
      ) : (
        <p className="mt-3 border border-line bg-surface p-3 text-sm text-muted">
          Explore the data. {seed ? `${seed.resources} resources, ${seed.findings} findings, ${seed.accounts} accounts.` : ''}
        </p>
      )}

      <label className="mt-3 block">
        <span className="text-xs text-muted">Your query</span>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={7}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          placeholder="SELECT ..."
          className="mt-1 w-full resize-y rounded border border-line bg-surface2 p-3 font-mono text-sm leading-relaxed"
        />
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={run}
          disabled={running || draft.trim().length === 0}
          className="min-h-12 flex-1 rounded bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-50"
        >
          {running ? 'Running' : ready ? 'Run' : 'Loading SQLite'}
        </button>
        {dirty ? (
          <button
            type="button"
            onClick={async () => {
              await resetDatabase()
              setDirty(false)
              setOutcome(null)
            }}
            className="min-h-12 rounded border border-line px-3 text-sm text-muted"
          >
            Reset data
          </button>
        ) : null}
      </div>

      {dirty ? (
        <p className="mt-2 text-xs text-muted">
          You changed the data. Reset it before trusting an exercise result.
        </p>
      ) : null}

      {outcome && !outcome.ok ? (
        <div className="mt-4 border border-critical/50 bg-surface p-3">
          <p className="font-mono text-xs font-semibold text-critical">SQLite error</p>
          <pre className="mt-2 overflow-x-auto font-mono text-xs whitespace-pre-wrap text-ink">{outcome.error}</pre>
          <p className="mt-2 text-xs text-muted">
            That is the message SQLite produced, word for word. Reading these is part of the job.
          </p>
        </div>
      ) : null}

      {outcome && outcome.ok ? (
        <div className="mt-4 space-y-3">
          {outcome.results.length === 0 ? (
            <p className="border border-line bg-surface2 p-3 font-mono text-xs text-muted">
              Statement ran. It returned no result set.
            </p>
          ) : (
            outcome.results.map((queryResult, index) => <ResultTable key={index} result={queryResult} />)
          )}
          <p className="font-mono text-[11px] text-faint">{outcome.elapsedMs.toFixed(1)} ms</p>
        </div>
      ) : null}

      {result && exercise ? (
        <Feedback
          result={result}
          revealed={revealed}
          attempts={attempts}
          onReveal={() => setRevealed(true)}
          referenceSql={exercise.referenceSql}
          adaptedSql={exercise.referenceSql ? sqliteReference(exercise.id, exercise.referenceSql).sql : null}
          adaptationNote={adaptationNote(exercise.id)}
          modelAnswer={exercise.answer}
        />
      ) : null}
    </div>
  )
}

function lastResult(results: QueryResult[]): QueryResult | null {
  return results.length > 0 ? (results[results.length - 1] ?? null) : null
}

function SchemaPanel() {
  return (
    <details className="mt-3 border border-line bg-surface">
      <summary className="flex min-h-12 cursor-pointer items-center px-3 text-sm font-semibold">
        Schema, {content.sqlSchemaTables.length} tables
      </summary>
      <div className="border-t border-line px-3 pb-3">
        <p className="mt-2 font-mono text-[11px] text-faint">{content.sqlSchemaTables.join(', ')}</p>
        <Markdown>{'```sql\n' + content.sqlSchema + '\n```'}</Markdown>
      </div>
    </details>
  )
}

function Feedback({
  result,
  revealed,
  attempts,
  onReveal,
  referenceSql,
  adaptedSql,
  adaptationNote: note,
  modelAnswer,
}: {
  result: GradeResult
  revealed: boolean
  attempts: number
  onReveal: () => void
  referenceSql: string | null
  adaptedSql: string | null
  adaptationNote: string | null
  modelAnswer: string
}) {
  const tone =
    result.verdict === 'correct'
      ? 'border-easy/60'
      : result.verdict === 'right-rows-wrong-order'
        ? 'border-medium/60'
        : 'border-high/60'

  const label =
    result.verdict === 'correct'
      ? 'Correct'
      : result.verdict === 'right-rows-wrong-order'
        ? 'Right rows, wrong order'
        : result.verdict === 'query-error'
          ? 'Query error'
          : result.verdict === 'reference-error'
            ? 'Cannot grade this one'
            : 'Wrong rows'

  return (
    <div className={`mt-4 border bg-surface p-3 ${tone}`}>
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">{result.hint}</p>

      {result.verdict !== 'correct' && result.verdict !== 'query-error' ? (
        <p className="mt-2 font-mono text-[11px] text-faint">
          yours {result.userRowCount} rows, expected {result.referenceRowCount}
        </p>
      ) : null}

      {result.verdict !== 'correct' && !revealed ? (
        <div className="mt-3">
          <p className="text-xs text-muted">
            {attempts < 2 ? 'Change one thing and run it again.' : 'Have another go.'}
          </p>
          <button
            type="button"
            onClick={onReveal}
            className="mt-2 min-h-11 w-full rounded border border-line px-3 text-sm text-muted hover:text-ink"
          >
            Show the model answer instead
          </button>
        </div>
      ) : null}

      {revealed || result.verdict === 'reference-error' ? (
        <div className="mt-4 border-t border-line pt-3">
          <p className="font-mono text-xs tracking-wide text-muted uppercase">Model answer</p>
          <Markdown className="mt-2">{modelAnswer}</Markdown>

          {note && adaptedSql && adaptedSql !== referenceSql ? (
            <div className="mt-3 border-l-2 border-medium pl-3">
              <p className="text-xs font-semibold text-medium">What the sandbox ran instead</p>
              <Markdown className="mt-1">{note}</Markdown>
              <Markdown>{'```sql\n' + adaptedSql + '\n```'}</Markdown>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
