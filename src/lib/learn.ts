import { CURRICULUM, TOPICS, curriculumEntry } from '../data/curriculum.ts'
import type { CurriculumEntry } from '../data/curriculum.ts'
import { hasLesson } from '../data/lessons/index.ts'
import { getMisconception } from '../data/misconceptions.ts'
import type {
  FadeExercise,
  ParsonsBlock,
  ParsonsExercise,
  ProduceExercise,
  RuleRow,
  StepKey,
  TopicId,
} from '../types/lesson.ts'
import { STEP_KEYS } from '../types/lesson.ts'
import type {
  GuidanceTier,
  Level,
  LessonProgress,
  MisconceptionProgress,
  TopicProgress,
} from '../types/progress.ts'

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
  skipped: false,
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

export type LessonState = 'locked' | 'unwritten' | 'available' | 'in-progress' | 'complete' | 'skipped'

/**
 * Guided order is a setting, and it is off by default.
 *
 * The original design locked a lesson until every prerequisite was complete.
 * That is right for a learner walking the curriculum from lesson one, and wrong
 * for one who already knows the first half of a topic: making him sit through
 * six lessons on SELECT to reach JOINs costs more than the ordering gains. So
 * the graph is still there, still drawn, still named on every row, but by
 * default it advises rather than blocks. Turning `guided` on restores the
 * original locking exactly, and the verifier still exercises that path.
 */
export function lessonState(
  entry: CurriculumEntry,
  lessons: Record<string, LessonProgress>,
  guided = false,
): LessonState {
  if (guided) {
    const unmet = entry.prerequisites.some((prerequisiteId) => {
      return lessonProgress(lessons, prerequisiteId).status !== 'complete'
    })
    if (unmet) return 'locked'
  }
  if (!hasLesson(entry.id)) return 'unwritten'
  const progress = lessonProgress(lessons, entry.id)
  if (progress.status === 'complete') return progress.skipped ? 'skipped' : 'complete'
  if (progress.status === 'in-progress') return 'in-progress'
  return 'available'
}

/** Finished, however it was finished. Skipping counts for unlocking and totals. */
export function isFinished(state: LessonState): boolean {
  return state === 'complete' || state === 'skipped'
}

