import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProgressBar } from '../components/ProgressBar.tsx'
import { CURRICULUM, TOPICS, curriculumEntry, lessonsInTopic } from '../data/curriculum.ts'
import type { CurriculumEntry, Topic } from '../data/curriculum.ts'
import { isWritten } from '../data/lessons/index.ts'
import { sections } from '../lib/content.ts'
import { todayISO } from '../lib/date.ts'
import { blockingPrerequisites, isFinished, lessonState, nextOpenLesson, topicCounts, topicProgress } from '../lib/learn.ts'
import type { LessonState } from '../lib/learn.ts'
import { useAppDispatch, useProgress } from '../state/AppContext.tsx'
import type { LessonProgress, TopicProgress } from '../types/progress.ts'

/**
 * The topic map. Five exam sections, the topics inside them, and every lesson
 * as a ruled row with its state.
 *
 * The prerequisite graph is drawn rather than described: a spine runs down the
 * gutter of each topic with a marker on every lesson, and a lesson that needs
 * more than the one above it says which ones. This is a genuine sequence, so
 * numbers are the right marker here even though the rest of the app avoids them.
 *
 * By default the graph advises rather than locks. Every lesson opens, and the
 * ones already known can be marked as known from the row without walking them.
 * Guided order in settings puts the locks back.
 */

const STATE_LABEL: Record<LessonState, string> = {
  complete: 'done',
  skipped: 'known',
  'in-progress': 'started',
  available: 'open',
  locked: 'locked',
  unwritten: 'not written',
}

export function Learn() {
  const progress = useProgress()
  const lessons = progress.lessons
  const guided = progress.settings.guidedOrder
  const [query, setQuery] = useState('')

  const next = nextOpenLesson(lessons, guided)
  const written = CURRICULUM.filter((entry) => isWritten(entry.id)).length
  const done = CURRICULUM.filter((entry) => lessons[entry.id]?.status === 'complete').length
  const planned = CURRICULUM.filter((entry) => !entry.stretch).length

  const needle = query.trim().toLowerCase()
  const matches = useMemo(() => {
    if (needle.length === 0) return null
    return new Set(
      CURRICULUM.filter(
        (entry) => entry.title.toLowerCase().includes(needle) || String(entry.number) === needle,
      ).map((entry) => entry.id),
    )
  }, [needle])

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-4">
      <section className="sheet p-4">
        <p className="eyebrow">Learn</p>
        <p className="mt-1.5 leading-relaxed">
          {next ? `Next up: ${next.number}. ${next.title}` : 'Every written lesson is finished.'}
        </p>
        {next ? (
          <Link
            to={`/learn/${next.id}`}
            className="mt-4 flex min-h-14 items-center justify-center bg-accent px-4 text-base font-semibold text-accent-ink hover:opacity-90"
          >
            {lessons[next.id]?.status === 'in-progress' ? 'Carry on' : 'Start the lesson'}
          </Link>
        ) : null}
        <div className="mt-3">
          <ProgressBar value={written === 0 ? 0 : done / written} label="Lessons finished" />
        </div>
        <p className="mt-2 text-sm text-faint">
          {done} of {written} written lessons finished. {planned} numbered lessons in all, plus the stretch material.
          {guided ? ' Guided order is on, so a lesson waits for its prerequisites.' : ' Every lesson is open: skip what you already know.'}
        </p>
      </section>

      <label className="mt-4 block">
        <span className="sr-only">Filter lessons</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter lessons: join, pickle, SAML, 41"
          className="min-h-12 w-full rounded-sm border border-rule bg-sheet px-3 text-sm"
        />
      </label>

      {sections.map((section) => {
        const topics = TOPICS.filter((topic) => topic.sectionId === section.id)
        if (topics.length === 0) return null
        const anyMatch =
          matches === null || topics.some((topic) => lessonsInTopic(topic.id).some((entry) => matches.has(entry.id)))
        if (!anyMatch) return null
        return (
          <section key={section.id} className="mt-7">
            <h2 className="eyebrow">
              Section {section.id}: {section.title}
            </h2>
            {topics.map((topic) => (
              <TopicBlock
                key={topic.id}
                topic={topic}
                lessons={lessons}
                topics={progress.topics}
                guided={guided}
                matches={matches}
              />
            ))}
          </section>
        )
      })}
    </div>
  )
}

