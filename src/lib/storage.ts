import type {
  ExtraFact,
  FactProgress,
  GuidanceTier,
  Level,
  LessonProgress,
  LessonStatus,
  MisconceptionProgress,
  MockAttempt,
  MockVariant,
  ProgressState,
  QuestionProgress,
  QuestionResult,
  Rating,
  SessionRecord,
  Settings,
  ThemeSetting,
  TopicProgress,
} from '../types/progress.ts'
import { clampBox } from './leitner.ts'
import { isValidISODate } from './date.ts'

/**
 * The only module in the app that touches localStorage.
 *
 * Everything lives under one key. The stored object carries its own schema
 * version, and migrate() walks a state forward one version at a time, so a
 * phone holding last week's shape still opens.
 */

/**
 * The key stays put across versions. Migration is driven by the schemaVersion
 * inside the stored object, so a phone holding an older shape is upgraded
 * rather than orphaned under a key nothing reads any more.
 */
export const STORAGE_KEY = 'posture-prep.v1'
export const SCHEMA_VERSION = 4
export const DEFAULT_EXAM_DATE = '2026-09-03'

export const DEFAULT_SETTINGS: Settings = {
  level: 2,
  examDate: DEFAULT_EXAM_DATE,
  theme: 'system',
  priorityOnly: false,
  sectionFilter: null,
  guidedOrder: false,
}

export function defaultState(): ProgressState {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    facts: {},
    questions: {},
    sessions: [],
    mockAttempts: [],
    extraFacts: [],
    lessons: {},
    topics: {},
    misconceptions: {},
  }
}

// A phone in private browsing can throw on every localStorage call. The app
// stays usable for the session rather than crashing; it just forgets on close.
let memoryFallback: string | null = null
let usingFallback = false

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    usingFallback = true
    return memoryFallback
  }
}

function writeRaw(value: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
    memoryFallback = value
  } catch {
    usingFallback = true
    memoryFallback = value
  }
}

export function isPersistent(): boolean {
  return !usingFallback
}

// ------------------------------------------------------------- migrations

/**
 * One entry per version step: `migrations[n]` upgrades a state written at
 * version n to version n + 1. Add a step here whenever the shape changes.
 */
const migrations: Record<number, (state: Record<string, unknown>) => Record<string, unknown>> = {
  // 1 to 2: mock exam attempts and runtime imported facts. Nothing existing
  // changes shape, the two collections simply start empty.
  1: (state) => ({
    ...state,
    mockAttempts: Array.isArray(state.mockAttempts) ? state.mockAttempts : [],
    extraFacts: Array.isArray(state.extraFacts) ? state.extraFacts : [],
  }),
  // 2 to 3: the Learn module. Three empty maps, so a phone holding practice
  // progress from before the module existed opens on the topic map with every
  // lesson at not started rather than being reset.
  2: (state) => ({
    ...state,
    lessons: asRecord(state.lessons),
    topics: asRecord(state.topics),
    misconceptions: asRecord(state.misconceptions),
  }),
  // 3 to 4: lessons can be marked as known rather than walked, and the
  // prerequisite graph became advice rather than a lock. Nothing stored
  // changes meaning: a lesson finished under the old rules was walked, so it
  // migrates to skipped false, and guided order defaults off like a new install.
  3: (state) => {
    const lessons = asRecord(state.lessons)
    const migrated: Record<string, unknown> = {}
    for (const [id, entry] of Object.entries(lessons)) {
      migrated[id] = { ...asRecord(entry), skipped: false }
    }
    return {
      ...state,
      lessons: migrated,
      settings: { ...asRecord(state.settings), guidedOrder: false },
    }
  },
}

function migrate(input: Record<string, unknown>): Record<string, unknown> {
  let state = input
  let version = typeof state.schemaVersion === 'number' ? state.schemaVersion : 0
  while (version < SCHEMA_VERSION) {
    const step = migrations[version]
    if (!step) break
    state = step(state)
    version += 1
  }
  state.schemaVersion = SCHEMA_VERSION
  return state
}