export function canOpenLesson(
  lessonId: string,
  lessons: Record<string, LessonProgress>,
  guided = false,
): boolean {
  const entry = curriculumEntry(lessonId)
  if (!entry) return false
  const state = lessonState(entry, lessons, guided)
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
export function nextOpenLesson(
  lessons: Record<string, LessonProgress>,
  guided = false,
): CurriculumEntry | null {
  const started = CURRICULUM.find((entry) => lessonState(entry, lessons, guided) === 'in-progress')
  if (started) return started
  return CURRICULUM.find((entry) => lessonState(entry, lessons, guided) === 'available') ?? null
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

/**
 * Prose rows, meaning the rule template. Nothing is stripped except spacing,
 * because a comma inside "S3 bucket policy, ACL, Public Access Block" is part
 * of the sentence rather than punctuation the grader should be lenient about.
 */
export function normaliseProse(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

/**
 * Python is case sensitive and indentation sensitive, so the only thing the
 * grader forgives is the spacing around it and a trailing colon typed twice.
 */
export function normalisePython(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function fadeAnswerAccepted(exercise: FadeExercise, index: number, answer: string): boolean {
  const step = exercise.steps[index]
  if (!step) return false
  const normalise = step.prose ? normaliseProse : normaliseSql
  const candidate = normalise(answer)
  if (candidate.length === 0) return false
  const accepted = [step.code, ...(step.accept ?? [])].map(normalise)
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

export function blockIndent(block: ParsonsBlock | undefined): number {
  return block?.indent ?? 0
}

/** Python blocks are graded on their indentation as well as their order. */
export function indentMatters(exercise: ParsonsExercise): boolean {
  return exercise.language === 'python' || exercise.language === 'yaml'
}

export function parsonsSatisfied(
  exercise: ParsonsExercise,
  placed: string[],
  indents: Record<string, number> = {},
): boolean {
  if (placed.length !== exercise.solution.length) return false
  const orderRight = placed.every((blockId, index) => blockId === exercise.solution[index])
  if (!orderRight) return false
  if (!indentMatters(exercise)) return true
  return placed.every((blockId) => {
    const block = exercise.blocks.find((candidate) => candidate.id === blockId)
    return (indents[blockId] ?? 0) === blockIndent(block)
  })
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

/** The first block whose order is right but whose indentation is not. */
export function firstWrongIndent(
  exercise: ParsonsExercise,
  placed: string[],
  indents: Record<string, number>,
): number | null {
  if (!indentMatters(exercise)) return null
  for (let index = 0; index < placed.length; index++) {
    const blockId = placed[index] as string
    const block = exercise.blocks.find((candidate) => candidate.id === blockId)
    if ((indents[blockId] ?? 0) !== blockIndent(block)) return index
  }
  return null
}

// ---------------------------------------------------------- free production

/** The `[[1]]` markers in a Python template, in the order they appear. */
export function templateSegments(template: string): { text: string; blank: number | null }[] {
  const out: { text: string; blank: number | null }[] = []
  const pattern = /\[\[(\d+)\]\]/g
  let last = 0
  let match = pattern.exec(template)
  while (match) {
    out.push({ text: template.slice(last, match.index), blank: null })
    out.push({ text: '', blank: Number(match[1]) })
    last = match.index + match[0].length
    match = pattern.exec(template)
  }
  out.push({ text: template.slice(last), blank: null })
  return out.filter((segment) => segment.blank !== null || segment.text.length > 0)
}

export function pythonBlankAccepted(
  exercise: Extract<ProduceExercise, { kind: 'python' }>,
  index: number,
  answer: string,
): boolean {
  const blank = exercise.blanks[index]
  if (!blank) return false
  const candidate = normalisePython(answer)
  if (candidate.length === 0) return false
  return [blank.answer, ...(blank.accept ?? [])].map(normalisePython).includes(candidate)
}

export function pythonBlanksSatisfied(
  exercise: Extract<ProduceExercise, { kind: 'python' }>,
  answers: Record<number, string>,
): boolean {
  return exercise.blanks.every((_, index) => pythonBlankAccepted(exercise, index, answers[index] ?? ''))
}

export function ruleRowCorrect(row: RuleRow, choice: string | undefined): boolean {
  return choice !== undefined && normaliseProse(choice) === normaliseProse(row.answer)
}

export function ruleSatisfied(
  exercise: Extract<ProduceExercise, { kind: 'rule' }>,
  choices: Record<string, string>,
): boolean {
  return exercise.rows.every((row) => ruleRowCorrect(row, choices[row.part]))
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

/**
 * Which steps the player actually walks at a tier. The steps themselves never
 * change and neither does their order: a tier only decides which of them are
 * shown, and anything hidden is still reachable from the button in the header.
 */
export function stepsForTier(tier: GuidanceTier): StepKey[] {
  if (tier === 'minimal') return ['vocabulary', 'model', 'produce', 'trap', 'handoff']
  if (tier === 'faded') return ['vocabulary', 'model', 'fadeLight', 'fadeHeavy', 'parsons', 'produce', 'trap', 'handoff']
  return [...STEP_KEYS]
}

/** Two consecutive unaided step 7 completions in a topic. */
export function isFluent(topic: TopicProgress): boolean {
  return topic.fluencyStreak >= 2
}

// ------------------------------------------------ blocked to interleaved

/**
 * The hybrid schedule the second brief asks for, and the correction it makes to
 * the first one.
 *
 * Interleaving beats blocked practice for long term retention, but only above a
 * threshold of prior knowledge; below it the switching cost eats the working
 * memory needed to build the schema at all. So practice is blocked while the
 * learner is inside a topic, and a topic's items join the interleaved pool once
 * that topic is finished.
 *
 * This is a recommendation and not a lock. It decides what one button on the
 * home screen does, it says so in one line, and practising everything is always
 * one tap away: gating the practice module behind the Learn module would punish
 * the parts of the exam the learner already knows.
 */
export type ScheduleMode = 'open' | 'blocked' | 'interleaved'

export type SchedulePlan = {
  mode: ScheduleMode
  /** Exam sections whose Learn topics are all finished. Empty until one is. */
  sections: number[]
  /** The topic the learner is currently inside, if any. */
  activeTopic: TopicId | null
  /** The section that topic belongs to, for a blocked session. */
  activeSection: number | null
  note: string
}

/** The topic holding the first lesson that is started but not finished. */
export function activeTopic(lessons: Record<string, LessonProgress>): TopicId | null {
  const started = CURRICULUM.find((entry) => lessonProgress(lessons, entry.id).status === 'in-progress')
  if (started) return started.topicId
  return null
}

/** Exam sections where every topic is finished, however it was finished. */
export function studiedSections(lessons: Record<string, LessonProgress>): number[] {
  const sections = new Set<number>()
  for (const topic of TOPICS) {
    const entries = CURRICULUM.filter((entry) => entry.topicId === topic.id)
    const done = entries.every((entry) => isFinished(lessonState(entry, lessons)))
    if (done) sections.add(topic.sectionId)
  }
  // A section can hold two topics, as section 1 does. Both have to be finished.
  return [...sections]
    .filter((sectionId) =>
      TOPICS.filter((topic) => topic.sectionId === sectionId).every((topic) =>
        CURRICULUM.filter((entry) => entry.topicId === topic.id).every((entry) =>
          isFinished(lessonState(entry, lessons)),
        ),
      ),
    )
    .sort((a, b) => a - b)
}

export function schedulePlan(lessons: Record<string, LessonProgress>): SchedulePlan {
  const sections = studiedSections(lessons)
  const active = activeTopic(lessons)
  const activeSection = active ? (TOPICS.find((topic) => topic.id === active)?.sectionId ?? null) : null

  if (sections.length > 0) {
    return {
      mode: 'interleaved',
      sections,
      activeTopic: active,
      activeSection,
      note:
        sections.length === 1
          ? 'Section ' + sections[0] + ' is finished in Learn, so today mixes its material only. Other sections join as you finish them.'
          : 'Sections ' + sections.join(' and ') + ' are finished in Learn, so today interleaves across them.',
    }
  }

  if (active !== null) {
    return {
      mode: 'blocked',
      sections: [],
      activeTopic: active,
      activeSection,
      note: 'You are partway through a topic, so today stays blocked to it: same material, repeated, until the topic is finished.',
    }
  }

  return {
    mode: 'open',
    sections: [],
    activeTopic: null,
    activeSection: null,
    note: 'No Learn topic finished yet, so the session draws on everything. Finish a topic and it starts interleaving what you have studied.',
  }
}

// ----------------------------------------------------------------- weak spots

/**
 * A misconception the learner has fallen for twice and not yet cleared.
 *
 * Twice is the threshold from the brief, and it is the right one: once is a
 * wrong answer, twice is a belief. Getting a later trap on the same
 * misconception right clears it, which is what makes this a weak spot list
 * rather than a permanent record of mistakes.
 */
export type WeakSpot = {
  id: string
  name: string
  belief: string
  fellFor: number
  lastFellAt: string | null
}

export function weakSpots(misconceptions: Record<string, MisconceptionProgress>): WeakSpot[] {
  const out: WeakSpot[] = []
  for (const [id, progress] of Object.entries(misconceptions)) {
    if (progress.fellFor < 2 || progress.clearedAt !== null) continue
    const entry = getMisconception(id)
    if (!entry) continue
    out.push({
      id,
      name: entry.name,
      belief: entry.belief,
      fellFor: progress.fellFor,
      lastFellAt: progress.lastFellAt,
    })
  }
  return out.sort((a, b) => b.fellFor - a.fellFor || a.name.localeCompare(b.name))
}

/** Lessons whose step 8 tests a misconception the learner keeps falling for. */
export function lessonsForWeakSpot(id: string): CurriculumEntry[] {
  const entry = getMisconception(id)
  if (!entry) return []
  return CURRICULUM.filter((candidate) => entry.topics.includes(candidate.topicId))
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
  skipped: number
  available: number
}

export function topicCounts(
  entries: CurriculumEntry[],
  lessons: Record<string, LessonProgress>,
  guided = false,
): TopicCounts {
  let written = 0
  let complete = 0
  let skipped = 0
  let available = 0
  for (const entry of entries) {
    if (hasLesson(entry.id)) written += 1
    const state = lessonState(entry, lessons, guided)
    if (state === 'complete') complete += 1
    if (state === 'skipped') skipped += 1
    if (state === 'available' || state === 'in-progress') available += 1
  }
  return { total: entries.length, written, complete, skipped, available }
}
