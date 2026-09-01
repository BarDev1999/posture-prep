import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Markdown } from '../components/Markdown.tsx'
import { ResultTable } from '../components/ResultTable.tsx'
import { BlanksWidget } from '../components/learn/BlanksWidget.tsx'
import { Diagram } from '../components/learn/Diagram.tsx'
import { ParsonsWidget } from '../components/learn/ParsonsWidget.tsx'
import { RuleBuilder } from '../components/learn/RuleBuilder.tsx'
import { TraceStepper } from '../components/learn/TraceStepper.tsx'
import { curriculumEntry, getTopic } from '../data/curriculum.ts'
import type { CurriculumEntry } from '../data/curriculum.ts'
import { loadLesson } from '../data/lessons/index.ts'
import { getMisconception } from '../data/misconceptions.ts'
import { content, getFact, getQuestion } from '../lib/content.ts'
import { todayISO } from '../lib/date.ts'
import {
  TOTAL_STEPS,
  blankedIndices,
  blockingPrerequisites,
  fadeAnswerAccepted,
  guidanceTierNote,
  lessonProgress,
  lessonState,
  stepKeyAt,
  stepsForTier,
  topicProgress,
} from '../lib/learn.ts'
import { seededIndexes, seededOrder } from '../lib/shuffle.ts'
import { grade, gradeError, orderMatters } from '../lib/sql/grade.ts'
import type { GradeResult } from '../lib/sql/grade.ts'
import type { QueryResult } from '../lib/sql/types.ts'
import { useAppDispatch, useProgress } from '../state/AppContext.tsx'
import { STEP_KEYS, STEP_TITLES } from '../types/lesson.ts'
import type {
  FadeExercise,
  Lesson,
  ProduceExercise,
  StepKey,
  TrapExercise,
  VocabTerm,
  WorkedExample,
} from '../types/lesson.ts'

/**
 * The lesson player. One step per screen, nine of them, always in order.
 *
 * Forward is only allowed when the current step is satisfied, and what counts
 * as satisfied is different per step: reading is enough for the first two, the
 * worked example wants its self explanation prompts opened and its trace walked
 * to the end, and the exercises want a right answer. Back is always allowed,
 * including back out of the lesson.
 *
 * Two things can shorten the walk. The guidance tier hides steps the learner
 * has outgrown, automatically, per topic. And any exercise step can be skipped
 * by hand, which costs the lesson its clean completion and says so.
 */
