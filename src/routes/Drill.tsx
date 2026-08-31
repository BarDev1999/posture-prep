import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Markdown } from '../components/Markdown.tsx'
import { sections } from '../lib/content.ts'
import { mergeDeck } from '../lib/deck.ts'
import { todayISO } from '../lib/date.ts'
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
  { value: 'missed', label: 'Missed it', tone: 'text-missed border-missed/50' },
  { value: 'hard', label: 'Hard', tone: 'text-hard border-hard/50' },
  { value: 'got', label: 'Got it', tone: 'text-got border-got/50' },
  { value: 'easy', label: 'Easy', tone: 'text-easy border-easy/50' },
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
      { sectionId: sectionFilter, priorityOnly },
      today,
      { includeNotDue: drillAhead },
    )
    setQueue(built.order)
    setIndex(0)
    setRevealed(false)
    setDragX(0)
    // mergeDeck returns a stable reference, so listing the deck here rebuilds
    // the queue when facts are imported without looping on every render.
  }, [facts, sectionFilter, priorityOnly, today, drillAhead])

  // Live counters read current progress, so "due today" falls as cards are rated.
  const live = useMemo(
    () => buildDrillQueue(facts, progress.facts, { sectionId: sectionFilter, priorityOnly }, today),
    [progress.facts, sectionFilter, priorityOnly, today],
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
  const swipeHint = revealed ? (dragX > 0 ? 'Got it' : dragX < 0 ? 'Missed it' : null) : dragX !== 0 ? 'Reveal' : null

  return (
    <div className="mx-auto flex h-full w-full max-w-lg flex-col">
      <div className="shrink-0 border-b border-line bg-surface px-4 py-2">
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
              className="max-w-[11rem] truncate rounded border border-line bg-surface2 px-2 py-2 text-sm"
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

        <div className="mt-1 flex gap-3 font-mono text-[11px] text-faint">
          <span>{live.dueCount} due today</span>
          <span>{live.unseenCount} new</span>
          <span>{completed} done</span>
          <span>{remaining} left</span>
        </div>
      </div>

      {fact ? (
        <>
          <div
            className="min-h-0 flex-1 overflow-y-auto px-4 py-5"
            style={{ touchAction: 'pan-y' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
          >
            <div
              className="mx-auto max-w-lg"
              style={{ transform: dragX === 0 ? undefined : `translateX(${Math.max(-90, Math.min(90, dragX))}px)` }}
            >
              <div className="flex items-center gap-2 font-mono text-[11px] text-faint">
                <span>{fact.id}</span>
                <span>section {fact.section}</span>
                {fact.isPriority ? <span className="text-accent">priority</span> : null}
                {factProgress && factProgress.reviewCount > 0 ? (
                  <span>
                    box {factProgress.box} of 5, back in {boxInterval(factProgress.box)}d
                  </span>
                ) : (
                  <span>new card</span>
                )}
              </div>

              <div className="mt-3" role="heading" aria-level={1}>
                <Markdown className="prose-lead">{fact.front}</Markdown>
              </div>

              {revealed ? (
                <div className="reveal mt-5 border-t border-line pt-4">
                  <Markdown>{fact.back}</Markdown>
                </div>
              ) : (
                <p className="mt-5 text-sm text-faint">
                  Answer it out loud first, then reveal. Swipe or press the button.
                </p>
              )}

              {swipeHint ? (
                <p className="mt-4 font-mono text-xs text-accent" aria-hidden="true">
                  {swipeHint}
                </p>
              ) : null}
            </div>
          </div>

          <div className="shrink-0 border-t border-line bg-surface px-3 pt-3 pb-3">
            {revealed ? (
              <>
                <div className="grid grid-cols-4 gap-2">
                  {RATINGS.map((rating) => (
                    <button
                      key={rating.value}
                      type="button"
                      onClick={() => rate(rating.value)}
                      className={`min-h-14 rounded border bg-surface2 px-1 text-[13px] font-semibold ${rating.tone} hover:bg-ground`}
                    >
                      {rating.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-center text-[11px] text-faint">
                  Swipe right for Got it, left for Missed it.
                </p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className="min-h-14 w-full rounded bg-accent text-base font-semibold text-accent-ink hover:opacity-90"
                >
                  Show answer
                </button>
                <p className="mt-2 text-center text-[11px] text-faint">Retrieval first. Guess before you look.</p>
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
            className="min-h-14 w-full rounded bg-accent text-base font-semibold text-accent-ink hover:opacity-90"
          >
            Drill every section
          </button>
        ) : (
          <button
            type="button"
            onClick={onDrillPriority}
            className="min-h-14 w-full rounded bg-accent text-base font-semibold text-accent-ink hover:opacity-90"
          >
            Drill the priority list
          </button>
        )}

        {laterCount > 0 && !filtered ? (
          <button
            type="button"
            onClick={onDrillAhead}
            className="min-h-12 w-full rounded border border-line text-sm text-muted hover:text-ink"
          >
            Drill ahead of schedule ({laterCount} cards)
          </button>
        ) : null}

        <button
          type="button"
          onClick={onHome}
          className="min-h-12 w-full rounded border border-line text-sm text-muted hover:text-ink"
        >
          Back to home
        </button>
      </div>
    </div>
  )
}
