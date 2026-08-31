import { Link } from 'react-router-dom'
import { CURRICULUM, TOPICS, curriculumEntry, lessonsInTopic } from '../data/curriculum.ts'
import type { CurriculumEntry, Topic } from '../data/curriculum.ts'
import { isWritten } from '../data/lessons/index.ts'
import { sections } from '../lib/content.ts'
import { blockingPrerequisites, lessonState, nextOpenLesson, topicCounts, topicProgress } from '../lib/learn.ts'
import type { LessonState } from '../lib/learn.ts'
import { useProgress } from '../state/AppContext.tsx'
import type { LessonProgress, TopicProgress } from '../types/progress.ts'

/**
 * The topic map. Five exam sections, the topics inside them, and every lesson
 * as a ruled row with its state.
 *
 * The prerequisite graph is drawn rather than described: a spine runs down the
 * gutter of each topic with a marker on every lesson, and a lesson that needs
 * more than the one above it says which ones. This is a genuine sequence, so
 * numbers are the right marker here even though the rest of the app avoids them.
 */

const STATE_LABEL: Record<LessonState, string> = {
  complete: 'done',
  'in-progress': 'started',
  available: 'open',
  locked: 'locked',
  unwritten: 'not written',
}

export function Learn() {
  const progress = useProgress()
  const lessons = progress.lessons
  const next = nextOpenLesson(lessons)
  const written = CURRICULUM.filter((entry) => isWritten(entry.id)).length
  const done = CURRICULUM.filter((entry) => lessons[entry.id]?.status === 'complete').length
  const planned = CURRICULUM.filter((entry) => !entry.stretch).length

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-4">
      <section className="sheet p-4">
        <p className="eyebrow">Learn</p>
        <p className="mt-1.5 leading-relaxed">
          {next
            ? `Next up: ${next.number}. ${next.title}`
            : 'Every written lesson is finished. The rest of the curriculum is on its way.'}
        </p>
        {next ? (
          <Link
            to={`/learn/${next.id}`}
            className="mt-4 flex min-h-14 items-center justify-center bg-accent px-4 text-base font-semibold text-accent-ink hover:opacity-90"
          >
            {lessons[next.id]?.status === 'in-progress' ? 'Carry on' : 'Start the lesson'}
          </Link>
        ) : null}
        <p className="mt-3 text-sm text-faint">
          {done} of {written} written lessons finished. {planned} are planned in all, plus the stretch material.
        </p>
      </section>

      {sections.map((section) => {
        const topics = TOPICS.filter((topic) => topic.sectionId === section.id)
        if (topics.length === 0) return null
        return (
          <section key={section.id} className="mt-7">
            <h2 className="eyebrow">
              Section {section.id}: {section.title}
            </h2>
            {topics.map((topic) => (
              <TopicBlock key={topic.id} topic={topic} lessons={lessons} topics={progress.topics} />
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
}: {
  topic: Topic
  lessons: Record<string, LessonProgress>
  topics: Record<string, TopicProgress>
}) {
  const entries = lessonsInTopic(topic.id)
  const counts = topicCounts(entries, lessons)
  const finished = counts.complete === counts.total
  const fluency = topicProgress(topics, topic.id).fluencyStreak

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="text-sm font-semibold">{topic.title}</h3>
        <span className="data">
          {counts.complete}/{counts.total} done, {counts.written} written
        </span>
      </div>

      {/* The schedule, said out loud. People trust a system whose rules they can see. */}
      <p className="mt-1 text-xs leading-relaxed text-muted">
        {finished
          ? `${topic.title} is complete, so its questions are in the mixed daily session now.`
          : topic.scheduleNote}
        {fluency > 0 && !finished ? ` ${fluency} clean finish${fluency === 1 ? '' : 'es'} in a row so far.` : ''}
      </p>

      <ul className="mt-2 sheet ruled">
        {entries.map((entry, index) => (
          <LessonRow
            key={entry.id}
            entry={entry}
            lessons={lessons}
            first={index === 0}
            last={index === entries.length - 1}
            previousId={entries[index - 1]?.id ?? null}
          />
        ))}
      </ul>
    </div>
  )
}

function LessonRow({
  entry,
  lessons,
  first,
  last,
  previousId,
}: {
  entry: CurriculumEntry
  lessons: Record<string, LessonProgress>
  first: boolean
  last: boolean
  previousId: string | null
}) {
  const state = lessonState(entry, lessons)
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

        {showsPrerequisites && state !== 'locked' ? (
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
          <span className="mt-1 block text-xs text-faint">Unlocked, but not authored yet.</span>
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
    <li>
      <Link to={`/learn/${entry.id}`} className="flex hover:bg-raised">
        {body}
      </Link>
    </li>
  )
}