export default function Lesson() {
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
  const stored = lessonProgress(progress.lessons, lessonId)
  const guided = progress.settings.guidedOrder
  const state = entry ? lessonState(entry, progress.lessons, guided) : 'locked'

  // A topic's lessons are their own chunk, fetched on the way in. The component
  // is keyed on the lesson id, so this runs once per lesson opened and the
  // second lesson in the same topic is served from the cache in the loader.
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  useEffect(() => {
    let cancelled = false
    loadLesson(lessonId).then(
      (loaded) => {
        if (!cancelled) setLesson(loaded ?? null)
      },
      () => {
        if (!cancelled) setLoadFailed(true)
      },
    )
    return () => {
      cancelled = true
    }
  }, [lessonId])

  const [step, setStep] = useState(() => Math.min(TOTAL_STEPS, Math.max(1, stored.currentStep)))
  const [openPrompts, setOpenPrompts] = useState<number[]>([])
  const [traceDone, setTraceDone] = useState(false)
  const [lightDone, setLightDone] = useState(false)
  const [heavyDone, setHeavyDone] = useState(false)
  const [parsonsDone, setParsonsDone] = useState(false)
  const [fallbackDone, setFallbackDone] = useState(false)
  const [droppedBack, setDroppedBack] = useState(false)
  const [produceDone, setProduceDone] = useState(false)
  const [trapPick, setTrapPick] = useState<number | null>(null)
  const [skipped, setSkipped] = useState<StepKey[]>([])
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
  // be satisfied, or deliberately skipped, to get here.
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

  const skipStep = useCallback(
    (key: StepKey) => {
      setSkipped((current) => (current.includes(key) ? current : [...current, key]))
      dispatch({ type: 'lesson-aided', lessonId })
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
        detail={`Guided order is on in settings, so this opens once you finish ${blocking.map((prerequisite) => `${prerequisite.number}. ${prerequisite.title}`).join(' and ')}.`}
      />
    )
  }

  if (!lesson) {
    if (loadFailed) {
      return <Blocked title={entry.title} detail="This lesson could not be loaded. Check the connection and try again." />
    }
    if (state === 'unwritten') {
      return <Blocked title={entry.title} detail="This lesson is open but has not been written yet." />
    }
    return (
      <p className="mx-auto w-full max-w-2xl px-4 py-8 text-sm text-muted" role="status">
        Loading lesson {entry.number}
      </p>
    )
  }

  const tier = topicProgress(progress.topics, lesson.topicId).guidanceTier
  // The fallback lives on step 6, so that step stays reachable after a failed
  // step 7 even at a tier that normally hides it.
  const visible = new Set<StepKey>([...stepsForTier(tier), ...(droppedBack ? (['parsons'] as StepKey[]) : [])])
  const stepKey = stepKeyAt(step)
  const promptCount = lesson.steps.worked.steps.filter((workedStep) => workedStep.prompt).length
  const wasSkipped = skipped.includes(stepKey)

  const nextVisible = (from: number): number => {
    for (let candidate = from + 1; candidate <= TOTAL_STEPS; candidate++) {
      if (visible.has(STEP_KEYS[candidate - 1] as StepKey)) return candidate
    }
    return TOTAL_STEPS
  }
  const previousVisible = (from: number): number | null => {
    for (let candidate = from - 1; candidate >= 1; candidate--) {
      if (visible.has(STEP_KEYS[candidate - 1] as StepKey)) return candidate
    }
    return null
  }

  const satisfied = (() => {
    if (wasSkipped) return true
    switch (stepKey) {
      case 'vocabulary':
      case 'model':
        return true
      case 'worked':
        return openPrompts.length >= promptCount && (lesson.steps.worked.trace === undefined || traceDone)
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

  const canSkipStep =
    !wasSkipped &&
    !satisfied &&
    (stepKey === 'worked' ||
      stepKey === 'fadeLight' ||
      stepKey === 'fadeHeavy' ||
      (stepKey === 'parsons' && !droppedBack) ||
      stepKey === 'produce')

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-4" ref={top}>
      <div className="flex items-baseline justify-between gap-3">
        <Link to="/learn" className="data hover:text-ink">
          &larr; Topic map
        </Link>
        <span className="data">lesson {entry.number} of 58</span>
      </div>

      <h1 className="mt-2 text-lg font-semibold">{lesson.title}</h1>
      <p className="mt-1 text-sm leading-relaxed text-muted">{lesson.objective}</p>

      {tier !== 'full' ? (
        <p className="mt-3 border-l-2 border-accent bg-sheet p-3 text-xs leading-relaxed text-muted">
          <span className="font-semibold text-ink">Guidance faded.</span> {guidanceTierNote(tier)} You earned this by
          finishing step 7 unaided; the difficulty control in settings still overrides it downward.
        </p>
      ) : null}

      <StepIndicator step={step} visible={visible} skipped={skipped} onJump={setStep} />

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
            traceDone={traceDone}
            onTraceDone={() => setTraceDone(true)}
          />
        ) : null}

        {/* Faded out of the walk, but never taken away: the worked example is
            one tap from the step that replaced it. */}
        {(stepKey === 'fadeLight' && tier === 'faded') || (stepKey === 'produce' && tier === 'minimal') ? (
          <details className="mt-4 sheet">
            <summary className="flex min-h-12 cursor-pointer items-center px-3 text-sm font-semibold">
              Open the worked example
            </summary>
            <div className="border-t border-rule px-3 pb-3">
              <WorkedStep
                example={lesson.steps.worked}
                open={lesson.steps.worked.steps.map((_, index) => index)}
                onOpen={() => {}}
                remaining={0}
                traceDone
                onTraceDone={() => {}}
              />
            </div>
          </details>
        ) : null}

        {stepKey === 'fadeLight' ? (
          <FadeStepView
            exercise={lesson.steps.fadeLight}
            heading="The last step is missing. Write it."
            done={lightDone || wasSkipped}
            onDone={() => setLightDone(true)}
          />
        ) : null}

        {stepKey === 'fadeHeavy' ? (
          <FadeStepView
            exercise={lesson.steps.fadeHeavy}
            heading="Only the skeleton is left. Fill in the rest."
            done={heavyDone || wasSkipped}
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
              solved={parsonsDone || wasSkipped}
              onSolved={() => setParsonsDone(true)}
            />
          )
        ) : null}

        {stepKey === 'produce' ? (
          <ProduceStep exercise={lesson.steps.produce} done={produceDone || wasSkipped} onResult={onProduce} />
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

        {stepKey === 'handoff' ? (
          <HandoffStep
            lesson={lesson}
            entry={entry}
            unaided={stored.passedUnaided}
            skippedSteps={skipped.length}
          />
        ) : null}
      </div>

      <div className="mt-8 flex gap-2 border-t border-rule pt-4">
        <button
          type="button"
          onClick={() => {
            const back = previousVisible(step)
            if (back === null) navigate('/learn')
            else setStep(back)
          }}
          className="min-h-12 flex-1 rounded-sm border border-rule text-sm text-muted hover:text-ink"
        >
          Back
        </button>
        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={() => setStep(droppedBack && stepKey === 'parsons' ? 7 : nextVisible(step))}
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

      {canSkipStep ? (
        <button
          type="button"
          onClick={() => skipStep(stepKey)}
          className="mt-3 min-h-11 w-full text-xs text-faint underline underline-offset-2 hover:text-muted"
        >
          I know this already, skip the step
        </button>
      ) : null}

      {wasSkipped ? (
        <p className="mt-3 text-center text-xs text-faint">
          Step skipped. The lesson still finishes; it just stops counting towards fluency in this topic.
        </p>
      ) : null}
    </div>
  )
}

function whyBlocked(stepKey: string, promptsLeft: number): string {
  if (stepKey === 'worked') {
    return promptsLeft > 0
      ? `Open ${promptsLeft} more question${promptsLeft === 1 ? '' : 's'} before moving on. Answering them to yourself is what makes a worked example work.`
      : 'Walk the trace to the last line. Predicting and then watching is the whole point of this step.'
  }
  if (stepKey === 'trap') return 'Pick an answer. Getting it wrong is fine and is recorded as a weak spot, not a failure.'
  return 'Finish this step to go on. Back always works.'
}

// ------------------------------------------------------------------ chrome

/**
 * The nine steps as a rule of segments, and a way back into any of them.
 *
 * Forward stays gated: a step is reachable once it has been reached. Backward
 * is not, and a learner who wants to reread the mental model in the middle of
 * the trap should not have to press Back six times to get there.
 */
function StepIndicator({
  step,
  visible,
  skipped,
  onJump,
}: {
  step: number
  visible: Set<StepKey>
  skipped: StepKey[]
  onJump: (step: number) => void
}) {
  const key = stepKeyAt(step)
  const shownCount = STEP_KEYS.filter((candidate) => visible.has(candidate)).length
  const position = STEP_KEYS.slice(0, step).filter((candidate) => visible.has(candidate)).length
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">{STEP_TITLES[key]}</span>
        <span className="data">
          step {Math.max(1, position)} of {shownCount}
        </span>
      </div>
      <ol className="mt-1.5 flex gap-1" aria-label={`Step ${position} of ${shownCount}`}>
        {STEP_KEYS.map((candidate, index) => {
          const hidden = !visible.has(candidate)
          const wasSkipped = skipped.includes(candidate)
          const passed = index + 1 < step
          const bar = `h-1.5 w-full ${
            hidden
              ? 'bg-rule opacity-30'
              : wasSkipped
                ? 'bg-rule-strong opacity-60'
                : passed
                  ? 'bg-accent'
                  : index + 1 === step
                    ? 'bg-rule-strong'
                    : 'bg-rule'
          }`
          return (
            <li key={candidate} className="flex-1">
              {passed && !hidden ? (
                <button
                  type="button"
                  onClick={() => onJump(index + 1)}
                  className="flex h-6 w-full items-center"
                  title={`Back to ${STEP_TITLES[candidate].toLowerCase()}`}
                  aria-label={`Back to step ${index + 1}, ${STEP_TITLES[candidate]}`}
                >
                  <span className={bar} />
                </button>
              ) : (
                <span className="flex h-6 items-center" title={STEP_TITLES[candidate]}>
                  <span className={bar} />
                </span>
              )}
            </li>
          )
        })}
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
  traceDone,
  onTraceDone,
}: {
  example: WorkedExample
  open: number[]
  onOpen: (index: number) => void
  remaining: number
  traceDone: boolean
  onTraceDone: () => void
}) {
  return (
    <section className="mt-4">
      <p className="sheet p-3 text-sm leading-relaxed">{example.task}</p>
      <p className="mt-2 text-xs text-faint">
        Nothing to write here. Read each step and answer the questions in your head before you open them.
        {remaining > 0 ? ` ${remaining} left to open.` : ''}
      </p>

      {example.trace ? <TraceStepper trace={example.trace} done={traceDone} onDone={onTraceDone} /> : null}

      <ol className="mt-3 space-y-3">
        {example.steps.map((step, index) => (
          <li key={step.label} className="sheet p-3">
            <p className="data">
              {index + 1}. {step.label}
            </p>
            {step.prose ? (
              <p className="mt-2 border-l-2 border-rule-strong bg-raised p-2 text-sm leading-relaxed">{step.code}</p>
            ) : (
              <pre className="mt-2 overflow-x-auto border-l-2 border-rule-strong bg-raised p-2 font-mono text-code">
                {step.code}
              </pre>
            )}
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
                  {step.prose ? (
                    <p className="mt-2 border-l-2 border-rule-strong bg-raised p-2 text-sm leading-relaxed">
                      {step.code}
                    </p>
                  ) : (
                    <pre className="mt-2 overflow-x-auto border-l-2 border-rule-strong bg-raised p-2 font-mono text-code">
                      {step.code}
                    </pre>
                  )}
                  <p className="mt-2 text-sm leading-relaxed text-muted">{step.why}</p>
                </>
              ) : step.choices ? (
                <div className="mt-2">
                  <ul className="space-y-1.5">
                    {seededOrder(step.choices, `${exercise.task}:${step.label}`).map((choice) => {
                      const picked = (answers[index] ?? '') === choice
                      return (
                        <li key={choice}>
                          <button
                            type="button"
                            aria-pressed={picked}
                            onClick={() => setAnswers((current) => ({ ...current, [index]: choice }))}
                            className={`w-full rounded-sm border p-2.5 text-left text-sm leading-relaxed ${
                              picked
                                ? 'border-accent bg-accent-soft'
                                : wrong.includes(index)
                                  ? 'border-high bg-raised'
                                  : 'border-rule bg-raised'
                            }`}
                          >
                            {choice}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                  {wrong.includes(index) ? (
                    <p className="mt-1 text-xs text-muted">
                      Not that one. Read the row above it: this row has to finish the job that one started.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="mt-2">
                  <label className="block">
                    <span className="sr-only">Write step {index + 1}</span>
                    <textarea
                      value={answers[index] ?? ''}
                      onChange={(event) => setAnswers((current) => ({ ...current, [index]: event.target.value }))}
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
  return (
    <section className="mt-4">
      <p className="sheet p-3 text-sm leading-relaxed">{exercise.task}</p>

      {exercise.kind === 'sql' ? <SqlProduce exercise={exercise} onResult={onResult} /> : null}
      {exercise.kind === 'python' ? <BlanksWidget exercise={exercise} done={done} onResult={onResult} /> : null}
      {exercise.kind === 'rule' ? <RuleBuilder rows={exercise.rows} done={done} onResult={onResult} /> : null}

      {done ? (
        <p className="mt-3 border-l-2 border-accent bg-sheet p-3 text-sm leading-relaxed">{exercise.closing}</p>
      ) : null}
    </section>
  )
}

function SqlProduce({
  exercise,
  onResult,
}: {
  exercise: Extract<ProduceExercise, { kind: 'sql' }>
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
    <>
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
    </>
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
  // Authored with the right answer wherever it fell as the question was
  // written. Shown in a seeded order, so position teaches nothing.
  const order = useMemo(() => seededIndexes(trap.options.length, trap.question), [trap.options.length, trap.question])

  return (
    <section className="mt-4">
      <p className="text-sm font-semibold">This looks right. It is not.</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{trap.setup}</p>

      <pre className="mt-3 overflow-x-auto border border-rule border-l-2 border-l-critical bg-raised p-3 font-mono text-code">
        {trap.code}
      </pre>

      <p className="mt-3 text-sm font-semibold">{trap.question}</p>
      <ul className="mt-2 space-y-2">
        {order.map((index) => {
          const option = trap.options[index]
          if (!option) return null
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

function HandoffStep({
  lesson,
  entry,
  unaided,
  skippedSteps,
}: {
  lesson: Lesson
  entry: CurriculumEntry
  unaided: boolean
  skippedSteps: number
}) {
  const misconception = getMisconception(lesson.steps.trap.misconceptionId)
  const topic = getTopic(lesson.topicId)
  const questions = entry.practice.questionIds.map(getQuestion).filter((question) => question !== undefined)
  const facts = entry.practice.factIds.map(getFact).filter((fact) => fact !== undefined)

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
          {skippedSteps > 0
            ? `You skipped ${skippedSteps} step${skippedSteps === 1 ? '' : 's'}, so this one does not count towards fluency in this topic. Nothing else about it changes.`
            : unaided
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
          {topic
            ? `Practice started from here is blocked to this lesson: same material, repeated, while you are still inside ${topic.title}.`
            : ''}
        </p>
      </div>
    </section>
  )
}
