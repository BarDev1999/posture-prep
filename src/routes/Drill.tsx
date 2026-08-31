import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Markdown } from '../components/Markdown.tsx'
import { getLesson } from '../data/lessons/index.ts'
import { sections } from '../lib/content.ts'
import { mergeDeck } from '../lib/deck.ts'
import { todayISO } from '../lib/date.ts'
import { makeCloze } from '../lib/cloze.ts'
import { boxInterval, dueDate } from '../lib/leitner.ts'
import { buildDrillQueue, requeueMissed } from '../lib/session.ts'
import { useAppDispatch, useProgress } from '../state/AppContext.tsx'
import type { Fact } from '../types/content.ts'
import type { FactProgress, Rating } from '../types/progress.ts'

/**
 * The fact drill. This is the screen used at the gym, so the whole interaction
 * is one thumb: a large reveal button, then four rating buttons pinned to the
 * bottom. Swiping is offered as an alternative, never as the only way.
 */

const RATINGS: { value: Rating; label: string; tone: string }[] = [
  { value: 'missed', label: 'Missed it', tone: 'text-missed border-missed/60' },
  { value: 'hard', label: 'Hard', tone: 'text-hard border-hard/60' },
  { value: 'got', label: 'Got it', tone: 'text-got border-got/60' },
  { value: 'easy', label: 'Easy', tone: 'text-easy border-easy/60' },
]

const SWIPE_THRESHOLD = 64
/** A card left open on a bus should not inflate the session clock. */
const MAX_CARD_MS = 5 * 60 * 1000