// -------------------------------------------------------------- coercion

const RATINGS: Rating[] = ['missed', 'hard', 'got', 'easy']
const THEMES: ThemeSetting[] = ['system', 'light', 'dark']

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function coerceFact(value: unknown): FactProgress {
  const raw = asRecord(value)
  const lastReviewed =
    typeof raw.lastReviewed === 'string' && isValidISODate(raw.lastReviewed) ? raw.lastReviewed : null
  const lastRating = RATINGS.find((rating) => rating === raw.lastRating) ?? null
  const reviewCount = typeof raw.reviewCount === 'number' && raw.reviewCount >= 0 ? Math.floor(raw.reviewCount) : 0
  return {
    box: clampBox(typeof raw.box === 'number' ? raw.box : 1),
    lastReviewed,
    reviewCount: lastReviewed === null ? reviewCount : Math.max(1, reviewCount),
    lastRating,
  }
}

function coerceQuestion(value: unknown): QuestionProgress {
  const raw = asRecord(value)
  const result = raw.lastResult
  return {
    attempts: typeof raw.attempts === 'number' && raw.attempts >= 0 ? Math.floor(raw.attempts) : 0,
    lastResult: result === 'correct' || result === 'partial' || result === 'wrong' ? result : null,
    inReviewQueue: raw.inReviewQueue === true,
    lastAttemptedAt: typeof raw.lastAttemptedAt === 'string' ? raw.lastAttemptedAt : null,
  }
}

function coerceSession(value: unknown): SessionRecord | null {
  const raw = asRecord(value)
  if (typeof raw.date !== 'string' || !isValidISODate(raw.date)) return null
  const perSection: Record<string, number> = {}
  for (const [key, count] of Object.entries(asRecord(raw.perSection))) {
    if (typeof count === 'number' && Number.isFinite(count)) perSection[key] = Math.max(0, Math.floor(count))
  }
  return {
    date: raw.date,
    durationMs: typeof raw.durationMs === 'number' && raw.durationMs >= 0 ? Math.floor(raw.durationMs) : 0,
    itemsCompleted:
      typeof raw.itemsCompleted === 'number' && raw.itemsCompleted >= 0 ? Math.floor(raw.itemsCompleted) : 0,
    perSection,
  }
}

function coerceSettings(value: unknown): Settings {
  const raw = asRecord(value)
  const level = raw.level === 1 || raw.level === 2 || raw.level === 3 ? (raw.level as Level) : DEFAULT_SETTINGS.level
  const theme = THEMES.find((option) => option === raw.theme) ?? DEFAULT_SETTINGS.theme
  const examDate =
    typeof raw.examDate === 'string' && isValidISODate(raw.examDate) ? raw.examDate : DEFAULT_SETTINGS.examDate
  const sectionFilter =
    typeof raw.sectionFilter === 'number' && Number.isFinite(raw.sectionFilter) ? Math.floor(raw.sectionFilter) : null
  return {
    level,
    examDate,
    theme,
    priorityOnly: raw.priorityOnly === true,
    sectionFilter,
    guidedOrder: raw.guidedOrder === true,
  }
}

const RESULTS: QuestionResult[] = ['correct', 'partial', 'wrong']

