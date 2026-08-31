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
 * Home, read as a ledger: a rule of counts across the top, one action, then the
 * five sections as ruled entries with their exam weight in the gutter.
 *
 * Weight is the real variable here, so it is shown as a number and as the
 * length of a bar, not as five decorative colours.
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
      <section className="sheet">
        <div className="grid grid-cols-3 divide-x divide-rule border-b border-rule">
          <Stat label="Days left" value={daysLeft >= 0 ? String(daysLeft) : 'past'} />
          {/* Cards the session will serve today: scheduled reviews plus cards never seen. */}
          <Stat label="To drill" value={String(queue.dueCount + queue.unseenCount)} />
          <Stat label="Streak" value={streak > 0 ? `${streak}d` : '0'} />
        </div>

        <div className="p-4">
          <p className="eyebrow">{recommendation.headline}</p>
          <p className="mt-1.5 leading-relaxed">{recommendation.detail}</p>

          <button
            type="button"
            onClick={startSession}
            className="mt-4 min-h-14 w-full bg-accent px-4 text-base font-semibold text-accent-ink hover:opacity-90"
          >
            Start today's session
          </button>

          {focus ? (
            <button
              type="button"
              onClick={() => drillSection(focus.section.id)}
              className="mt-2 min-h-11 w-full border border-rule px-4 text-sm text-muted hover:border-rule-strong hover:text-ink"
            >
              Or drill {focus.section.title} only
            </button>
          ) : null}

          <p className="mt-3 text-sm text-faint">
            {todaySession
              ? `${todaySession.itemsCompleted} cards rated today.`
              : 'No cards rated today yet. A session is any number of cards.'}
          </p>
        </div>
      </section>

      <h2 className="eyebrow mt-6 mb-2">Sections, by exam weight</h2>

      <ul className="sheet ruled">
        {stats.map((stat) => (
          <li key={stat.section.id}>
            <button
              type="button"
              onClick={() => drillSection(stat.section.id)}
              className="gutter-row w-full px-3 py-3 text-left hover:bg-raised"
            >
              <span className="data pt-0.5 text-right leading-none">
                <span className="block text-[15px] text-ink">{stat.section.weight}</span>
                <span className="block pt-1 text-[9px] tracking-[0.12em]">PCT</span>
              </span>

              <span className="min-w-0">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold">
                    <span className="data mr-1 text-faint">{stat.section.id}</span>
                    {stat.section.title}
                  </span>
                  {/* Outstanding work, not cleared work, so this stays neutral.
                      The accent means one thing in this app and it is not "todo". */}
                  {stat.factsDue > 0 ? (
                    <span className="data shrink-0 text-muted">{stat.factsDue} to drill</span>
                  ) : (
                    <span className="data shrink-0 text-accent">clear</span>
                  )}
                </span>

                <span className="mt-2 block">
                  <ProgressBar value={stat.progress} label={`${stat.section.title} progress`} />
                </span>

                <span className="data mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>
                    {stat.factsDrilled}/{stat.factsTotal} facts
                  </span>
                  <span>
                    {stat.questionsAttempted}/{stat.questionsTotal} questions
                  </span>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-sm leading-relaxed text-faint">
        {content.counts.facts} facts and {content.counts.questions} questions parsed from the source
        files
        {progress.extraFacts.length > 0 ? `, plus ${progress.extraFacts.length} imported` : ''}.{' '}
        <Link to="/settings" className="underline underline-offset-2">
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
      <div className="font-mono text-2xl leading-none tracking-tight">{value}</div>
      <div className="data mt-1.5">{label}</div>
    </div>
  )
}
