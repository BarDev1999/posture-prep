import type { Difficulty, Question, QuestionFormat } from '../types/content.ts'
import type { Level, QuestionProgress } from '../types/progress.ts'

/**
 * Which questions a level serves, and in what order.
 *
 * The tag rules from the brief:
 *   easy   appears at levels 1 and 2
 *   medium appears at levels 2 and 3
 *   hard   appears at level 3, and at level 2 once the medium set for that
 *          section is cleared
 *
 * Level 3 is also described as hard questions and the scenario format only, so
 * a scenario tagged medium counts as level 3 material. That is the one place
 * the two rules meet and this is how they are reconciled.
 */

export type PracticeFilters = {
  sectionId: number | null
  /** Sections to interleave across, from the hybrid schedule. null means all. */
  sections?: number[] | null
  formats: QuestionFormat[] | null
  /**
   * An explicit set of question ids, used by a lesson handoff. This is blocked
   * practice: the same small set, repeated, rather than the interleaved daily
   * pool. Null means no id filter.
   */
  questionIds?: string[] | null
}

/** True when every medium question in a section has been answered correctly. */
export function sectionMediumCleared(
  sectionId: number,
  questions: Question[],
  progress: Record<string, QuestionProgress>,
): boolean {
  const medium = questions.filter((q) => q.section === sectionId && q.difficulty === 'medium')
  if (medium.length === 0) return true
  return medium.every((q) => {
    const entry = progress[q.id]
    return entry !== undefined && entry.attempts > 0 && entry.lastResult === 'correct'
  })
}

export function allowsQuestion(
  question: Question,
  level: Level,
  progress: Record<string, QuestionProgress>,
  questions: Question[],
): boolean {
  const difficulty: Difficulty = question.difficulty
  if (level === 1) return difficulty === 'easy'
  if (level === 2) {
    if (difficulty === 'easy' || difficulty === 'medium') return true
    return sectionMediumCleared(question.section, questions, progress)
  }
  if (difficulty === 'hard') return true
  return question.format === 'scenario' && difficulty === 'medium'
}

export type PracticeQueue = {
  order: string[]
  reviewCount: number
  freshCount: number
  poolSize: number
}

function interleave(items: Question[]): Question[] {
  if (items.length < 2) return [...items]
  const buckets = new Map<number, Question[]>()
  for (const item of items) {
    const bucket = buckets.get(item.section)
    if (bucket) bucket.push(item)
    else buckets.set(item.section, [item])
  }
  const keys = [...buckets.keys()].sort((a, b) => a - b)
  const out: Question[] = []
  while (out.length < items.length) {
    let moved = false
    for (const key of keys) {
      const next = buckets.get(key)?.shift()
      if (next) {
        out.push(next)
        moved = true
      }
    }
    if (!moved) break
  }
  return out
}

/**
 * Review queue first, then questions never attempted, then everything already
 * answered correctly, and finally anything missed today. A question missed a
 * minute ago going straight back to the front would be drilling, not practice.
 */
export function buildPracticeQueue(
  questions: Question[],
  progress: Record<string, QuestionProgress>,
  level: Level,
  filters: PracticeFilters,
  today: string,
): PracticeQueue {
  const wanted = filters.questionIds ? new Set(filters.questionIds) : null
  const pool = questions.filter((question) => {
    // A lesson handoff names its questions outright. Level and format filters
    // are not applied to them: the lesson decided they were the right ones.
    if (wanted) return wanted.has(question.id)
    if (filters.sectionId !== null && question.section !== filters.sectionId) return false
    if (filters.sections && filters.sections.length > 0 && !filters.sections.includes(question.section)) return false
    if (filters.formats && !filters.formats.includes(question.format)) return false
    return allowsQuestion(question, level, progress, questions)
  })

  const review: Question[] = []
  const fresh: Question[] = []
  const done: Question[] = []
  const missedToday: Question[] = []

  for (const question of pool) {
    const entry = progress[question.id]
    if (!entry || entry.attempts === 0) {
      fresh.push(question)
      continue
    }
    if (entry.inReviewQueue) {
      if (entry.lastAttemptedAt === today) missedToday.push(question)
      else review.push(question)
      continue
    }
    done.push(question)
  }

  const byOrder = (a: Question, b: Question) => a.order - b.order
  const byLeastRecent = (a: Question, b: Question) => {
    const dateA = progress[a.id]?.lastAttemptedAt ?? ''
    const dateB = progress[b.id]?.lastAttemptedAt ?? ''
    if (dateA !== dateB) return dateA < dateB ? -1 : 1
    return a.order - b.order
  }

  const order = [
    ...interleave(review.sort(byLeastRecent)),
    ...interleave(fresh.sort(byOrder)),
    ...interleave(done.sort(byLeastRecent)),
    ...missedToday.sort(byOrder),
  ]

  return {
    order: order.map((question) => question.id),
    reviewCount: review.length,
    freshCount: fresh.length,
    poolSize: pool.length,
  }
}

export function reviewQueueSize(progress: Record<string, QuestionProgress>): number {
  return Object.values(progress).filter((entry) => entry.inReviewQueue).length
}

/**
 * Level 1 reduces a four option question to two: the correct answer and one
 * distractor. Both come from the source, nothing is written here.
 */
export function reduceOptions(
  options: string[],
  answerLetter: string | null,
  level: Level,
): { options: string[]; letters: string[] } {
  const letters = ['a', 'b', 'c', 'd'].slice(0, options.length)
  if (level !== 1 || options.length <= 2 || !answerLetter) return { options, letters }

  const correctIndex = letters.indexOf(answerLetter)
  if (correctIndex === -1) return { options, letters }

  // A stable distractor rather than a random one, so the question reads the
  // same every time it comes round.
  const distractorIndex = correctIndex === 0 ? 1 : 0
  const picked = [correctIndex, distractorIndex].sort((a, b) => a - b)
  return {
    options: picked.map((index) => options[index] ?? ''),
    letters: picked.map((index) => letters[index] ?? ''),
  }
}