function coerceMockAttempt(value: unknown): MockAttempt | null {
  const raw = asRecord(value)
  if (typeof raw.id !== 'string' || typeof raw.date !== 'string' || !isValidISODate(raw.date)) return null

  const questionIds = Array.isArray(raw.questionIds) ? raw.questionIds.filter((id) => typeof id === 'string') : []
  if (questionIds.length === 0) return null

  const results: Record<string, QuestionResult> = {}
  for (const [id, result] of Object.entries(asRecord(raw.results))) {
    const match = RESULTS.find((option) => option === result)
    if (match) results[id] = match
  }

  const perSection: Record<string, { correct: number; total: number }> = {}
  for (const [id, counts] of Object.entries(asRecord(raw.perSection))) {
    const entry = asRecord(counts)
    perSection[id] = {
      correct: typeof entry.correct === 'number' ? Math.max(0, entry.correct) : 0,
      total: typeof entry.total === 'number' ? Math.max(0, entry.total) : 0,
    }
  }

  const variant: MockVariant = raw.variant === 'short' ? 'short' : 'full'
  return {
    id: raw.id,
    date: raw.date,
    variant,
    durationMs: typeof raw.durationMs === 'number' && raw.durationMs >= 0 ? Math.floor(raw.durationMs) : 0,
    timedOut: raw.timedOut === true,
    questionIds,
    results,
    perSection,
    weightedScore: typeof raw.weightedScore === 'number' ? Math.max(0, Math.min(100, raw.weightedScore)) : 0,
    rawCorrect: typeof raw.rawCorrect === 'number' ? Math.max(0, Math.floor(raw.rawCorrect)) : 0,
    rawTotal: typeof raw.rawTotal === 'number' ? Math.max(0, Math.floor(raw.rawTotal)) : questionIds.length,
  }
}

function coerceExtraFact(value: unknown): ExtraFact | null {
  const raw = asRecord(value)
  if (typeof raw.id !== 'string' || typeof raw.front !== 'string' || typeof raw.back !== 'string') return null
  if (raw.front.trim().length === 0 || raw.back.trim().length === 0) return null
  const section = typeof raw.section === 'number' && raw.section >= 1 && raw.section <= 5 ? Math.floor(raw.section) : 1
  return {
    id: raw.id,
    number: typeof raw.number === 'number' ? Math.floor(raw.number) : 0,
    section,
    front: raw.front,
    back: raw.back,
    isPriority: raw.isPriority === true,
    sourceName: typeof raw.sourceName === 'string' ? raw.sourceName : 'imported',
  }
}

const LESSON_STATUSES: LessonStatus[] = ['not-started', 'in-progress', 'complete']
const GUIDANCE_TIERS: GuidanceTier[] = ['full', 'faded', 'minimal']

function counter(value: unknown): number {
  return typeof value === 'number' && value >= 0 && Number.isFinite(value) ? Math.floor(value) : 0
}

function isoOrNull(value: unknown): string | null {
  return typeof value === 'string' && isValidISODate(value) ? value : null
}

function coerceLesson(value: unknown): LessonProgress {
  const raw = asRecord(value)
  const status = LESSON_STATUSES.find((option) => option === raw.status) ?? 'not-started'
  const step = typeof raw.currentStep === 'number' ? Math.floor(raw.currentStep) : 1
  return {
    status,
    // The player has nine steps and clamping here means a lesson written by a
    // later version cannot reopen on a step this build cannot render.
    currentStep: Math.min(9, Math.max(1, Number.isFinite(step) ? step : 1)),
    produceAttempts: counter(raw.produceAttempts),
    aided: raw.aided === true,
    passedUnaided: raw.passedUnaided === true,
    skipped: raw.skipped === true,
    completedAt: isoOrNull(raw.completedAt),
  }
}

function coerceTopic(value: unknown): TopicProgress {
  const raw = asRecord(value)
  return {
    fluencyStreak: counter(raw.fluencyStreak),
    cleanCompletions: counter(raw.cleanCompletions),
    guidanceTier: GUIDANCE_TIERS.find((option) => option === raw.guidanceTier) ?? 'full',
  }
}

function coerceMisconception(value: unknown): MisconceptionProgress {
  const raw = asRecord(value)
  return {
    fellFor: counter(raw.fellFor),
    lastFellAt: isoOrNull(raw.lastFellAt),
    clearedAt: isoOrNull(raw.clearedAt),
  }
}