function TopicBlock({
  topic,
  lessons,
  topics,
  guided,
  matches,
}: {
  topic: Topic
  lessons: Record<string, LessonProgress>
  topics: Record<string, TopicProgress>
  guided: boolean
  matches: Set<string> | null
}) {
  const entries = lessonsInTopic(topic.id)
  const counts = topicCounts(entries, lessons, guided)
  const finishedCount = counts.complete + counts.skipped
  const finished = finishedCount === counts.total
  const fluency = topicProgress(topics, topic.id).fluencyStreak
  const shown = matches === null ? entries : entries.filter((entry) => matches.has(entry.id))
  if (shown.length === 0) return null

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="text-sm font-semibold">{topic.title}</h3>
        <span className="data">
          {finishedCount}/{counts.total} done{counts.skipped > 0 ? `, ${counts.skipped} marked known` : ''}
        </span>
      </div>

      <div className="mt-1.5">
        <ProgressBar value={counts.total === 0 ? 0 : finishedCount / counts.total} label={`${topic.title} progress`} />
      </div>

      {/* The schedule, said out loud. People trust a system whose rules they can see. */}
      <p className="mt-1.5 text-xs leading-relaxed text-muted">
        {finished
          ? `${topic.title} is complete, so its questions are in the mixed daily session now.`
          : topic.scheduleNote}
        {fluency > 0 && !finished ? ` ${fluency} clean finish${fluency === 1 ? '' : 'es'} in a row so far.` : ''}
      </p>

      <ul className="mt-2 sheet ruled">
        {shown.map((entry, index) => (
          <LessonRow
            key={entry.id}
            entry={entry}
            lessons={lessons}
            guided={guided}
            first={index === 0}
            last={index === shown.length - 1}
            previousId={shown[index - 1]?.id ?? null}
          />
        ))}
      </ul>
    </div>
  )
}

function LessonRow({
  entry,
  lessons,
  guided,
  first,
  last,
  previousId,
}: {
  entry: CurriculumEntry
  lessons: Record<string, LessonProgress>
  guided: boolean
  first: boolean
  last: boolean
  previousId: string | null
}) {
  const dispatch = useAppDispatch()
  const state = lessonState(entry, lessons, guided)
  const openable = state !== 'locked' && state !== 'unwritten'
  const blocking = blockingPrerequisites(entry, lessons)

  // Only worth naming when the graph is not simply the row above.
  const extraPrerequisites = entry.prerequisites.filter((id) => id !== previousId)
  const showsPrerequisites = extraPrerequisites.length > 0

  const body = (
    <span className="grid w-full grid-cols-[2.25rem_1fr] gap-2 px-3 py-3 text-left">
      {/* The spine: a rule through the gutter, with a marker per lesson. */}
      <span className="relative flex justify-center" aria-hidden="true">
        <span
          className={`absolute left-1/2 w-px -translate-x-1/2 bg-rule ${
            first ? 'top-2 -bottom-3' : last ? '-top-3 bottom-2' : '-inset-y-3'
          }`}
        />
        <span
          className={`relative mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border text-[9px] ${
            state === 'complete'
              ? 'border-accent bg-accent text-accent-ink'
              : state === 'skipped'
                ? 'border-rule-strong bg-raised text-muted'
                : state === 'in-progress'
                  ? 'border-accent bg-sheet text-accent'
                  : state === 'available'
                    ? 'border-rule-strong bg-sheet text-ink'
                    : 'border-rule bg-raised text-faint'
          }`}
        >
          {entry.stretch ? '+' : entry.number}
        </span>
      </span>

      <span className="min-w-0">
        <span className="flex items-baseline justify-between gap-2">
          <span className={`truncate text-sm ${openable ? 'font-semibold' : 'text-muted'}`}>{entry.title}</span>
          <span className={`data shrink-0 ${state === 'complete' ? 'text-accent' : ''}`}>{STATE_LABEL[state]}</span>
        </span>

        {showsPrerequisites ? (
          <span className="data mt-1 block">
            needs {extraPrerequisites.map((id) => curriculumEntry(id)?.number ?? id).join(' and ')}
          </span>
        ) : null}

        {state === 'locked' && blocking.length > 0 ? (
          <span className="mt-1 block text-xs text-faint">
            Finish {blocking.map((prerequisite) => prerequisite.number).join(' and ')} first.
          </span>
        ) : null}
        {state === 'unwritten' ? (
          <span className="mt-1 block text-xs text-faint">Open, but not authored yet.</span>
        ) : null}
      </span>
    </span>
  )

  if (!openable) {
    return (
      <li aria-disabled="true" className="flex opacity-80">
        {body}
      </li>
    )
  }

  return (
    <li className="flex items-stretch">
      <Link to={`/learn/${entry.id}`} className="flex min-w-0 flex-1 hover:bg-raised">
        {body}
      </Link>
      {isFinished(state) ? (
        <button
          type="button"
          onClick={() => dispatch({ type: 'lesson-reopen', lessonId: entry.id })}
          className="w-12 shrink-0 border-l border-rule text-[10px] leading-tight text-faint hover:text-ink"
          aria-label={`Start ${entry.number}. ${entry.title} again`}
        >
          redo
        </button>
      ) : (
        <button
          type="button"
          onClick={() => dispatch({ type: 'lesson-skip', lessonId: entry.id, today: todayISO() })}
          className="w-12 shrink-0 border-l border-rule text-[10px] leading-tight text-faint hover:text-ink"
          aria-label={`Mark ${entry.number}. ${entry.title} as already known`}
        >
          know it
        </button>
      )}
    </li>
  )
}
