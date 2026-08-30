import type {
  FactProgress,
  Level,
  ProgressState,
  QuestionProgress,
  Rating,
  SessionRecord,
  Settings,
  ThemeSetting,
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

export const STORAGE_KEY = 'posture-prep.v1'
export const SCHEMA_VERSION = 1
export const DEFAULT_EXAM_DATE = '2026-09-03'

export const DEFAULT_SETTINGS: Settings = {
  level: 2,
  examDate: DEFAULT_EXAM_DATE,
  theme: 'system',
  priorityOnly: false,
  sectionFilter: null,
}

export function defaultState(): ProgressState {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    facts: {},
    questions: {},
    sessions: [],
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
const migrations: Record<number, (state: Record<string, unknown>) => Record<string, unknown>> = {}

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
  return { level, examDate, theme, priorityOnly: raw.priorityOnly === true, sectionFilter }
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

  return {
    schemaVersion: SCHEMA_VERSION,
    settings: coerceSettings(raw.settings),
    facts,
    questions,
    sessions,
  }
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
