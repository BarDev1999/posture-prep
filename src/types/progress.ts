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

export type MockVariant = 'full' | 'short'

export type MockAttempt = {
  /** Stable id, the timestamp the attempt was submitted. */
  id: string
  date: string
  variant: MockVariant
  /** Time spent, which can be less than the limit when submitted early. */
  durationMs: number
  /** Whether the countdown ran out rather than the user submitting. */
  timedOut: boolean
  questionIds: string[]
  results: Record<string, QuestionResult>
  perSection: Record<string, { correct: number; total: number }>
  /** Score against the exam weights, 0 to 100. */
  weightedScore: number
  rawCorrect: number
  rawTotal: number
}

/** A fact imported at runtime from a user supplied file in file D's format. */
export type ExtraFact = {
  id: string
  number: number
  section: number
  front: string
  back: string
  isPriority: boolean
  /** Where it came from, so the user can see and remove a set later. */
  sourceName: string
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
  /** Saved mock exam attempts, oldest first, so two can be compared. */
  mockAttempts: MockAttempt[]
  /** Facts added after the build, merged into the deck at runtime. */
  extraFacts: ExtraFact[]
}
