/** Everything persisted to localStorage. Written and read only by src/lib/storage.ts. */

export type Rating = 'missed' | 'hard' | 'got' | 'easy'
export type ThemeSetting = 'system' | 'light' | 'dark'
export type Level = 1 | 2 | 3
export type QuestionResult = 'correct' | 'partial' | 'wrong'

export type FactProgress = {
  /** Leitner box, 1 to 5. */
  box: number
  /** Calendar day of the last review, YYYY-MM-DD, or null when never reviewed. */
  lastReviewed: string | null
  reviewCount: number
  lastRating: Rating | null
}

export type QuestionProgress = {
  attempts: number
  lastResult: QuestionResult | null
  inReviewQueue: boolean
  lastAttemptedAt: string | null
}

export type SessionRecord = {
  /** Calendar day, YYYY-MM-DD. One record per day. */
  date: string
  durationMs: number
  itemsCompleted: number
  /** Items completed per exam section, keyed by section id as a string. */
  perSection: Record<string, number>
}

export type Settings = {
  level: Level
  /** Exam day, YYYY-MM-DD. */
  examDate: string
  theme: ThemeSetting
  priorityOnly: boolean
  /** null means all sections, which is the interleaved default. */
  sectionFilter: number | null
}

export type ProgressState = {
  schemaVersion: number
  settings: Settings
  facts: Record<string, FactProgress>
  questions: Record<string, QuestionProgress>
  sessions: SessionRecord[]
}
