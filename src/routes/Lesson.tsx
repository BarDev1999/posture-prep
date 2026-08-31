import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Markdown } from '../components/Markdown.tsx'
import { ResultTable } from '../components/ResultTable.tsx'
import { Diagram } from '../components/learn/Diagram.tsx'
import { ParsonsWidget } from '../components/learn/ParsonsWidget.tsx'
import { curriculumEntry, getTopic } from '../data/curriculum.ts'
import { getLesson } from '../data/lessons/index.ts'
import { getMisconception } from '../data/misconceptions.ts'
import { content, getFact, getQuestion } from '../lib/content.ts'
import { todayISO } from '../lib/date.ts'
import {
  TOTAL_STEPS,
  blankedIndices,
  blockingPrerequisites,
  fadeAnswerAccepted,
  lessonProgress,
  lessonState,
  stepKeyAt,
} from '../lib/learn.ts'
import { grade, gradeError, orderMatters } from '../lib/sql/grade.ts'
import type { GradeResult } from '../lib/sql/grade.ts'
import type { QueryResult } from '../lib/sql/types.ts'
import { useAppDispatch, useProgress } from '../state/AppContext.tsx'
import { STEP_TITLES } from '../types/lesson.ts'
import type { FadeExercise, Lesson, ProduceExercise, TrapExercise, VocabTerm, WorkedExample } from '../types/lesson.ts'

/**
 * The lesson player. One step per screen, nine of them, always in order.
 *
 * Forward is only allowed when the current step is satisfied, and what counts
 * as satisfied is different per step: reading is enough for the first two, the
 * worked example wants its self explanation prompts opened, and the exercises
 * want a right answer. Back is always allowed, including back out of the lesson.
 */
export function Lesson() {
  const { lessonId = '' } = useParams()
  // Keyed on the lesson id so that moving from one lesson to another gets a
  // fresh player. React Router reuses this element across the two, and without
  // the key the step counter and every answer typed would carry over.
  return <LessonPlayer key={lessonId} lessonId={lessonId} />
}