export function Drill() {
  const progress = useProgress()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const today = todayISO()
  const facts = mergeDeck(progress.extraFacts)
  const factsById = useMemo(() => new Map(facts.map((fact) => [fact.id, fact])), [facts])

  const { sectionFilter, priorityOnly } = progress.settings

  // A lesson handoff arrives as ?lesson=L4 and pins the drill to that lesson's
  // facts, ignoring the section and priority filters.
  const [search, setSearch] = useSearchParams()
  const lesson = getLesson(search.get('lesson') ?? '')
  const lessonFactIds = lesson?.practice.factIds ?? null

  const [queue, setQueue] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [completed, setCompleted] = useState(0)
  const [drillAhead, setDrillAhead] = useState(false)
  const [dragX, setDragX] = useState(0)

  // The queue is built once per filter change and then held still. Rebuilding
  // it on every rating would reshuffle the deck under the user mid session.
  const factProgressRef = useRef(progress.facts)
  useEffect(() => {
    factProgressRef.current = progress.facts
  })

  useEffect(() => {
    const built = buildDrillQueue(
      facts,
      factProgressRef.current,
      { sectionId: sectionFilter, priorityOnly, factIds: lessonFactIds },
      today,
      // A lesson's fact set is tiny, so it is always served in full rather than
      // filtered down to the cards that happen to be due today.
      { includeNotDue: drillAhead || lessonFactIds !== null },
    )
    setQueue(built.order)
    setIndex(0)
    setRevealed(false)
    setDragX(0)
    // mergeDeck returns a stable reference, so listing the deck here rebuilds
    // the queue when facts are imported without looping on every render.
  }, [facts, sectionFilter, priorityOnly, today, drillAhead, lessonFactIds])

  // Live counters read current progress, so "due today" falls as cards are rated.
  const live = useMemo(
    () =>
      buildDrillQueue(facts, progress.facts, { sectionId: sectionFilter, priorityOnly, factIds: lessonFactIds }, today),
    [facts, progress.facts, sectionFilter, priorityOnly, today, lessonFactIds],
  )

  const cardStartedAt = useRef(Date.now())
  useEffect(() => {
    cardStartedAt.current = Date.now()
  }, [index])

  const currentId = queue[index]
  const fact = currentId ? factsById.get(currentId) : undefined

  const rate = useCallback(
    (rating: Rating) => {
      if (!fact) return
      const elapsed = Math.min(MAX_CARD_MS, Math.max(0, Date.now() - cardStartedAt.current))
      dispatch({
        type: 'rate-fact',
        factId: fact.id,
        sectionId: fact.section,
        rating,
        today,
        elapsedMs: elapsed,
      })
      setCompleted((value) => value + 1)
      // A missed card returns inside this session as well as tomorrow.
      if (rating === 'missed') setQueue((order) => requeueMissed(order, index, fact.id))
      setRevealed(false)
      setDragX(0)
      setIndex((value) => value + 1)
    },
    [dispatch, fact, index, today],
  )

  // Keyboard: space reveals, 1 to 4 rate. Useful on a laptop, harmless on a phone.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return
      if (!fact) return
      if (!revealed && (event.key === ' ' || event.key === 'Enter')) {
        event.preventDefault()
        setRevealed(true)
        return
      }
      if (revealed) {
        const slot = Number(event.key)
        const rating = RATINGS[slot - 1]
        if (rating) {
          event.preventDefault()
          rate(rating.value)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [fact, revealed, rate])

  // ------------------------------------------------------------- swiping
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const horizontal = useRef(false)

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    pointerStart.current = { x: event.clientX, y: event.clientY }
    horizontal.current = false
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (!horizontal.current && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) horizontal.current = true
    if (horizontal.current) setDragX(dx)
  }

  const endPointer = () => {
    const dx = dragX
    pointerStart.current = null
    horizontal.current = false
    setDragX(0)
    if (Math.abs(dx) < SWIPE_THRESHOLD) return
    if (!revealed) {
      setRevealed(true)
      return
    }
    rate(dx > 0 ? 'got' : 'missed')
  }

  // ------------------------------------------------------------ rendering

  const remaining = Math.max(0, queue.length - index)
  const factProgress = fact ? progress.facts[fact.id] : undefined
  // Cloze deletion is a level 1 mechanic. A fact with no term worth blanking
  // falls back to free recall rather than blanking a word that gives nothing away.
  const cloze = useMemo(
    () => (fact && progress.settings.level === 1 ? makeCloze(fact.front, fact.back) : null),
    [fact, progress.settings.level],
  )
  const swipeHint = revealed ? (dragX > 0 ? 'Got it' : dragX < 0 ? 'Missed it' : null) : dragX !== 0 ? 'Reveal' : null

  return (
    <div className="mx-auto flex h-full w-full max-w-lg flex-col">
      {lesson ? (
        <div className="shrink-0 border-b border-rule bg-sheet px-4 py-2">
          <p className="eyebrow">Blocked drill</p>
          <p className="mt-1 text-sm leading-relaxed">
            The {lesson.practice.factIds.length} fact{lesson.practice.factIds.length === 1 ? '' : 's'} tagged to lesson{' '}
            {lesson.number}, {lesson.title}.
          </p>
          <button
            type="button"
            onClick={() => setSearch({})}
            className="mt-2 min-h-11 w-full rounded-sm border border-rule text-sm text-muted hover:text-ink"
          >
            Drill everything instead
          </button>
        </div>
      ) : null}

      <div className={`shrink-0 border-b border-rule bg-sheet px-4 py-2 ${lesson ? 'hidden' : ''}`}>
        <div className="flex items-center justify-between gap-2">
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={priorityOnly}
              onChange={(event) => dispatch({ type: 'set-priority-only', value: event.target.checked })}
              className="size-4 accent-[var(--accent)]"
            />
            Priority only
          </label>

          <label className="flex min-h-11 items-center gap-2 text-sm">
            <span className="sr-only">Section filter</span>
            <select
              value={sectionFilter === null ? 'all' : String(sectionFilter)}
              onChange={(event) =>
                dispatch({
                  type: 'set-section-filter',
                  value: event.target.value === 'all' ? null : Number(event.target.value),
                })
              }
              className="max-w-[11rem] truncate rounded-sm border border-rule bg-raised px-2 py-2 text-sm"
            >
              <option value="all">All sections</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.id}. {section.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="data mt-1 flex gap-3">
          <span>{live.dueCount} due today</span>
          <span>{live.unseenCount} new</span>
          <span>{completed} done</span>
          <span>{remaining} left</span>
        </div>
      </div>

      {fact ? (
        <>
          <div
            className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-4 py-5"
            style={{ touchAction: 'pan-y' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
          >
            <div
              className="mx-auto w-full max-w-lg"
              style={{ transform: dragX === 0 ? undefined : `translateX(${Math.max(-90, Math.min(90, dragX))}px)` }}
            >
              {/* The gutter carries the identifier and the schedule, the way a
                  ledger carries a line number, and keeps the question itself clear. */}
              <div className="gutter-row">
                <div className="data pt-1 text-right leading-tight">
                  <div className="text-ink">{fact.id}</div>
                  <div>s{fact.section}</div>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {fact.isPriority ? <span className="tag border-accent/60 text-accent">priority</span> : null}
                    <span className="tag">
                      {factProgress && factProgress.reviewCount > 0
                        ? `box ${factProgress.box}/5, back in ${boxInterval(factProgress.box)}d`
                        : 'new card'}
                    </span>
                  </div>

                  <div className="mt-3" role="heading" aria-level={1}>
                    <Markdown className="prose-lead">{fact.front}</Markdown>
                  </div>

                  {revealed ? (
                    <div className="reveal mt-4 border-t border-rule pt-3">
                      <Markdown>{fact.back}</Markdown>
                    </div>
                  ) : cloze ? (
                    /* Level 1 only. Filling one blank is an easier retrieval step
                       than free recall, which is what material seen for the first
                       time needs. */
                    <div className="mt-4 border-t border-rule pt-3">
                      <p className="eyebrow">Fill the blank</p>
                      <p className="mt-2 leading-relaxed">
                        {cloze.before}
                        <span className="mx-0.5 border-b-2 border-accent px-6 align-baseline text-transparent select-none">
                          {cloze.answer}
                        </span>
                        {cloze.after}
                      </p>
                      <p className="mt-3 text-sm text-faint">Say the missing term, then reveal.</p>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-faint">
                      Answer it out loud first, then reveal. Swipe, or press the button.
                    </p>
                  )}

                  {swipeHint ? (
                    <p className="data mt-3 text-accent" aria-hidden="true">
                      {swipeHint}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-rule bg-sheet px-3 pt-3 pb-3">
            {revealed ? (
              <>
                {/* Four targets across a 380px screen, each above the 44px floor
                    and within one thumb's reach at the bottom of the phone. */}
                <div className="grid grid-cols-4 gap-1.5">
                  {RATINGS.map((rating) => (
                    <button
                      key={rating.value}
                      type="button"
                      onClick={() => rate(rating.value)}
                      className={`min-h-14 border-2 bg-raised px-0.5 text-[13px] leading-tight font-semibold hover:bg-ground ${rating.tone}`}
                    >
                      {rating.label}
                    </button>
                  ))}
                </div>
                <p className="data mt-2 text-center">Swipe right for Got it, left for Missed it.</p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className="min-h-14 w-full bg-accent text-base font-semibold text-accent-ink hover:opacity-90"
                >
                  Show answer
                </button>
                <p className="data mt-2 text-center">Retrieval first. Guess before you look.</p>
              </>
            )}
          </div>
        </>
      ) : (
        <EmptyState
          completed={completed}
          poolSize={live.poolSize}
          laterCount={live.laterCount}
          priorityOnly={priorityOnly}
          sectionFilter={sectionFilter}
          startedWith={queue.length}
          nextDue={nextDueLabel(facts, progress.facts, sectionFilter, priorityOnly)}
          onDrillPriority={() => {
            dispatch({ type: 'set-priority-only', value: true })
            setDrillAhead(true)
          }}
          onDrillEverything={() => {
            dispatch({ type: 'set-priority-only', value: false })
            dispatch({ type: 'set-section-filter', value: null })
            setDrillAhead(true)
          }}
          onDrillAhead={() => setDrillAhead(true)}
          onHome={() => navigate('/')}
        />
      )}
    </div>
  )
}

function nextDueLabel(
  deck: Fact[],
  factProgress: Record<string, FactProgress>,
  sectionFilter: number | null,
  priorityOnly: boolean,
): string | null {
  const pool = deck.filter((fact) => {
    if (sectionFilter !== null && fact.section !== sectionFilter) return false
    if (priorityOnly && !fact.isPriority) return false
    return true
  })
  const dates = pool
    .map((fact) => {
      const progress = factProgress[fact.id]
      return progress ? dueDate(progress) : null
    })
    .filter((value): value is string => value !== null)
    .sort()
  return dates[0] ?? null
}

function EmptyState({
  completed,
  poolSize,
  laterCount,
  priorityOnly,
  sectionFilter,
  startedWith,
  nextDue,
  onDrillPriority,
  onDrillEverything,
  onDrillAhead,
  onHome,
}: {
  completed: number
  poolSize: number
  laterCount: number
  priorityOnly: boolean
  sectionFilter: number | null
  startedWith: number
  nextDue: string | null
  onDrillPriority: () => void
  onDrillEverything: () => void
  onDrillAhead: () => void
  onHome: () => void
}) {
  const finishedSession = startedWith > 0 && completed > 0
  const filtered = priorityOnly || sectionFilter !== null

  let headline: string
  let detail: string
  if (finishedSession) {
    headline = 'Session done'
    detail = `${completed} cards rated. ${nextDue ? `Next cards come back on ${nextDue}.` : ''}`.trim()
  } else if (poolSize === 0) {
    headline = 'No cards match this filter'
    detail = 'Clear the filters to see the whole deck.'
  } else if (priorityOnly) {
    headline = 'No priority cards due today'
    detail = 'Drill every section instead.'
  } else {
    headline = 'No cards due today'
    detail = 'Drill the priority list instead.'
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center px-6 py-8">
      <h1 className="text-lg font-semibold">{headline}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">{detail}</p>

      <div className="mt-6 space-y-2">
        {priorityOnly || poolSize === 0 ? (
          <button
            type="button"
            onClick={onDrillEverything}
            className="min-h-14 w-full rounded-sm bg-accent text-base font-semibold text-accent-ink hover:opacity-90"
          >
            Drill every section
          </button>
        ) : (
          <button
            type="button"
            onClick={onDrillPriority}
            className="min-h-14 w-full rounded-sm bg-accent text-base font-semibold text-accent-ink hover:opacity-90"
          >
            Drill the priority list
          </button>
        )}

        {laterCount > 0 && !filtered ? (
          <button
            type="button"
            onClick={onDrillAhead}
            className="min-h-12 w-full rounded-sm border border-rule text-sm text-muted hover:text-ink"
          >
            Drill ahead of schedule ({laterCount} cards)
          </button>
        ) : null}

        <button
          type="button"
          onClick={onHome}
          className="min-h-12 w-full rounded-sm border border-rule text-sm text-muted hover:text-ink"
        >
          Back to home
        </button>
      </div>
    </div>
  )
}
