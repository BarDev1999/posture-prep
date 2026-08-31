import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Markdown } from '../components/Markdown.tsx'
import { CodeDiff } from '../components/CodeDiff.tsx'
import { questions, sectionTitle, sections } from '../lib/content.ts'
import { todayISO } from '../lib/date.ts'
import { MINUTES, blueprintFor, buildMockPaper, formatClock, paperSize, scorePaper } from '../lib/mock.ts'
import { useAppDispatch, useProgress } from '../state/AppContext.tsx'
import type { Question } from '../types/content.ts'
import type { MockAttempt, MockVariant, QuestionResult } from '../types/progress.ts'

/**
 * The mock exam. Closed book by design: no hints, no reference, no marking
 * until the paper is submitted or the clock runs out.
 *
 * Multiple choice is marked automatically. Everything else is marked by the
 * user against the model answer on the review screen, which is the only honest
 * option without a grader, and is where the trap explanation earns its keep.
 */

type Phase = 'setup' | 'sitting' | 'review'

export function Mock() {
  const progress = useProgress()
  const dispatch = useAppDispatch()
  const today = todayISO()

  const [phase, setPhase] = useState<Phase>('setup')
  const [variant, setVariant] = useState<MockVariant>('full')
  const [paper, setPaper] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [results, setResults] = useState<Record<string, QuestionResult>>({})
  const [deadline, setDeadline] = useState(0)
  const [remainingMs, setRemainingMs] = useState(0)
  const [timedOut, setTimedOut] = useState(false)
  const [saved, setSaved] = useState(false)
  const startedAt = useRef(0)

  const byId = useMemo(() => new Map(questions.map((question) => [question.id, question])), [])
  const paperQuestions = paper.map((id) => byId.get(id)).filter((question): question is Question => !!question)

  const submit = useCallback(
    (viaTimeout: boolean) => {
      setTimedOut(viaTimeout)
      // Multiple choice marks itself. Everything else starts unmarked and the
      // review screen asks for a self grade.
      const marked: Record<string, QuestionResult> = {}
      for (const id of paper) {
        const question = byId.get(id)
        if (!question || question.format !== 'MCQ' || !question.answerLetter) continue
        marked[id] = answers[id] === question.answerLetter ? 'correct' : 'wrong'
      }
      setResults(marked)
      setPhase('review')
    },
    [answers, byId, paper],
  )

  // The countdown. Running out submits the paper exactly as submitting does.
  useEffect(() => {
    if (phase !== 'sitting') return
    const tick = () => {
      const left = deadline - Date.now()
      setRemainingMs(left)
      if (left <= 0) submit(true)
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [phase, deadline, submit])

  const start = (chosen: MockVariant) => {
    const previous = progress.mockAttempts[progress.mockAttempts.length - 1]
    const built = buildMockPaper(questions, chosen, Date.now(), previous?.questionIds ?? [])
    setVariant(chosen)
    setPaper(built)
    setIndex(0)
    setAnswers({})
    setResults({})
    setTimedOut(false)
    setSaved(false)
    startedAt.current = Date.now()
    setDeadline(Date.now() + MINUTES[chosen] * 60 * 1000)
    setPhase('sitting')
  }

  const score = scorePaper(paper, questions, results, sections)

  const save = () => {
    const attempt: MockAttempt = {
      id: new Date().toISOString(),
      date: today,
      variant,
      durationMs: Date.now() - startedAt.current,
      timedOut,
      questionIds: paper,
      results,
      perSection: score.perSection,
      weightedScore: score.weightedScore,
      rawCorrect: score.rawCorrect,
      rawTotal: score.rawTotal,
    }
    dispatch({ type: 'save-mock', attempt })
    setSaved(true)
  }

  if (phase === 'setup') {
    return <Setup attempts={progress.mockAttempts} onStart={start} />
  }

  if (phase === 'sitting') {
    const question = paperQuestions[index]
    return (
      <Sitting
        question={question}
        index={index}
        total={paper.length}
        remainingMs={remainingMs}
        answers={answers}
        paper={paper}
        onAnswer={(id, value) => setAnswers((current) => ({ ...current, [id]: value }))}
        onGo={setIndex}
        onSubmit={() => submit(false)}
      />
    )
  }

  return (
    <Review
      paperQuestions={paperQuestions}
      answers={answers}
      results={results}
      score={score}
      variant={variant}
      timedOut={timedOut}
      saved={saved}
      previous={progress.mockAttempts}
      onMark={(id, result) => setResults((current) => ({ ...current, [id]: result }))}
      onSave={save}
      onAgain={() => setPhase('setup')}
    />
  )
}

// ------------------------------------------------------------------- setup

function Setup({ attempts, onStart }: { attempts: MockAttempt[]; onStart: (variant: MockVariant) => void }) {
  const previous = [...attempts].reverse()

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-4">
      <h1 className="font-mono text-xs tracking-[0.14em] text-muted uppercase">Mock exam</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Closed book. No hints, no reference, and nothing is marked until you submit or the clock runs
        out. Multiple choice marks itself; you mark the written answers against the model answer.
      </p>

      <div className="mt-4 space-y-2">
        <button
          type="button"
          onClick={() => onStart('full')}
          className="w-full rounded bg-accent px-4 py-4 text-left text-accent-ink"
        >
          <span className="block text-base font-semibold">Full paper, 90 minutes</span>
          <span className="mt-0.5 block text-sm opacity-80">
            {paperSize('full')} questions weighted to the blueprint: 6, 6, 5, 5, 3 across the five sections
          </span>
        </button>

        <button
          type="button"
          onClick={() => onStart('short')}
          className="w-full rounded border border-line bg-surface px-4 py-4 text-left"
        >
          <span className="block text-base font-semibold">Short paper, 60 minutes</span>
          <span className="mt-0.5 block text-sm text-muted">
            {paperSize('short')} questions from sections 1, 2 and 4 only, at their full weighting
          </span>
        </button>
      </div>

      {previous.length > 0 ? (
        <>
          <h2 className="mt-6 mb-2 font-mono text-xs tracking-[0.14em] text-muted uppercase">Past attempts</h2>
          <ul className="space-y-2">
            {previous.map((attempt, position) => {
              const older = previous[position + 1]
              const delta = older ? attempt.weightedScore - older.weightedScore : null
              return (
                <li key={attempt.id} className="border border-line bg-surface p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-semibold">{Math.round(attempt.weightedScore)}%</span>
                    <span className="font-mono text-[11px] text-faint">
                      {attempt.date}, {attempt.variant} paper
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 font-mono text-[11px] text-faint">
                    <span>
                      {attempt.rawCorrect} of {attempt.rawTotal} marks
                    </span>
                    <span>{formatClock(attempt.durationMs)} taken</span>
                    {attempt.timedOut ? <span className="text-hard">ran out of time</span> : null}
                    {delta !== null ? (
                      <span className={delta >= 0 ? 'text-easy' : 'text-missed'}>
                        {delta >= 0 ? '+' : ''}
                        {Math.round(delta)} on the previous
                      </span>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      ) : null}
    </div>
  )
}

// ----------------------------------------------------------------- sitting

function Sitting({
  question,
  index,
  total,
  remainingMs,
  answers,
  paper,
  onAnswer,
  onGo,
  onSubmit,
}: {
  question: Question | undefined
  index: number
  total: number
  remainingMs: number
  answers: Record<string, string>
  paper: string[]
  onAnswer: (id: string, value: string) => void
  onGo: (index: number) => void
  onSubmit: () => void
}) {
  const answered = paper.filter((id) => (answers[id] ?? '').trim().length > 0).length
  const low = remainingMs < 5 * 60 * 1000

  if (!question) return null

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col">
      <div className="shrink-0 border-b border-line bg-surface px-4 py-2">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-sm">
            <span className={low ? 'text-critical' : ''}>{formatClock(remainingMs)}</span>
          </span>
          <span className="font-mono text-[11px] text-faint">
            {index + 1} of {total}, {answered} answered
          </span>
        </div>
        <ol className="mt-2 flex flex-wrap gap-1">
          {paper.map((id, position) => {
            const done = (answers[id] ?? '').trim().length > 0
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onGo(position)}
                  aria-label={`Question ${position + 1}${done ? ', answered' : ''}`}
                  aria-current={position === index}
                  className={`size-6 rounded-sm border font-mono text-[10px] ${
                    position === index
                      ? 'border-accent bg-accent text-accent-ink'
                      : done
                        ? 'border-accent/60 bg-accent-soft text-ink'
                        : 'border-line bg-surface2 text-faint'
                  }`}
                >
                  {position + 1}
                </button>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="font-mono text-[11px] text-faint">
          {question.id} · {question.format} · {sectionTitle(question.section)}
        </div>
        <div className="mt-2 border border-line bg-surface p-3">
          <Markdown>{question.format === 'MCQ' ? question.stem : question.prompt}</Markdown>
        </div>

        {question.format === 'MCQ' && question.options ? (
          <ul className="mt-3 space-y-2">
            {question.options.map((option, position) => {
              const letter = ['a', 'b', 'c', 'd'][position] ?? ''
              const picked = answers[question.id] === letter
              return (
                <li key={letter}>
                  <button
                    type="button"
                    onClick={() => onAnswer(question.id, letter)}
                    className={`flex w-full items-start gap-3 rounded border p-3 text-left text-sm ${
                      picked ? 'border-accent bg-accent-soft' : 'border-line bg-surface'
                    }`}
                  >
                    <span className="font-mono text-xs text-muted">{letter}</span>
                    <span className="flex-1">{option}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <label className="mt-3 block">
            <span className="text-xs text-muted">Your answer</span>
            <textarea
              value={answers[question.id] ?? ''}
              onChange={(event) => onAnswer(question.id, event.target.value)}
              rows={question.format === 'scenario' ? 9 : 6}
              className={`mt-1 w-full resize-y rounded border border-line bg-surface2 p-3 text-sm ${
                question.format === 'SQL' || question.format === 'Python' ? 'font-mono' : ''
              }`}
              spellCheck={question.format === 'short' || question.format === 'scenario'}
              autoCapitalize={question.format === 'short' || question.format === 'scenario' ? 'sentences' : 'off'}
              autoCorrect={question.format === 'short' || question.format === 'scenario' ? 'on' : 'off'}
            />
          </label>
        )}
      </div>

      <div className="shrink-0 border-t border-line bg-surface px-3 py-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onGo(Math.max(0, index - 1))}
            disabled={index === 0}
            className="min-h-12 flex-1 rounded border border-line text-sm text-muted disabled:opacity-40"
          >
            Back
          </button>
          {index + 1 < total ? (
            <button
              type="button"
              onClick={() => onGo(index + 1)}
              className="min-h-12 flex-[2] rounded bg-accent text-sm font-semibold text-accent-ink"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              className="min-h-12 flex-[2] rounded bg-accent text-sm font-semibold text-accent-ink"
            >
              Submit the paper
            </button>
          )}
        </div>
        {index + 1 < total ? (
          <button
            type="button"
            onClick={onSubmit}
            className="mt-2 min-h-11 w-full text-xs text-faint hover:text-ink"
          >
            Submit early
          </button>
        ) : null}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ review

function Review({
  paperQuestions,
  answers,
  results,
  score,
  variant,
  timedOut,
  saved,
  previous,
  onMark,
  onSave,
  onAgain,
}: {
  paperQuestions: Question[]
  answers: Record<string, string>
  results: Record<string, QuestionResult>
  score: ReturnType<typeof scorePaper>
  variant: MockVariant
  timedOut: boolean
  saved: boolean
  previous: MockAttempt[]
  onMark: (id: string, result: QuestionResult) => void
  onSave: () => void
  onAgain: () => void
}) {
  const blueprint = blueprintFor(variant)
  const last = previous[previous.length - 1]

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-4">
      <h1 className="font-mono text-xs tracking-[0.14em] text-muted uppercase">Result</h1>
      {timedOut ? <p className="mt-1 text-sm text-hard">The clock ran out. The paper was submitted as it stood.</p> : null}

      <div className="mt-3 border border-line bg-surface p-4">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-3xl leading-none">{Math.round(score.weightedScore)}%</span>
          <span className="text-sm text-muted">weighted by section</span>
        </div>
        <p className="mt-2 font-mono text-xs text-faint">
          {score.rawCorrect} of {score.rawTotal} marks
          {last ? `, previous attempt ${Math.round(last.weightedScore)}%` : ''}
        </p>
        {score.ungraded > 0 ? (
          <p className="mt-2 text-sm text-hard">
            {score.ungraded} written {score.ungraded === 1 ? 'answer is' : 'answers are'} still unmarked. Mark them
            below and the score updates.
          </p>
        ) : null}
      </div>

      <h2 className="mt-5 mb-2 font-mono text-xs tracking-[0.14em] text-muted uppercase">By section</h2>
      <ul className="space-y-1.5">
        {sections
          .filter((section) => blueprint[section.id] !== undefined)
          .map((section) => {
            const bucket = score.perSection[String(section.id)] ?? { correct: 0, total: 0 }
            const percent = bucket.total > 0 ? Math.round((bucket.correct / bucket.total) * 100) : 0
            return (
              <li key={section.id} className="border border-line bg-surface p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm">{section.title}</span>
                  <span className="font-mono text-xs">
                    {bucket.correct} / {bucket.total}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface2">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
                </div>
                <p className="mt-1 font-mono text-[11px] text-faint">{section.weight}% of the exam</p>
              </li>
            )
          })}
      </ul>

      <h2 className="mt-5 mb-2 font-mono text-xs tracking-[0.14em] text-muted uppercase">Every question</h2>
      <ul className="space-y-2">
        {paperQuestions.map((question) => (
          <li key={question.id}>
            <ReviewCard
              question={question}
              answer={answers[question.id] ?? ''}
              result={results[question.id]}
              onMark={(result) => onMark(question.id, result)}
            />
          </li>
        ))}
      </ul>

      <div className="mt-6 space-y-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saved}
          className="min-h-14 w-full rounded bg-accent text-base font-semibold text-accent-ink disabled:opacity-50"
        >
          {saved ? 'Saved' : 'Save this attempt'}
        </button>
        <button
          type="button"
          onClick={onAgain}
          className="min-h-12 w-full rounded border border-line text-sm text-muted hover:text-ink"
        >
          Back to the mock exam
        </button>
      </div>
    </div>
  )
}

const MARKS: { value: QuestionResult; label: string; tone: string }[] = [
  { value: 'wrong', label: 'Missed it', tone: 'text-missed border-missed/50' },
  { value: 'partial', label: 'Partial', tone: 'text-hard border-hard/50' },
  { value: 'correct', label: 'Got it', tone: 'text-easy border-easy/50' },
]

function ReviewCard({
  question,
  answer,
  result,
  onMark,
}: {
  question: Question
  answer: string
  result: QuestionResult | undefined
  onMark: (result: QuestionResult) => void
}) {
  const auto = question.format === 'MCQ' && question.answerLetter !== null
  const tone =
    result === 'correct' ? 'border-easy/60' : result === 'partial' ? 'border-medium/60' : result === 'wrong' ? 'border-missed/60' : 'border-line'

  return (
    <details className={`border bg-surface ${tone}`} open={result !== 'correct'}>
      <summary className="cursor-pointer px-3 py-3">
        <span className="font-mono text-[11px] text-faint">
          {question.id} · {question.format} · section {question.section}
        </span>
        <span className="mt-1 flex items-center gap-2 text-sm font-semibold">
          {result === 'correct' ? (
            <span className="text-easy">Correct</span>
          ) : result === 'partial' ? (
            <span className="text-hard">Partial</span>
          ) : result === 'wrong' ? (
            <span className="text-missed">Wrong</span>
          ) : (
            <span className="text-muted">Not marked</span>
          )}
        </span>
      </summary>

      <div className="border-t border-line px-3 pb-3">
        <div className="mt-2">
          <Markdown>{question.prompt}</Markdown>
        </div>

        <p className="mt-3 font-mono text-xs tracking-wide text-muted uppercase">What you wrote</p>
        {auto ? (
          <p className="mt-1 text-sm">
            {answer ? `Option ${answer}` : 'No answer'}
            {question.answerLetter ? `, correct answer ${question.answerLetter}` : ''}
          </p>
        ) : (
          <p className="mt-1 text-sm whitespace-pre-wrap">{answer.trim().length > 0 ? answer : 'No answer'}</p>
        )}

        <p className="mt-3 font-mono text-xs tracking-wide text-muted uppercase">Model answer and the trap</p>
        <Markdown className="mt-1">{question.answer}</Markdown>

        {question.promptCode && question.answerCode ? (
          <div className="mt-3">
            <CodeDiff before={question.promptCode} after={question.answerCode} />
          </div>
        ) : null}

        {!auto ? (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {MARKS.map((mark) => (
              <button
                key={mark.value}
                type="button"
                aria-pressed={result === mark.value}
                onClick={() => onMark(mark.value)}
                className={`min-h-12 rounded border px-1 text-xs font-semibold ${mark.tone} ${
                  result === mark.value ? 'bg-surface2' : 'bg-surface'
                }`}
              >
                {mark.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </details>
  )
}
