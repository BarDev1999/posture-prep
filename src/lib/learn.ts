import { CURRICULUM, curriculumEntry } from '../data/curriculum.ts'
import type { CurriculumEntry } from '../data/curriculum.ts'
import { getLesson, hasLesson } from '../data/lessons/index.ts'
import type { FadeExercise, Lesson, ParsonsBlock, ParsonsExercise, StepKey } from '../types/lesson.ts'
import { STEP_KEYS } from '../types/lesson.ts'
import type { GuidanceTier, Level, LessonProgress, TopicProgress } from '../types/progress.ts'

/**
 * The rules of the Learn module, kept pure so the verifier can exercise them
 * outside a browser: what is unlocked, which steps are blank in a fade, whether
 * an answer counts, and when guidance fades.
 */

export const TOTAL_STEPS = STEP_KEYS.length

export const NEW_LESSON_PROGRESS: LessonProgress = {
  status: 'not-started',
  currentStep: 1,
  produceAttempts: 0,
  aided: false,
  passedUnaided: false,
  completedAt: null,
}

export const NEW_TOPIC_PROGRESS: TopicProgress = {
  fluencyStreak: 0,
  cleanCompletions: 0,
  guidanceTier: 'full',
}

export function lessonProgress(
  lessons: Record<string, LessonProgress>,
  lessonId: string,
): LessonProgress {
  return lessons[lessonId] ?? NEW_LESSON_PROGRESS
}

export function topicProgress(topics: Record<string, TopicProgress>, topicId: string): TopicProgress {
  return topics[topicId] ?? NEW_TOPIC_PROGRESS
}

// -------------------------------------------------------------- unlock state

export type LessonState = 'locked' | 'unwritten' | 'available' | 'in-progress' | 'complete'

/**
 * A lesson opens only when every prerequisite is complete. A lesson whose
 * prerequisites are met but whose content is not written yet reads as
 * "unwritten", which is a different thing from locked and should say so.
 */
export function lessonState(entry: CurriculumEntry, lessons: Record<string, LessonProgress>): LessonState {
  const unmet = entry.prerequisites.some((prerequisiteId) => {
    return lessonProgress(lessons, prerequisiteId).status !== 'complete'
  })
  if (unmet) return 'locked'
  if (!hasLesson(entry.id)) return 'unwritten'
  const progress = lessonProgress(lessons, entry.id)
  if (progress.status === 'complete') return 'complete'
  if (progress.status === 'in-progress') return 'in-progress'
  return 'available'
}

export function canOpenLesson(lessonId: string, lessons: Record<string, LessonProgress>): boolean {
  const entry = curriculumEntry(lessonId)
  if (!entry) return false
  const state = lessonState(entry, lessons)
  return state !== 'locked' && state !== 'unwritten'
}

/** The prerequisites still standing between the learner and this lesson. */
export function blockingPrerequisites(
  entry: CurriculumEntry,
  lessons: Record<string, LessonProgress>,
): CurriculumEntry[] {
  return entry.prerequisites
    .filter((prerequisiteId) => lessonProgress(lessons, prerequisiteId).status !== 'complete')
    .map(curriculumEntry)
    .filter((prerequisite): prerequisite is CurriculumEntry => prerequisite !== undefined)
}

/** The first lesson the learner can actually open, or null when there is none. */
export function nextOpenLesson(lessons: Record<string, LessonProgress>): CurriculumEntry | null {
  const started = CURRICULUM.find((entry) => lessonState(entry, lessons) === 'in-progress')
  if (started) return started
  return CURRICULUM.find((entry) => lessonState(entry, lessons) === 'available') ?? null
}

// ------------------------------------------------------------ backward fading

/**
 * Backward fading: the blanks are the LAST n steps, always, computed from the
 * count rather than listed by the author. Remove the final step first, then the
 * second to last, and a lesson cannot accidentally blank a random subset.
 */
export function blankedIndices(stepCount: number, blanks: number): number[] {
  const count = Math.max(0, Math.min(stepCount, blanks))
  const indices: number[] = []
  for (let index = stepCount - count; index < stepCount; index++) indices.push(index)
  return indices
}

