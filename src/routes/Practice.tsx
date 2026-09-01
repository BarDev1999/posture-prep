import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Markdown } from '../components/Markdown.tsx'
import { CodeDiff } from '../components/CodeDiff.tsx'
import { curriculumEntry } from '../data/curriculum.ts'
import { schedulePlan } from '../lib/learn.ts'
import { articleById, questions, sections } from '../lib/content.ts'
import { todayISO } from '../lib/date.ts'
import { buildPracticeQueue, reduceOptions, reviewQueueSize } from '../lib/practice.ts'
import type { PracticeFilters } from '../lib/practice.ts'
import { useAppDispatch, useProgress } from '../state/AppContext.tsx'
import type { Question, QuestionFormat } from '../types/content.ts'
import type { QuestionResult } from '../types/progress.ts'

/**
 * Question practice. One question per screen, the answer always behind an
 * action, and the explanation from file C the moment the attempt is made.
 *
 * SQL questions are served by the query sandbox instead, where an answer can
 * actually be run, so this screen links across rather than asking for a query
 * typed into a box that cannot execute it.
 */

const FORMATS: QuestionFormat[] = ['MCQ', 'short', 'scenario', 'Python', 'SQL']
const SELF_GRADES: { value: QuestionResult; label: string; tone: string }[] = [
  { value: 'wrong', label: 'Missed it', tone: 'text-missed border-missed/50' },
  { value: 'partial', label: 'Partial', tone: 'text-hard border-hard/50' },
  { value: 'correct', label: 'Got it', tone: 'text-easy border-easy/50' },
]

