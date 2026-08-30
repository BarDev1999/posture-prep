import type { Fact, Question, SectionMeta } from '../types/content.ts'
import type { FactProgress, QuestionProgress, SessionRecord } from '../types/progress.ts'
import { dueDate, factMastery, isDue, isUnseen, newFactProgress } from './leitner.ts'
import { addDays, daysBetween } from './date.ts'

/**
 * Session assembly: which cards to serve, in what order, and what the home
 * screen should say about progress.
 *
 * Pure module, no storage and no React, so scripts/verify-stage1.ts can assert
 * the ordering and scheduling rules directly.
 */

export type DrillFilters = {
  /** null means every section, which is the interleaved default. */
  sectionId: number | null
  priorityOnly: boolean
}

export type DrillQueue = {
  /** Fact ids in the order they will be served. */
  order: string[]
  poolSize: number
  dueCount: number
  unseenCount: number
  /** Cards in the pool that are scheduled for a later day. */
  laterCount: number
}

function progressFor(progress: Record<string, FactProgress>, factId: string): FactProgress {
  return progress[factId] ?? newFactProgress()
}

/**
 * Round robin across sections, preserving the order within each section.
 * Interleaving is a deliberate learning mechanic: mixing topics inside one
 * session beats blocking by topic, even though it feels harder while doing it.
 */
function interleaveBySection(items: Fact[]): Fact[] {
  if (items.length < 2) return [...items]
  const buckets = new Map<number, Fact[]>()
  for (const item of items) {
    const bucket = buckets.get(item.section)
    if (bucket) bucket.push(item)
    else buckets.set(item.section, [item])
  }
  const keys = [...buckets.keys()].sort((a, b) => a - b)
  const out: Fact[] = []
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

function byOverdueThenNumber(progress: Record<string, FactProgress>, today: string) {
  return (a: Fact, b: Fact) => {
    const dueA = dueDate(progressFor(progress, a.id)) ?? today
    const dueB = dueDate(progressFor(progress, b.id)) ?? today
    if (dueA !== dueB) return dueA < dueB ? -1 : 1
    return a.number - b.number
  }
}

/**
 * Due cards first, then cards never seen, priority facts ahead of the rest
 * inside each of those groups, and every group interleaved across sections.
 */
export function buildDrillQueue(
  facts: Fact[],
  progress: Record<string, FactProgress>,
  filters: DrillFilters,
  today: string,
  options: { includeNotDue?: boolean } = {},
): DrillQueue {
  const pool = facts.filter((fact) => {
    if (filters.sectionId !== null && fact.section !== filters.sectionId) return false
    if (filters.priorityOnly && !fact.isPriority) return false
    return true
  })

  const due: Fact[] = []
  const unseen: Fact[] = []
  const later: Fact[] = []
  for (const fact of pool) {
    const factProgress = progressFor(progress, fact.id)
    if (isUnseen(factProgress)) unseen.push(fact)
    else if (isDue(factProgress, today)) due.push(fact)
    else later.push(fact)
  }

  const overdueFirst = byOverdueThenNumber(progress, today)
  const numberOrder = (a: Fact, b: Fact) => a.number - b.number
  const tier = (group: Fact[], priority: boolean, sorter: (a: Fact, b: Fact) => number) =>
    interleaveBySection(group.filter((fact) => fact.isPriority === priority).sort(sorter))

  const order: Fact[] = [
    ...tier(due, true, overdueFirst),
    ...tier(due, false, overdueFirst),
    ...tier(unseen, true, numberOrder),
    ...tier(unseen, false, numberOrder),
  ]

  if (options.includeNotDue) {
    order.push(...tier(later, true, overdueFirst), ...tier(later, false, overdueFirst))
  }

  return {
    order: order.map((fact) => fact.id),
    poolSize: pool.length,
    dueCount: due.length,
    unseenCount: unseen.length,
    laterCount: later.length,
  }
}

/**
 * A card rated "Missed it" comes back inside the same session rather than
 * waiting for tomorrow. It also drops to box 1, so it is due again the next day
 * regardless of whether the session is finished now.
 */
export function requeueMissed(order: string[], currentIndex: number, factId: string, gap = 3): string[] {
  const next = [...order]
  const insertAt = Math.min(next.length, currentIndex + gap + 1)
  next.splice(insertAt, 0, factId)
  return next
}

// ------------------------------------------------------------ section stats

export type SectionStats = {
  section: SectionMeta
  factsTotal: number
  factsDrilled: number
  factsDue: number
  factMastery: number
  questionsTotal: number
  questionsAttempted: number
  questionMastery: number
  /** Combined 0 to 1, weighted by how many items of each kind the section holds. */
  progress: number
  /** Exam weight times remaining gap. Drives what to study next. */
  score: number
}

export function sectionStats(
  sections: SectionMeta[],
  facts: Fact[],
  questions: Question[],
  factProgress: Record<string, FactProgress>,
  questionProgress: Record<string, QuestionProgress>,
  today: string,
): SectionStats[] {
  return sections.map((section) => {
    const sectionFacts = facts.filter((fact) => fact.section === section.id)
    const sectionQuestions = questions.filter((question) => question.section === section.id)

    let masterySum = 0
    let drilled = 0
    let dueNow = 0
    for (const fact of sectionFacts) {
      const progress = progressFor(factProgress, fact.id)
      masterySum += factMastery(progress)
      if (!isUnseen(progress)) drilled += 1
      if (isUnseen(progress) || isDue(progress, today)) dueNow += 1
    }

    let attempted = 0
    let correct = 0
    for (const question of sectionQuestions) {
      const progress = questionProgress[question.id]
      if (!progress || progress.attempts === 0) continue
      attempted += 1
      if (progress.lastResult === 'correct') correct += 1
      else if (progress.lastResult === 'partial') correct += 0.5
    }

    const factsTotal = sectionFacts.length
    const questionsTotal = sectionQuestions.length
    const factMasteryValue = factsTotal > 0 ? masterySum / factsTotal : 0
    const questionMasteryValue = questionsTotal > 0 ? correct / questionsTotal : 0
    const itemsTotal = factsTotal + questionsTotal
    const progress =
      itemsTotal > 0
        ? (factMasteryValue * factsTotal + questionMasteryValue * questionsTotal) / itemsTotal
        : 0

    return {
      section,
      factsTotal,
      factsDrilled: drilled,
      factsDue: dueNow,
      factMastery: factMasteryValue,
      questionsTotal,
      questionsAttempted: attempted,
      questionMastery: questionMasteryValue,
      progress,
      score: section.weight * (1 - progress),
    }
  })
}

/**
 * What to study next, weighted by exam percentage times remaining gap rather
 * than by section order. Ties break towards the heavier section.
 */
export function rankByNeed(stats: SectionStats[]): SectionStats[] {
  return [...stats].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return b.section.weight - a.section.weight
  })
}