/** Turns anything at all into a valid state. Unknown fields are dropped. */
export function coerceState(value: unknown): ProgressState {
  const raw = migrate(asRecord(value))
  const facts: Record<string, FactProgress> = {}
  for (const [id, progress] of Object.entries(asRecord(raw.facts))) facts[id] = coerceFact(progress)

  const questions: Record<string, QuestionProgress> = {}
  for (const [id, progress] of Object.entries(asRecord(raw.questions))) questions[id] = coerceQuestion(progress)

  const sessionsInput = Array.isArray(raw.sessions) ? raw.sessions : []
  const sessions = sessionsInput
    .map(coerceSession)
    .filter((session): session is SessionRecord => session !== null)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  const mockAttempts = (Array.isArray(raw.mockAttempts) ? raw.mockAttempts : [])
    .map(coerceMockAttempt)
    .filter((attempt): attempt is MockAttempt => attempt !== null)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

  const extraFacts = (Array.isArray(raw.extraFacts) ? raw.extraFacts : [])
    .map(coerceExtraFact)
    .filter((fact): fact is ExtraFact => fact !== null)

  const lessons: Record<string, LessonProgress> = {}
  for (const [id, entry] of Object.entries(asRecord(raw.lessons))) lessons[id] = coerceLesson(entry)

  const topics: Record<string, TopicProgress> = {}
  for (const [id, entry] of Object.entries(asRecord(raw.topics))) topics[id] = coerceTopic(entry)

  const misconceptions: Record<string, MisconceptionProgress> = {}
  for (const [id, entry] of Object.entries(asRecord(raw.misconceptions))) {
    misconceptions[id] = coerceMisconception(entry)
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    settings: coerceSettings(raw.settings),
    facts,
    questions,
    sessions,
    mockAttempts,
    extraFacts,
    lessons,
    topics,
    misconceptions,
  }
}

// ---------------------------------------------------------- export, import

export type ImportSummary = {
  facts: number
  questions: number
  sessions: number
  mockAttempts: number
  extraFacts: number
  lessons: number
  schemaVersion: number
}

export function summarise(state: ProgressState): ImportSummary {
  return {
    facts: Object.keys(state.facts).length,
    questions: Object.keys(state.questions).length,
    sessions: state.sessions.length,
    mockAttempts: state.mockAttempts.length,
    extraFacts: state.extraFacts.length,
    lessons: Object.values(state.lessons).filter((lesson) => lesson.status !== 'not-started').length,
    schemaVersion: state.schemaVersion,
  }
}

export type ExportEnvelope = {
  app: 'posture-prep'
  exportedAt: string
  state: ProgressState
}

export function exportPayload(state: ProgressState, now: Date = new Date()): string {
  const envelope: ExportEnvelope = { app: 'posture-prep', exportedAt: now.toISOString(), state }
  return JSON.stringify(envelope, null, 2)
}

export function exportFilename(now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 10)
  return `posture-prep-progress-${stamp}.json`
}

/**
 * Accepts either the exported envelope or a bare state object, so a file
 * hand edited down to its state still restores.
 */
export function parseImport(text: string): { ok: true; state: ProgressState } | { ok: false; error: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' }
  }
  const record = asRecord(parsed)
  const candidate = 'state' in record ? record.state : record
  const inner = asRecord(candidate)
  if (!('facts' in inner) && !('settings' in inner) && !('sessions' in inner)) {
    return { ok: false, error: 'That file does not look like a Posture Prep export.' }
  }
  return { ok: true, state: coerceState(candidate) }
}

// ------------------------------------------------------------------- api

export function loadState(): ProgressState {
  const raw = readRaw()
  if (!raw) return defaultState()
  try {
    return coerceState(JSON.parse(raw))
  } catch {
    // Corrupt payload. Start clean rather than leaving the app unusable.
    return defaultState()
  }
}

export function saveState(state: ProgressState): void {
  writeRaw(JSON.stringify(state))
}

export function clearState(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    usingFallback = true
  }
  memoryFallback = null
}
