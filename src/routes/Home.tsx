import { Link, useNavigate } from 'react-router-dom'
import { ProgressBar } from '../components/ProgressBar.tsx'
import { content, questions, sections } from '../lib/content.ts'
import { mergeDeck } from '../lib/deck.ts'
import { todayISO } from '../lib/date.ts'
import {
  buildDrillQueue,
  currentStreak,
  daysUntilExam,
  rankByNeed,
  recommendNext,
  sectionStats,
} from '../lib/session.ts'
import { useAppDispatch, useProgress } from '../state/AppContext.tsx'

/**
 * Home. Five section cards weighted by the exam blueprint, one prominent
 * action, days remaining, and the streak. Nothing else competes for attention.
 */
export function Home() {
  const progress = useProgress()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const today = todayISO()
  const facts = mergeDeck(progress.extraFacts)

  const stats = sectionStats(sections, facts, questions, progress.facts, progress.questions, today)
  const ranked = rankByNeed(stats)
  const queue = buildDrillQueue(facts, progress.facts, { sectionId: null, priorityOnly: false }, today)
  const recommendation = recommendNext(stats, queue)
  const streak = currentStreak(progress.sessions, today)
  const daysLeft = daysUntilExam(progress.settings.examDate, today)
  const todaySession = progress.sessions.find((session) => session.date === today)
  const focus = ranked[0]

  const startSession = () => {
    dispatch({ type: 'set-section-filter', value: null })
    navigate('/drill')
  }

  const drillSection = (sectionId: number) => {
    dispatch({ type: 'set-section-filter', value: sectionId })
    navigate('/drill')
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-4">
      <section className="border border-line bg-surface">
        <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
          <Stat label="Days left" value={daysLeft >= 0 ? String(daysLeft) : 'past'} />
          {/* Cards the session will serve today: scheduled reviews plus cards never seen. */}
          <Stat label="To drill" value={String(queue.dueCount + queue.unseenCount)} />
          <Stat label="Streak" value={streak > 0 ? `${streak}d` : '0'} />
        </div>

        <div className="p-4">
          <p className="text-xs text-muted">{recommendation.headline}</p>
          <p className="mt-1 text-sm leading-relaxed">{recommendation.detail}</p>

          <button
            type="button"
            onClick={startSession}
            className="mt-4 min-h-14 w-full rounded bg-accent px-4 text-base font-semibold text-accent-ink hover:opacity-90"
          >
            Start today's session
          </button>

          {focus ? (
            <button
              type="button"
              onClick={() => drillSection(focus.section.id)}
              className="mt-2 min-h-11 w-full rounded border border-line px-4 text-sm text-muted hover:text-ink"
            >
              Or drill {focus.section.title} only
            </button>
          ) : null}

          <p className="mt-3 text-xs text-faint">
            {todaySession
              ? `${todaySession.itemsCompleted} cards rated today.`
              : 'No cards rated today yet. A session is any number of cards.'}
          </p>
        </div>
      </section>

      <h2 className="mt-6 mb-2 font-mono text-xs tracking-[0.14em] text-muted uppercase">Sections</h2>

      <ul className="space-y-2">
        {stats.map((stat) => (
          <li key={stat.section.id}>
            <button
              type="button"
              onClick={() => drillSection(stat.section.id)}
              className="block w-full border border-line bg-surface p-3 text-left hover:border-line-strong"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold">
                  <span className="font-mono text-xs text-faint">{stat.section.id}. </span>
                  {stat.section.title}
                </span>
                <span className="shrink-0 font-mono text-xs text-muted">{stat.section.weight}%</span>
              </div>

              <div className="mt-2">
                <ProgressBar value={stat.progress} label={`${stat.section.title} progress`} />
              </div>

              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-faint">
                <span>
                  {stat.factsDrilled}/{stat.factsTotal} facts
                </span>
                <span>
                  {stat.questionsAttempted}/{stat.questionsTotal} questions
                </span>
                {stat.factsDue > 0 ? <span className="text-accent">{stat.factsDue} to drill</span> : null}
              </div>
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs leading-relaxed text-faint">
        {content.counts.facts} facts and {content.counts.questions} questions parsed from the source
        files
        {progress.extraFacts.length > 0 ? `, plus ${progress.extraFacts.length} imported` : ''}.{' '}
        <Link to="/settings" className="underline">
          Settings
        </Link>{' '}
        holds the exam date and your data.
      </p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-3 text-center">
      <div className="font-mono text-xl leading-none">{value}</div>
      <div className="mt-1 text-[11px] text-faint">{label}</div>
    </div>
  )
}