function LessonPlayer({ lessonId }: { lessonId: string }) {
  const navigate = useNavigate()
  const progress = useProgress()
  const dispatch = useAppDispatch()
  const today = todayISO()

  const entry = curriculumEntry(lessonId)
  const lesson = getLesson(lessonId)
  const stored = lessonProgress(progress.lessons, lessonId)
  const state = entry ? lessonState(entry, progress.lessons) : 'locked'

  const [step, setStep] = useState(() => Math.min(TOTAL_STEPS, Math.max(1, stored.currentStep)))
  const [openPrompts, setOpenPrompts] = useState<number[]>([])
  const [lightDone, setLightDone] = useState(false)
  const [heavyDone, setHeavyDone] = useState(false)
  const [parsonsDone, setParsonsDone] = useState(false)
  const [fallbackDone, setFallbackDone] = useState(false)
  const [droppedBack, setDroppedBack] = useState(false)
  const [produceDone, setProduceDone] = useState(false)
  const [trapPick, setTrapPick] = useState<number | null>(null)
  const top = useRef<HTMLDivElement>(null)

  // Every step is its own screen, so each one starts at the top. The shell's
  // <main> is the scrolling region; scrollIntoView would also nudge the
  // document and take the fixed header with it.
  useEffect(() => {
    const scroller = top.current?.closest('main')
    if (scroller) scroller.scrollTop = 0
  }, [step])

  useEffect(() => {
    if (lesson) dispatch({ type: 'lesson-step', lessonId, step })
  }, [dispatch, lesson, lessonId, step])

  // Arriving at step 9 is what finishes a lesson: everything before it had to
  // be satisfied to get here.
  useEffect(() => {
    if (lesson && step === TOTAL_STEPS) {
      dispatch({ type: 'lesson-complete', lessonId, topicId: lesson.topicId, today })
    }
  }, [dispatch, lesson, lessonId, step, today])

  const onProduce = useCallback(
    (passed: boolean) => {
      dispatch({ type: 'lesson-produce', lessonId, passed })
      if (passed) {
        setProduceDone(true)
        return
      }
      // Parsons as help: the same problem, as blocks, and the answer stays hidden.
      setDroppedBack(true)
      setFallbackDone(false)
      setStep(6)
    },
    [dispatch, lessonId],
  )

  if (!entry) {
    return <Missing />
  }

  if (state === 'locked') {
    const blocking = blockingPrerequisites(entry, progress.lessons)
    return (
      <Blocked
        title={entry.title}
        detail={`Finish ${blocking.map((prerequisite) => `${prerequisite.number}. ${prerequisite.title}`).join(' and ')} first.`}
      />
    )
  }

  if (!lesson) {
    return <Blocked title={entry.title} detail="This lesson is unlocked but has not been written yet." />
  }

  const stepKey = stepKeyAt(step)
  const promptCount = lesson.steps.worked.steps.filter((workedStep) => workedStep.prompt).length

  const satisfied = (() => {
    switch (stepKey) {
      case 'vocabulary':
      case 'model':
        return true
      case 'worked':
        return openPrompts.length >= promptCount
      case 'fadeLight':
        return lightDone
      case 'fadeHeavy':
        return heavyDone
      case 'parsons':
        return droppedBack ? fallbackDone : parsonsDone
      case 'produce':
        return produceDone
      case 'trap':
        return trapPick !== null
      case 'handoff':
        return true
    }
  })()

  const forwardLabel = (() => {
    if (stepKey === 'parsons' && droppedBack) return 'Back to writing it'
    if (stepKey === 'trap') return 'Finish the lesson'
    return 'Continue'
  })()

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-4" ref={top}>
      <div className="flex items-baseline justify-between gap-3">
        <Link to="/learn" className="data hover:text-ink">
          &larr; Topic map
        </Link>
        <span className="data">
          lesson {entry.number} of 58
        </span>
      </div>

      <h1 className="mt-2 text-lg font-semibold">{lesson.title}</h1>
      <p className="mt-1 text-sm leading-relaxed text-muted">{lesson.objective}</p>

      <StepIndicator step={step} />

      <div className="mt-4">
        {stepKey === 'vocabulary' ? <VocabularyStep terms={lesson.steps.vocabulary} /> : null}

        {/* Tappable on every step after the first, so a definition is never
            more than one tap away once the lesson has moved past it. */}
        {stepKey !== 'vocabulary' ? <VocabRecall terms={lesson.steps.vocabulary} /> : null}

        {stepKey === 'model' ? (
          <section>
            <Markdown className="mt-4">{lesson.steps.model.narrative}</Markdown>
            <Diagram spec={lesson.steps.model.diagram} />
            <p className="mt-4 border-l-2 border-accent bg-sheet p-3 text-sm font-semibold">
              {lesson.steps.model.takeaway}
            </p>
          </section>
        ) : null}

        {stepKey === 'worked' ? (
          <WorkedStep
            example={lesson.steps.worked}
            open={openPrompts}
            onOpen={(index) => setOpenPrompts((current) => (current.includes(index) ? current : [...current, index]))}
            remaining={promptCount - openPrompts.length}
          />
        ) : null}

        {stepKey === 'fadeLight' ? (
          <FadeStepView
            exercise={lesson.steps.fadeLight}
            heading="The last step is missing. Write it."
            done={lightDone}
            onDone={() => setLightDone(true)}
          />
        ) : null}

        {stepKey === 'fadeHeavy' ? (
          <FadeStepView
            exercise={lesson.steps.fadeHeavy}
            heading="Only the skeleton is left. Fill in the rest."
            done={heavyDone}
            onDone={() => setHeavyDone(true)}
          />
        ) : null}

        {stepKey === 'parsons' ? (
          droppedBack ? (
            <section>
              <p className="border-l-2 border-high bg-sheet p-3 text-sm leading-relaxed">
                Not that one. Rather than showing you the answer, here is the same problem as blocks. Get the order
                right and you go straight back to writing it out.
              </p>
              <ParsonsWidget
                key="fallback"
                exercise={lesson.steps.produce.fallback}
                level={progress.settings.level}
                solved={fallbackDone}
                onSolved={() => setFallbackDone(true)}
              />
            </section>
          ) : (
            <ParsonsWidget
              key="parsons"
              exercise={lesson.steps.parsons}
              level={progress.settings.level}
              solved={parsonsDone}
              onSolved={() => setParsonsDone(true)}
            />
          )
        ) : null}

        {stepKey === 'produce' ? (
          <ProduceStep exercise={lesson.steps.produce} done={produceDone} onResult={onProduce} />
        ) : null}

        {stepKey === 'trap' ? (
          <TrapStep
            trap={lesson.steps.trap}
            picked={trapPick}
            onPick={(index, correct) => {
              setTrapPick(index)
              dispatch({
                type: 'lesson-trap',
                misconceptionId: lesson.steps.trap.misconceptionId,
                correct,
                today,
              })
            }}
          />
        ) : null}

        {stepKey === 'handoff' ? <HandoffStep lesson={lesson} unaided={stored.passedUnaided} /> : null}
      </div>

      <div className="mt-8 flex gap-2 border-t border-rule pt-4">
        <button
          type="button"
          onClick={() => (step === 1 ? navigate('/learn') : setStep(step - 1))}
          className="min-h-12 flex-1 rounded-sm border border-rule text-sm text-muted hover:text-ink"
        >
          Back
        </button>
        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={() => setStep(droppedBack && stepKey === 'parsons' ? 7 : step + 1)}
            disabled={!satisfied}
            className="min-h-12 flex-[2] rounded-sm bg-accent text-sm font-semibold text-accent-ink disabled:opacity-40"
          >
            {forwardLabel}
          </button>
        ) : (
          <Link
            to="/learn"
            className="flex min-h-12 flex-[2] items-center justify-center rounded-sm bg-accent text-sm font-semibold text-accent-ink"
          >
            Back to the topic map
          </Link>
        )}
      </div>

      {!satisfied && step < TOTAL_STEPS ? (
        <p className="mt-2 text-center text-xs text-faint">{whyBlocked(stepKey, promptCount - openPrompts.length)}</p>
      ) : null}
    </div>
  )
}

