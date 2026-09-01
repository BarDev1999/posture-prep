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

// -------------------------------------------------------------- learn module

export type LessonStatus = 'not-started' | 'in-progress' | 'complete'

/**
 * How much instructional support a topic still shows. Support that helps a
 * novice becomes noise to someone who no longer needs it, so this rises with
 * clean completions rather than staying where the learner first met it.
 */
export type GuidanceTier = 'full' | 'faded' | 'minimal'

export type LessonProgress = {
  status: LessonStatus
  /** Which of the nine steps the player reopens on, 1 to 9. */
  currentStep: number
  /** Attempts at step 7, free production. */
  produceAttempts: number
  /** True once a failed step 7 has dropped the learner back to step 6. */
  aided: boolean
  /** Step 7 passed with no drop back to the Parsons fallback. */
  passedUnaided: boolean
  /**
   * Marked as known rather than walked. It counts as finished everywhere a
   * count is shown, and nowhere that fluency or the guidance tier is decided.
   */
  skipped: boolean
  completedAt: string | null
}

export type TopicProgress = {
  /** Consecutive lessons finished with an unaided step 7. Two means fluent. */
  fluencyStreak: number
  /** Total lessons finished with an unaided step 7. Drives the guidance tier. */
  cleanCompletions: number
  guidanceTier: GuidanceTier
}

export type MisconceptionProgress = {
  /** Times a trap on this misconception was answered wrongly. */
  fellFor: number
  lastFellAt: string | null
  /** Day a later trap on the same misconception was answered correctly. */
  clearedAt: string | null
}

export type Settings = {
  level: Level
  /** Exam day, YYYY-MM-DD. */
  examDate: string
  theme: ThemeSetting
  priorityOnly: boolean
  /** null means all sections, which is the interleaved default. */
  sectionFilter: number | null
  /**
   * Learn module. On, a lesson stays locked until its prerequisites are done.
   * Off, the default, the graph advises instead: every lesson opens, so the
   * parts already known can be skipped.
   */
  guidedOrder: boolean
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
  /** Learn module, keyed by lesson id. */
  lessons: Record<string, LessonProgress>
  /** Learn module, keyed by topic id. */
  topics: Record<string, TopicProgress>
  /** Learn module, keyed by misconception id. */
  misconceptions: Record<string, MisconceptionProgress>
}