export function isBlanked(exercise: FadeExercise, index: number): boolean {
  return index >= exercise.steps.length - exercise.blanks
}

/**
 * Answers are compared as SQL, not as text: case does not matter, neither does
 * how the learner spaced it out or whether they typed the semicolon.
 */
export function normaliseSql(value: string): string {
  return value
    .replace(/--[^\n]*/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*([(),])\s*/g, '$1')
    .replace(/;+\s*$/, '')
    .trim()
    .toLowerCase()
}

export function fadeAnswerAccepted(exercise: FadeExercise, index: number, answer: string): boolean {
  const step = exercise.steps[index]
  if (!step) return false
  const candidate = normaliseSql(answer)
  if (candidate.length === 0) return false
  const accepted = [step.code, ...(step.accept ?? [])].map(normaliseSql)
  return accepted.includes(candidate)
}

export function fadeSatisfied(exercise: FadeExercise, answers: Record<number, string>): boolean {
  return blankedIndices(exercise.steps.length, exercise.blanks).every((index) =>
    fadeAnswerAccepted(exercise, index, answers[index] ?? ''),
  )
}

// ------------------------------------------------------------------- parsons

/**
 * Distractors reduce learning efficiency for a true beginner, so level 1 never
 * sees them. Level 2 and above do.
 */
export function visibleBlocks(exercise: ParsonsExercise, level: Level): ParsonsBlock[] {
  if (level === 1) return exercise.blocks.filter((block) => !block.distractor)
  return exercise.blocks
}

export function parsonsSatisfied(exercise: ParsonsExercise, placed: string[]): boolean {
  if (placed.length !== exercise.solution.length) return false
  return placed.every((blockId, index) => blockId === exercise.solution[index])
}

/**
 * The first position that is wrong, or null when the order is right. Used to
 * tell the learner where it went wrong without handing over the answer.
 */
export function firstWrongPosition(exercise: ParsonsExercise, placed: string[]): number | null {
  for (let index = 0; index < placed.length; index++) {
    if (placed[index] !== exercise.solution[index]) return index
  }
  return placed.length === exercise.solution.length ? null : placed.length
}

// ------------------------------------------------------------ guidance fading

/**
 * The expertise reversal effect: the worked example that helps at lesson one is
 * noise by lesson twelve. Two clean completions drop the worked example, five
 * drop everything but the words, the model, production and the trap.
 */
export function guidanceTier(cleanCompletions: number): GuidanceTier {
  if (cleanCompletions >= 5) return 'minimal'
  if (cleanCompletions >= 2) return 'faded'
  return 'full'
}

export function guidanceTierNote(tier: GuidanceTier): string {
  if (tier === 'minimal') return 'Words, model, write it, trap. Worked examples are behind a button now.'
  if (tier === 'faded') return 'The worked example is skipped. You start at the light fade.'
  return 'All nine steps, with the worked example shown in full.'
}

/** Two consecutive unaided step 7 completions in a topic. */
export function isFluent(topic: TopicProgress): boolean {
  return topic.fluencyStreak >= 2
}

// ---------------------------------------------------------------- step titles

export function stepNumber(key: StepKey): number {
  return STEP_KEYS.indexOf(key) + 1
}

export function stepKeyAt(step: number): StepKey {
  return STEP_KEYS[Math.min(STEP_KEYS.length, Math.max(1, step)) - 1] ?? 'vocabulary'
}

// --------------------------------------------------------------- topic counts

export type TopicCounts = {
  total: number
  written: number
  complete: number
  available: number
}

export function topicCounts(entries: CurriculumEntry[], lessons: Record<string, LessonProgress>): TopicCounts {
  let written = 0
  let complete = 0
  let available = 0
  for (const entry of entries) {
    if (hasLesson(entry.id)) written += 1
    const state = lessonState(entry, lessons)
    if (state === 'complete') complete += 1
    if (state === 'available' || state === 'in-progress') available += 1
  }
  return { total: entries.length, written, complete, available }
}

/** The lesson record, or undefined when the lesson is not written yet. */
export function lessonContent(lessonId: string): Lesson | undefined {
  return getLesson(lessonId)
}