export function Practice() {
  const progress = useProgress()
  const dispatch = useAppDispatch()
  const today = todayISO()
  const level = progress.settings.level

  // A lesson handoff arrives as ?lesson=L4 and pins practice to that lesson's
  // questions. This is the blocked half of the hybrid schedule: while a topic
  // is being learned, practice on it is the same small set, repeated.
  const [search, setSearch] = useSearchParams()
  const lesson = curriculumEntry(search.get('lesson') ?? '')

  // The interleaved half of the same schedule, arriving as ?mix=studied: the
  // sections whose Learn topics are finished, mixed together. It filters the
  // pool and never hides a section from the picker.
  const plan = useMemo(() => schedulePlan(progress.lessons), [progress.lessons])
  const mixStudied = search.get('mix') === 'studied' && !lesson
  const mixSections = mixStudied && plan.mode === 'interleaved' ? plan.sections : null
  const blockedSection = mixStudied && plan.mode === 'blocked' ? plan.activeSection : null

  const [filters, setFilters] = useState<PracticeFilters>({ sectionId: null, formats: null })
  const [queue, setQueue] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)
  const [written, setWritten] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [showWhy, setShowWhy] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const progressRef = useRef(progress.questions)
  useEffect(() => {
    progressRef.current = progress.questions
  })

  const filterKey = `${filters.sectionId}|${filters.formats?.join(',') ?? 'all'}|${level}|${lesson?.id ?? ''}|${mixSections?.join(',') ?? ''}|${blockedSection ?? ''}`
  useEffect(() => {
    // "All" means everything except queries, which are answered in the sandbox
    // where they can actually run. Picking the SQL chip still brings them here.
    const effective: PracticeFilters = lesson
      ? { sectionId: null, formats: null, questionIds: lesson.practice.questionIds }
      : {
          ...filters,
          sectionId: filters.sectionId ?? blockedSection,
          sections: mixSections,
          formats: filters.formats ?? ['MCQ', 'short', 'scenario', 'Python'],
        }
    const built = buildPracticeQueue(questions, progressRef.current, level, effective, today)
    setQueue(built.order)
    setIndex(0)
    setAnswered(false)
    setPicked(null)
    setWritten('')
    setShowHint(false)
    setShowWhy(false)
    // filterKey folds the filter object and level into one stable dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, today])

  const startedAt = useRef(Date.now())
  useEffect(() => {
    startedAt.current = Date.now()
    setElapsed(0)
  }, [index])

  // Level 3 times each question. Nothing is enforced, the clock is the pressure.
  useEffect(() => {
    if (level !== 3 || answered) return
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [level, answered, index])

  const currentId = queue[index]
  const question = useMemo(() => questions.find((q) => q.id === currentId) ?? null, [currentId])

  const record = useCallback(
    (result: QuestionResult) => {
      if (!question) return
      dispatch({
        type: 'answer-question',
        questionId: question.id,
        sectionId: question.section,
        result,
        today,
        elapsedMs: Math.min(15 * 60 * 1000, Date.now() - startedAt.current),
      })
      setAnswered(true)
    },
    [dispatch, question, today],
  )

  const next = () => {
    setAnswered(false)
    setPicked(null)
    setWritten('')
    setShowHint(false)
    setShowWhy(false)
    setIndex((value) => value + 1)
  }

  const reviewCount = reviewQueueSize(progress.questions)
  const remaining = Math.max(0, queue.length - index)

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-4">
      {lesson ? (
        <div className="mb-3 border-l-2 border-accent bg-sheet p-3">
          <p className="eyebrow">Blocked practice</p>
          <p className="mt-1 text-sm leading-relaxed">
            The {lesson.practice.questionIds.length} question
            {lesson.practice.questionIds.length === 1 ? '' : 's'} tagged to lesson {lesson.number}, {lesson.title}.
            Nothing else is mixed in until the topic is finished.
          </p>
          <button
            type="button"
            onClick={() => setSearch({})}
            className="mt-2 min-h-11 w-full rounded-sm border border-rule text-sm text-muted hover:text-ink"
          >
            Practise everything instead
          </button>
        </div>
      ) : null}

      {mixStudied && !lesson && (mixSections !== null || blockedSection !== null) ? (
        <div className="mb-3 border-l-2 border-accent bg-sheet p-3">
          <p className="eyebrow">{mixSections ? 'Interleaved' : 'Blocked'}</p>
          <p className="mt-1 text-sm leading-relaxed">{plan.note}</p>
          <button
            type="button"
            onClick={() => setSearch({})}
            className="mt-2 min-h-11 w-full rounded-sm border border-rule text-sm text-muted hover:text-ink"
          >
            Practise everything instead
          </button>
        </div>
      ) : null}

      <div className={`flex flex-wrap items-center gap-2 ${lesson ? 'hidden' : ''}`}>
        <select
          value={filters.sectionId === null ? 'all' : String(filters.sectionId)}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              sectionId: event.target.value === 'all' ? null : Number(event.target.value),
            }))
          }
          className="min-h-11 max-w-[13rem] flex-1 truncate rounded-sm border border-rule bg-raised px-2 text-sm"
        >
          <option value="all">All sections</option>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.id}. {section.title}
            </option>
          ))}
        </select>
        <span className="data">
          {remaining} left{reviewCount > 0 ? `, ${reviewCount} in review` : ''}
        </span>
      </div>

      <div className={`mt-2 flex flex-wrap gap-1.5 ${lesson ? 'hidden' : ''}`}>
        <FormatChip
          label="All"
          active={filters.formats === null}
          onClick={() => setFilters((current) => ({ ...current, formats: null }))}
        />
        {FORMATS.map((format) => (
          <FormatChip
            key={format}
            label={format}
            active={filters.formats?.length === 1 && filters.formats[0] === format}
            onClick={() => setFilters((current) => ({ ...current, formats: [format] }))}
          />
        ))}
      </div>

      {filters.formats === null && !lesson ? (
        <p className="mt-1.5 text-[11px] text-faint">Queries are practised in the sandbox. Tap SQL to see them here.</p>
      ) : null}

      {question ? (
        <article className="mt-4">
          <div className="flex flex-wrap items-center gap-2 data">
            <span>{question.id}</span>
            <span>{question.difficulty}</span>
            <span>{question.format}</span>
            <span>section {question.section}</span>
            {level === 3 && !answered ? <span className="text-medium">{elapsed}s</span> : null}
          </div>

          <div className="mt-3 sheet p-3">
            <Markdown>{question.format === 'MCQ' ? question.stem : question.prompt}</Markdown>
          </div>

          <LookItUp
            question={question}
            level={level}
            open={showHint}
            onOpen={() => setShowHint(true)}
            answered={answered}
          />

          {question.format === 'SQL' ? (
            <SqlHandoff />
          ) : question.format === 'MCQ' && question.options ? (
            <MultipleChoice
              question={question}
              level={level}
              picked={picked}
              answered={answered}
              onPick={(optionIndex, correct) => {
                setPicked(optionIndex)
                record(correct ? 'correct' : 'wrong')
              }}
            />
          ) : (
            <WrittenAnswer
              question={question}
              value={written}
              answered={answered}
              onChange={setWritten}
              // Revealing is not an attempt. The self grade below is the attempt,
              // and it is recorded exactly once.
              onReveal={() => setAnswered(true)}
            />
          )}

          {answered ? (
            <Explanation
              question={question}
              level={level}
              showWhy={showWhy}
              onWhy={() => setShowWhy(true)}
              onNext={next}
              written={written}
            />
          ) : null}
        </article>
      ) : (
        <EmptyPractice
          level={level}
          poolEmpty={queue.length === 0}
          onClearFilters={() => setFilters({ sectionId: null, formats: null })}
          onRestart={() => setIndex(0)}
        />
      )}
    </div>
  )
}

function FormatChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-9 rounded-sm border px-3 text-xs ${
        active ? 'border-accent bg-accent-soft text-ink' : 'border-rule bg-raised text-muted hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}

/**
 * The only hint the source files can honestly provide: which reference article
 * covers this. On at level 1, one tap away at level 2, gone at level 3. Many
 * questions have no article, because file A does not cover everything.
 */
function LookItUp({
  question,
  level,
  open,
  onOpen,
  answered,
}: {
  question: Question
  level: 1 | 2 | 3
  open: boolean
  onOpen: () => void
  answered: boolean
}) {
  const article = question.relatedArticles.map(articleById).find((entry) => entry !== undefined)
  if (level === 3 && !answered) return null
  if (!article) {
    return level === 1 ? (
      <p className="mt-2 text-xs text-faint">No reference article covers this one. The answer explains it instead.</p>
    ) : null
  }

  if (level === 1 || open) {
    return (
      <details className="mt-2 sheet" open={level === 1}>
        <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-semibold text-accent">
          Teach me this first: {article.title}
        </summary>
        <div className="border-t border-rule px-3 pb-3">
          <Markdown className="mt-2">{article.markdown}</Markdown>
        </div>
      </details>
    )
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="mt-2 min-h-11 w-full rounded-sm border border-rule px-3 text-sm text-muted hover:text-ink"
    >
      Hint: look it up in {article.title}
    </button>
  )
}

function SqlHandoff() {
  return (
    <div className="mt-3 sheet p-3">
      <p className="text-sm text-muted">
        Queries are answered in the sandbox, where they run against real data and are graded on the rows
        they return.
      </p>
      <Link
        to="/sandbox"
        className="mt-3 flex min-h-12 items-center justify-center rounded-sm bg-accent px-4 text-sm font-semibold text-accent-ink"
      >
        Open the query sandbox
      </Link>
    </div>
  )
}

function MultipleChoice({
  question,
  level,
  picked,
  answered,
  onPick,
}: {
  question: Question
  level: 1 | 2 | 3
  picked: number | null
  answered: boolean
  onPick: (index: number, correct: boolean) => void
}) {
  const { options, letters } = reduceOptions(question.options ?? [], question.answerLetter, level)

  return (
    <ul className="mt-3 space-y-2">
      {options.map((option, index) => {
        const letter = letters[index] ?? ''
        const isCorrect = question.answerLetter === letter
        const isPicked = picked === index
        const showState = answered && (isPicked || isCorrect)
        const tone = !showState
          ? 'border-rule bg-sheet'
          : isCorrect
            ? 'border-easy bg-sheet'
            : 'border-missed bg-sheet'
        return (
          <li key={letter || index}>
            <button
              type="button"
              disabled={answered}
              onClick={() => onPick(index, isCorrect)}
              className={`flex w-full items-start gap-3 rounded-sm border p-3 text-left text-sm ${tone} disabled:cursor-default`}
            >
              <span className="font-mono text-xs text-muted">{letter}</span>
              <span className="flex-1">{option}</span>
              {showState ? (
                <span className={`text-xs font-semibold ${isCorrect ? 'text-easy' : 'text-missed'}`}>
                  {isCorrect ? 'correct' : 'not this'}
                </span>
              ) : null}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function WrittenAnswer({
  question,
  value,
  answered,
  onChange,
  onReveal,
}: {
  question: Question
  value: string
  answered: boolean
  onChange: (value: string) => void
  onReveal: () => void
}) {
  const isBugHunt = question.promptCode !== null && question.answerCode !== null
  const label = isBugHunt
    ? 'Name the problem before you look'
    : question.format === 'Python'
      ? 'Write the code, or describe it'
      : 'Your answer'

  if (answered) return null

  return (
    <div className="mt-3">
      <label className="block">
        <span className="text-xs text-muted">{label}</span>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={5}
          className={`mt-1 w-full resize-y rounded-sm border border-rule bg-raised p-3 text-sm ${
            question.format === 'Python' ? 'font-mono' : ''
          }`}
          spellCheck={question.format !== 'Python'}
          autoCapitalize={question.format === 'Python' ? 'off' : 'sentences'}
          autoCorrect={question.format === 'Python' ? 'off' : 'on'}
          placeholder="Attempt it first. Retrieval is the point."
        />
      </label>
      <button
        type="button"
        onClick={onReveal}
        className="mt-2 min-h-12 w-full rounded-sm bg-accent text-sm font-semibold text-accent-ink"
      >
        Show the model answer
      </button>
      <p className="mt-1 text-center text-[11px] text-faint">You will grade yourself against it.</p>
    </div>
  )
}

function Explanation({
  question,
  level,
  showWhy,
  onWhy,
  onNext,
  written,
}: {
  question: Question
  level: 1 | 2 | 3
  showWhy: boolean
  onWhy: () => void
  onNext: () => void
  written: string
}) {
  const dispatch = useAppDispatch()
  const today = todayISO()
  const selfGraded = question.format !== 'MCQ' && question.format !== 'SQL'
  // Elaborative interrogation, on roughly one question in three rather than
  // every one, which is where it turns into noise.
  const askWhy = level > 1 && question.order % 3 === 0

  return (
    <div className="mt-4">
      {written.trim().length > 0 ? (
        <div className="sheet p-3">
          <p className="eyebrow">What you wrote</p>
          <p className="mt-1 text-sm whitespace-pre-wrap">{written}</p>
        </div>
      ) : null}

      <div className="mt-2 sheet p-3">
        <p className="eyebrow">Model answer</p>
        <Markdown className="mt-2">{question.answer}</Markdown>
      </div>

      {question.promptCode && question.answerCode ? (
        <div className="mt-2 sheet p-3">
          <p className="eyebrow">What changed, line by line</p>
          <div className="mt-2">
            <CodeDiff before={question.promptCode} after={question.answerCode} />
          </div>
        </div>
      ) : null}

      {askWhy ? (
        showWhy ? (
          <p className="mt-2 border-l-2 border-accent bg-sheet p-3 text-sm text-muted">
            The reasoning is in the model answer above. Say it back in your own words before moving on.
          </p>
        ) : (
          <button
            type="button"
            onClick={onWhy}
            className="mt-2 min-h-11 w-full rounded-sm border border-rule text-sm text-muted hover:text-ink"
          >
            Why is that true?
          </button>
        )
      ) : null}

      {selfGraded ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {SELF_GRADES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                dispatch({
                  type: 'answer-question',
                  questionId: question.id,
                  sectionId: question.section,
                  result: option.value,
                  today,
                  elapsedMs: 0,
                })
                onNext()
              }}
              className={`min-h-14 rounded-sm border bg-raised px-1 text-[13px] font-semibold ${option.tone}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={onNext}
          className="mt-3 min-h-14 w-full rounded-sm bg-accent text-base font-semibold text-accent-ink"
        >
          Next question
        </button>
      )}
    </div>
  )
}

function EmptyPractice({
  level,
  poolEmpty,
  onClearFilters,
  onRestart,
}: {
  level: 1 | 2 | 3
  poolEmpty: boolean
  onClearFilters: () => void
  onRestart: () => void
}) {
  return (
    <div className="mt-10 text-center">
      <h1 className="text-lg font-semibold">{poolEmpty ? 'Nothing matches this filter' : 'End of the set'}</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
        {poolEmpty
          ? level === 1
            ? 'Level 1 serves only the questions tagged easy. Clear the filters, or move up a level.'
            : level === 3
              ? 'Level 3 serves only hard questions and scenarios. Clear the filters, or move down a level.'
              : 'Clear the filters to see the whole bank.'
          : 'Every question in this set has been through once. Go round again, or change the filter.'}
      </p>
      <div className="mx-auto mt-6 max-w-sm space-y-2">
        <button
          type="button"
          onClick={onClearFilters}
          className="min-h-12 w-full rounded-sm bg-accent text-sm font-semibold text-accent-ink"
        >
          Clear the filters
        </button>
        {!poolEmpty ? (
          <button
            type="button"
            onClick={onRestart}
            className="min-h-12 w-full rounded-sm border border-rule text-sm text-muted hover:text-ink"
          >
            Start the set again
          </button>
        ) : null}
      </div>
    </div>
  )
}
