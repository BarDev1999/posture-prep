import type { Question, SectionMeta } from '../types/content.ts'
import type { MockAttempt, MockVariant, QuestionResult } from '../types/progress.ts'

/**
 * The mock exam. The paper is drawn to the published blueprint, not to what the
 * user happens to be good at, because the point is to find out where the real
 * exam would hurt.
 *
 * The difficulty level setting does not gate this screen. A mock that served
 * only easy questions would not be a mock.
 */

export const FULL_BLUEPRINT: Record<number, number> = { 1: 6, 2: 6, 3: 5, 4: 5, 5: 3 }

/** The short paper covers sections 1, 2 and 4, keeping their full weighting. */
export const SHORT_SECTIONS = [1, 2, 4]

export const MINUTES: Record<MockVariant, number> = { full: 90, short: 60 }

export function blueprintFor(variant: MockVariant): Record<number, number> {
  if (variant === 'full') return { ...FULL_BLUEPRINT }
  const blueprint: Record<number, number> = {}
  for (const section of SHORT_SECTIONS) {
    const count = FULL_BLUEPRINT[section]
    if (count !== undefined) blueprint[section] = count
  }
  return blueprint
}

export function paperSize(variant: MockVariant): number {
  return Object.values(blueprintFor(variant)).reduce((sum, count) => sum + count, 0)
}

function mulberry32(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const a = out[i]
    const b = out[j]
    if (a !== undefined && b !== undefined) {
      out[i] = b
      out[j] = a
    }
  }
  return out
}

/**
 * Draws one paper. `avoid` holds the ids from the previous attempt, which are
 * pushed to the back of each section rather than excluded, so a second attempt
 * looks different without shrinking the pool.
 */
export function buildMockPaper(
  questions: Question[],
  variant: MockVariant,
  seed: number,
  avoid: string[] = [],
): string[] {
  const random = mulberry32(seed)
  const blueprint = blueprintFor(variant)
  const seen = new Set(avoid)
  const paper: string[] = []

  for (const [sectionKey, count] of Object.entries(blueprint)) {
    const section = Number(sectionKey)
    const pool = questions.filter((question) => question.section === section)
    const shuffled = shuffle(pool, random)
    const preferred = shuffled.filter((question) => !seen.has(question.id))
    const rest = shuffled.filter((question) => seen.has(question.id))
    paper.push(...[...preferred, ...rest].slice(0, count).map((question) => question.id))
  }

  return paper
}

export type MockScore = {
  perSection: Record<string, { correct: number; total: number }>
  weightedScore: number
  rawCorrect: number
  rawTotal: number
  /** Sections with no answer yet, so the screen can say the score is partial. */
  ungraded: number
}

/** Partial credit is half a mark, which matches how the self grade is worded. */
function creditFor(result: QuestionResult | undefined): number {
  if (result === 'correct') return 1
  if (result === 'partial') return 0.5
  return 0
}

export function scorePaper(
  questionIds: string[],
  questions: Question[],
  results: Record<string, QuestionResult>,
  sections: SectionMeta[],
): MockScore {
  const byId = new Map(questions.map((question) => [question.id, question]))
  const perSection: Record<string, { correct: number; total: number }> = {}
  let rawCorrect = 0
  let ungraded = 0

  for (const id of questionIds) {
    const question = byId.get(id)
    if (!question) continue
    const key = String(question.section)
    const bucket = perSection[key] ?? { correct: 0, total: 0 }
    const credit = creditFor(results[id])
    bucket.correct += credit
    bucket.total += 1
    perSection[key] = bucket
    rawCorrect += credit
    if (results[id] === undefined) ungraded += 1
  }

  // Weighted by exam percentage, normalised across the sections this paper
  // actually covers, so the short paper still scores out of 100.
  let weighted = 0
  let weightTotal = 0
  for (const section of sections) {
    const bucket = perSection[String(section.id)]
    if (!bucket || bucket.total === 0) continue
    weighted += (bucket.correct / bucket.total) * section.weight
    weightTotal += section.weight
  }

  return {
    perSection,
    weightedScore: weightTotal > 0 ? (weighted / weightTotal) * 100 : 0,
    rawCorrect,
    rawTotal: questionIds.length,
    ungraded,
  }
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/** Latest first, which is the order the results screen lists them in. */
export function recentAttempts(attempts: MockAttempt[], limit = 5): MockAttempt[] {
  return [...attempts].sort((a, b) => (a.id < b.id ? 1 : -1)).slice(0, limit)
}