function whyBlocked(stepKey: string, promptsLeft: number): string {
  if (stepKey === 'worked') {
    return `Open ${promptsLeft} more question${promptsLeft === 1 ? '' : 's'} before moving on. Answering them to yourself is what makes a worked example work.`
  }
  if (stepKey === 'trap') return 'Pick an answer. Getting it wrong is fine and is recorded as a weak spot, not a failure.'
  return 'Finish this step to go on. Back always works.'
}

// ------------------------------------------------------------------ chrome

function StepIndicator({ step }: { step: number }) {
  const key = stepKeyAt(step)
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">{STEP_TITLES[key]}</span>
        <span className="data">
          step {step} of {TOTAL_STEPS}
        </span>
      </div>
      <ol className="mt-1.5 flex gap-1" aria-label={`Step ${step} of ${TOTAL_STEPS}`}>
        {Array.from({ length: TOTAL_STEPS }, (_, index) => (
          <li
            key={index}
            className={`h-1.5 flex-1 ${index + 1 < step ? 'bg-accent' : index + 1 === step ? 'bg-rule-strong' : 'bg-rule'}`}
          />
        ))}
      </ol>
    </div>
  )
}

function Missing() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 text-center">
      <h1 className="text-lg font-semibold">No such lesson</h1>
      <Link to="/learn" className="mt-4 inline-block text-sm text-accent underline underline-offset-2">
        Back to the topic map
      </Link>
    </div>
  )
}

function Blocked({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 text-center">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">{detail}</p>
      <Link to="/learn" className="mt-4 inline-block text-sm text-accent underline underline-offset-2">
        Back to the topic map
      </Link>
    </div>
  )
}

// ------------------------------------------------------------------- step 1