export type Recommendation = {
  activity: 'fact-drill'
  /** The section furthest behind, for the optional focused drill. */
  focusSectionId: number | null
  headline: string
  detail: string
}

export function recommendNext(stats: SectionStats[], queue: DrillQueue): Recommendation {
  const ranked = rankByNeed(stats)
  const focus = ranked[0]
  if (queue.dueCount + queue.unseenCount === 0) {
    return {
      activity: 'fact-drill',
      focusSectionId: focus ? focus.section.id : null,
      headline: 'Nothing is due today',
      detail: 'Every card is scheduled for a later day. Drilling ahead is still allowed.',
    }
  }
  const detail = focus
    ? `${focus.section.title} is furthest behind at ${focus.section.weight} percent of the exam.`
    : 'Cards are drawn from every section.'
  return {
    activity: 'fact-drill',
    focusSectionId: focus ? focus.section.id : null,
    headline: queue.dueCount > 0 ? `${queue.dueCount} due, ${queue.unseenCount} new` : `${queue.unseenCount} new cards`,
    detail,
  }
}

// ---------------------------------------------------------------- sessions

/** Consecutive days ending today, or ending yesterday when today has no session yet. */
export function currentStreak(sessions: SessionRecord[], today: string): number {
  const days = new Set(sessions.filter((s) => s.itemsCompleted > 0).map((s) => s.date))
  if (days.size === 0) return 0

  let cursor = today
  if (!days.has(cursor)) {
    cursor = addDays(today, -1)
    if (!days.has(cursor)) return 0
  }

  let streak = 0
  while (days.has(cursor)) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

export function daysUntilExam(examDate: string, today: string): number {
  return daysBetween(today, examDate)
}