function VocabularyStep({ terms }: { terms: VocabTerm[] }) {
  return (
    <section>
      <p className="text-sm leading-relaxed text-muted">
        The words first, before anything is explained with them. Nothing here needs to be memorised; they stay one tap
        away for the rest of the lesson.
      </p>
      <dl className="mt-3 sheet ruled">
        {terms.map((term) => (
          <div key={term.term} className="px-3 py-3">
            <dt className="font-mono text-code font-semibold">{term.term}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-muted">{term.definition}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/** The same terms, tappable, on every step after the first. */
function VocabRecall({ terms }: { terms: VocabTerm[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const current = terms.find((term) => term.term === open)
  return (
    <section aria-label="Vocabulary from step 1">
      <ul className="flex flex-wrap gap-1.5">
        {terms.map((term) => (
          <li key={term.term}>
            <button
              type="button"
              aria-pressed={open === term.term}
              onClick={() => setOpen(open === term.term ? null : term.term)}
              className={`min-h-9 rounded-sm border px-2 font-mono text-[11px] ${
                open === term.term ? 'border-accent bg-accent-soft text-ink' : 'border-rule bg-raised text-muted'
              }`}
            >
              {term.term}
            </button>
          </li>
        ))}
      </ul>
      {current ? <p className="mt-2 border-l-2 border-accent bg-sheet p-3 text-sm text-muted">{current.definition}</p> : null}
    </section>
  )
}

// ------------------------------------------------------------------- step 3

function WorkedStep({
  example,
  open,
  onOpen,
  remaining,
}: {
  example: WorkedExample
  open: number[]
  onOpen: (index: number) => void
  remaining: number
}) {
  return (
    <section className="mt-4">
      <p className="sheet p-3 text-sm leading-relaxed">{example.task}</p>
      <p className="mt-2 text-xs text-faint">
        Nothing to write here. Read each step and answer the questions in your head before you open them.
        {remaining > 0 ? ` ${remaining} left to open.` : ''}
      </p>

      <ol className="mt-3 space-y-3">
        {example.steps.map((step, index) => (
          <li key={step.label} className="sheet p-3">
            <p className="data">
              {index + 1}. {step.label}
            </p>
            <pre className="mt-2 overflow-x-auto border-l-2 border-rule-strong bg-raised p-2 font-mono text-code">
              {step.code}
            </pre>
            <p className="mt-2 text-sm leading-relaxed text-muted">{step.why}</p>
            {step.prompt ? (
              <div className="mt-3 border-t border-rule pt-3">
                <p className="text-sm font-semibold">{step.prompt.question}</p>
                {open.includes(index) ? (
                  <p className="mt-2 border-l-2 border-accent pl-3 text-sm leading-relaxed text-muted">
                    {step.prompt.answer}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpen(index)}
                    className="mt-2 min-h-11 w-full rounded-sm border border-rule text-sm text-muted hover:text-ink"
                  >
                    Say it to yourself first, then open
                  </button>
                )}
              </div>
            ) : null}
          </li>
        ))}
      </ol>

      <p className="mt-3 border-l-2 border-accent bg-sheet p-3 text-sm">
        <span className="eyebrow block">What it returns</span>
        <span className="mt-1 block leading-relaxed">{example.result}</span>
      </p>
    </section>
  )
}

// ---------------------------------------------------------------- steps 4, 5

function FadeStepView({
  exercise,
  heading,
  done,
  onDone,
}: {
  exercise: FadeExercise
  heading: string
  done: boolean
  onDone: () => void
}) {
  const blanks = useMemo(() => blankedIndices(exercise.steps.length, exercise.blanks), [exercise])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [wrong, setWrong] = useState<number[]>([])

  const check = () => {
    const failed = blanks.filter((index) => !fadeAnswerAccepted(exercise, index, answers[index] ?? ''))
    setWrong(failed)
    if (failed.length === 0) onDone()
  }

  return (
    <section className="mt-4">
      <p className="text-sm font-semibold">{heading}</p>
      <p className="mt-2 sheet p-3 text-sm leading-relaxed">{exercise.task}</p>

      <ol className="mt-3 space-y-3">
        {exercise.steps.map((step, index) => {
          const blanked = blanks.includes(index)
          const filled = done || (!wrong.includes(index) && wrong.length > 0 && blanked)
          return (
            <li key={step.label} className="sheet p-3">
              <p className="data">
                {index + 1}. {step.label}
              </p>
              {!blanked || done ? (
                <>
                  <pre className="mt-2 overflow-x-auto border-l-2 border-rule-strong bg-raised p-2 font-mono text-code">
                    {step.code}
                  </pre>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{step.why}</p>
                </>
              ) : (
                <div className="mt-2">
                  <label className="block">
                    <span className="sr-only">Write step {index + 1}</span>
                    <textarea
                      value={answers[index] ?? ''}
                      onChange={(event) => setAnswers({ ...answers, [index]: event.target.value })}
                      rows={2}
                      spellCheck={false}
                      autoCapitalize="off"
                      autoCorrect="off"
                      autoComplete="off"
                      placeholder="write this step"
                      className={`w-full resize-y rounded-sm border bg-raised p-2 font-mono text-code ${
                        wrong.includes(index) ? 'border-high' : 'border-rule'
                      }`}
                    />
                  </label>
                  {wrong.includes(index) ? (
                    <p className="mt-1 text-xs text-muted">
                      Not yet. The step above it is the clue: this one has to finish the job it started.
                    </p>
                  ) : null}
                  {filled ? <p className="mt-1 text-xs text-accent">That one is right.</p> : null}
                </div>
              )}
            </li>
          )
        })}
      </ol>

      {done ? (
        <p className="mt-4 border-l-2 border-accent bg-sheet p-3 text-sm leading-relaxed">{exercise.closing}</p>
      ) : (
        <button
          type="button"
          onClick={check}
          className="mt-4 min-h-12 w-full rounded-sm bg-accent text-sm font-semibold text-accent-ink"
        >
          Check it
        </button>
      )}
    </section>
  )
}

// ------------------------------------------------------------------- step 7

function ProduceStep({
  exercise,
  done,
  onResult,
}: {
  exercise: ProduceExercise
  done: boolean
  onResult: (passed: boolean) => void
}) {
  const [draft, setDraft] = useState(exercise.starter)
  const [running, setRunning] = useState(false)
  const [ready, setReady] = useState(false)
  const [rows, setRows] = useState<QueryResult | null>(null)
  const [result, setResult] = useState<GradeResult | null>(null)

  // SQLite is over a megabyte, so it is only fetched once a learner actually
  // reaches free production, and warmed while they are reading the task.
  useEffect(() => {
    let cancelled = false
    import('../lib/sql/db.ts')
      .then((module) => module.runQuery('SELECT 1;'))
      .then(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const run = async () => {
    setRunning(true)
    try {
      const { runQuery } = await import('../lib/sql/db.ts')
      const outcome = await runQuery(draft)
      if (!outcome.ok) {
        setRows(null)
        setResult(gradeError(outcome.error))
        onResult(false)
        return
      }
      const reference = await runQuery(exercise.referenceSql)
      const mine = outcome.results[outcome.results.length - 1] ?? null
      const theirs = reference.ok ? (reference.results[reference.results.length - 1] ?? null) : null
      setRows(mine)
      const graded = grade(mine, theirs, orderMatters(exercise.task, exercise.referenceSql))
      setResult(graded)
      onResult(graded.verdict === 'correct')
    } finally {
      setRunning(false)
    }
  }

  return (
    <section className="mt-4">
      <p className="sheet p-3 text-sm leading-relaxed">{exercise.task}</p>
      <SchemaPanel />

      <label className="mt-3 block">
        <span className="text-xs text-muted">Your query</span>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={6}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          className="mt-1 w-full resize-y rounded-sm border border-rule bg-raised p-3 font-mono text-code leading-relaxed"
        />
      </label>

      <button
        type="button"
        onClick={run}
        disabled={running || draft.trim().length === 0}
        className="min-h-12 w-full rounded-sm bg-accent text-sm font-semibold text-accent-ink disabled:opacity-50"
      >
        {running ? 'Running' : ready ? 'Run it' : 'Loading SQLite'}
      </button>

      {result && result.verdict !== 'correct' ? (
        <div className="mt-3 border border-high/60 bg-sheet p-3">
          <p className="text-sm font-semibold">Not this one</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{result.hint}</p>
          {result.errorMessage ? (
            <pre className="mt-2 overflow-x-auto font-mono text-xs whitespace-pre-wrap text-critical">
              {result.errorMessage}
            </pre>
          ) : null}
        </div>
      ) : null}

      {rows ? (
        <div className="mt-3">
          <ResultTable result={rows} />
        </div>
      ) : null}

      {done ? (
        <p className="mt-3 border-l-2 border-accent bg-sheet p-3 text-sm leading-relaxed">{exercise.closing}</p>
      ) : null}
    </section>
  )
}

function SchemaPanel() {
  return (
    <details className="mt-3 sheet">
      <summary className="flex min-h-12 cursor-pointer items-center px-3 text-sm font-semibold">
        Schema, {content.sqlSchemaTables.length} tables
      </summary>
      <div className="border-t border-rule px-3 pb-3">
        <Markdown>{'```sql\n' + content.sqlSchema + '\n```'}</Markdown>
      </div>
    </details>
  )
}

// ------------------------------------------------------------------- step 8

function TrapStep({
  trap,
  picked,
  onPick,
}: {
  trap: TrapExercise
  picked: number | null
  onPick: (index: number, correct: boolean) => void
}) {
  const misconception = getMisconception(trap.misconceptionId)
  const answered = picked !== null
  const gotIt = answered && trap.options[picked]?.correct === true

  return (
    <section className="mt-4">
      <p className="text-sm font-semibold">This looks right. It is not.</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{trap.setup}</p>

      <pre className="mt-3 overflow-x-auto border border-rule border-l-2 border-l-critical bg-raised p-3 font-mono text-code">
        {trap.code}
      </pre>

      <p className="mt-3 text-sm font-semibold">{trap.question}</p>
      <ul className="mt-2 space-y-2">
        {trap.options.map((option, index) => {
          const show = answered && (index === picked || option.correct)
          return (
            <li key={option.text}>
              <button
                type="button"
                disabled={answered}
                onClick={() => onPick(index, option.correct)}
                className={`w-full rounded-sm border p-3 text-left text-sm leading-relaxed disabled:cursor-default ${
                  !show ? 'border-rule bg-sheet' : option.correct ? 'border-easy bg-sheet' : 'border-missed bg-sheet'
                }`}
              >
                {option.text}
                {show ? (
                  <span className={`mt-1 block text-xs font-semibold ${option.correct ? 'text-easy' : 'text-missed'}`}>
                    {option.correct ? 'this one' : 'not this'}
                  </span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>

      {answered ? (
        <div className="mt-4 space-y-3">
          <div className="sheet p-3">
            <p className="eyebrow">What it silently does</p>
            <p className="mt-1 text-sm leading-relaxed">{trap.silently}</p>
          </div>
          <div className="sheet p-3">
            <p className="eyebrow">Why people believe it</p>
            {misconception ? (
              <p className="mt-1 text-sm leading-relaxed text-muted">
                <span className="font-semibold text-ink">{misconception.name}.</span> {misconception.belief}
              </p>
            ) : null}
            <p className="mt-2 text-sm leading-relaxed">{trap.explanation}</p>
          </div>
          {!gotIt ? (
            <p className="border-l-2 border-high bg-sheet p-3 text-sm text-muted">
              Recorded as a weak spot. If a later lesson tests the same misconception and you get it right, it clears.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

// ------------------------------------------------------------------- step 9

function HandoffStep({ lesson, unaided }: { lesson: Lesson; unaided: boolean }) {
  const misconception = getMisconception(lesson.steps.trap.misconceptionId)
  const topic = getTopic(lesson.topicId)
  const questions = lesson.practice.questionIds.map(getQuestion).filter((question) => question !== undefined)
  const facts = lesson.practice.factIds.map(getFact).filter((fact) => fact !== undefined)

  return (
    <section className="mt-4">
      <div className="sheet p-4">
        <p className="eyebrow">Lesson complete</p>
        <h2 className="mt-1 text-base font-semibold">What you can now do</h2>
        <ul className="mt-2 space-y-1.5">
          {lesson.steps.handoff.canNow.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-relaxed">
              <span className="text-accent">&#10003;</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-faint">
          {unaided
            ? 'You wrote step 7 without falling back to the blocks. That counts towards fluency in this topic.'
            : 'You needed the blocks at step 7, so this one does not count towards fluency. That is what they are for.'}
        </p>
      </div>

      {misconception ? (
        <div className="mt-3 sheet p-4">
          <p className="eyebrow">The trap you were just shown</p>
          <p className="mt-1 text-sm font-semibold">{misconception.name}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{misconception.belief}</p>
        </div>
      ) : null}

      <div className="mt-3">
        <p className="text-sm leading-relaxed text-muted">{lesson.steps.handoff.note}</p>

        {questions.length > 0 ? (
          <Link
            to={`/practice?lesson=${lesson.id}`}
            className="mt-3 flex min-h-14 items-center justify-center rounded-sm bg-accent px-4 text-sm font-semibold text-accent-ink"
          >
            Practise the {questions.length} question{questions.length === 1 ? '' : 's'} from this lesson
          </Link>
        ) : null}

        {facts.length > 0 ? (
          <Link
            to={`/drill?lesson=${lesson.id}`}
            className="mt-2 flex min-h-12 items-center justify-center rounded-sm border border-rule px-4 text-sm text-muted hover:text-ink"
          >
            Drill the {facts.length} fact{facts.length === 1 ? '' : 's'} from this lesson
          </Link>
        ) : null}

        {questions.length === 0 && facts.length === 0 ? (
          <Link
            to="/sandbox"
            className="mt-3 flex min-h-12 items-center justify-center rounded-sm border border-rule px-4 text-sm text-muted hover:text-ink"
          >
            Keep exploring in the query sandbox
          </Link>
        ) : null}

        <p className="mt-3 text-xs leading-relaxed text-faint">
          {topic ? `Practice started from here is blocked to this lesson: same material, repeated, while you are still inside ${topic.title}.` : ''}
        </p>
      </div>
    </section>
  )
}
