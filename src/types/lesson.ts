/**
 * The shape of a lesson in the Learn module.
 *
 * Nine steps, always all nine, always in this order. They are named fields
 * rather than an array because the sequence is not configurable: a lesson that
 * could omit the worked example or run the fades after free production would be
 * a different instructional design from the one the module is built on.
 *
 * Lessons live one per file in src/data/lessons/ as typed modules rather than
 * as JSON. Same one file per lesson, same hand editable, but a discriminated
 * union and a nine field object cannot be typechecked through a JSON import, and
 * a typo in step 6 of lesson 41 should fail the build rather than blank a screen
 * on a phone at the gym.
 */

import type { Difficulty } from './content.ts'

export type TopicId = 'sql' | 'python' | 'ai-security' | 'cloud' | 'linux-web-containers' | 'identity'

// ------------------------------------------------------------------ step 1

/** Pre training. Plain one sentence definitions, no jargon inside them. */
export type VocabTerm = {
  term: string
  definition: string
}

// ------------------------------------------------------------------ step 2

/**
 * Diagrams are described, not drawn, so the renderer can size them for a 380px
 * screen and colour them from the theme. Three kinds cover the SQL block:
 *
 *   pipeline  stages of query processing with the row count shrinking
 *   rows      a table as a grid, optionally with a top N bracket
 *   buckets   a set of rows split three ways, for three valued logic
 */
export type Diagram =
  | {
      kind: 'pipeline'
      caption: string
      stages: { label: string; note: string; rows: number }[]
    }
  | {
      kind: 'rows'
      caption: string
      columns: string[]
      rows: string[][]
      /** Column indexes to pick out. Signalling: keep it to one idea. */
      highlightColumns?: number[]
      /** Draws a bracket around the first N rows. */
      keepFirst?: number
      /** Label for that bracket. */
      keepLabel?: string
    }
  | {
      kind: 'buckets'
      caption: string
      buckets: { label: string; count: number; note: string; kept: boolean }[]
    }

export type MentalModel = {
  /** Markdown. Concrete before abstract. */
  narrative: string
  diagram: Diagram
  /** The one sentence to carry out of the step. */
  takeaway: string
}

// ------------------------------------------------------------------ step 3

export type WorkedStep = {
  /** Subgoal label. The structure of the solution, not its surface. */
  label: string
  code: string
  /** Why this step is here, not what it does. */
  why: string
  /** Self explanation prompt, answer behind a reveal. Two or three per example. */
  prompt?: { question: string; answer: string }
}

export type WorkedExample = {
  task: string
  steps: WorkedStep[]
  /** What the finished query returns, in words. */
  result: string
}

// -------------------------------------------------------------- steps 4, 5

export type FadeStep = {
  label: string
  code: string
  why: string
  /** Other spellings accepted when this step is the blank. */
  accept?: string[]
}

/**
 * Backward fading. `blanks` counts from the END of the step list: the light
 * fade blanks the last step, the heavy fade blanks the last two or three. The
 * blanked positions are derived from this number, never listed, so a lesson
 * cannot accidentally blank a random subset.
 */
export type FadeExercise = {
  task: string
  steps: FadeStep[]
  blanks: number
  /** Shown once every blank is right. */
  closing: string
}

// ------------------------------------------------------------------ step 6

export type ParsonsBlock = {
  id: string
  /** Rendered as a comment above the code. Subgoal label. */
  label: string
  code: string
  /** A plausible but wrong line. Hidden at level 1. */
  distractor?: boolean
}

export type ParsonsExercise = {
  task: string
  blocks: ParsonsBlock[]
  /** Block ids in the one correct order. Distractors never appear here. */
  solution: string[]
  closing: string
}

// ------------------------------------------------------------------ step 7

/**
 * Free production. SQL runs against the existing sql.js sandbox and is graded
 * on the rows it returns. `fallback` is the same problem as blocks, shown when
 * the learner fails: Parsons as help, and it never reveals the answer text.
 */
export type ProduceExercise = {
  kind: 'sql'
  task: string
  starter: string
  referenceSql: string
  fallback: ParsonsExercise
  closing: string
}

// ------------------------------------------------------------------ step 8

export type TrapExercise = {
  /** Must name an entry in src/data/misconceptions.ts. Verified at build. */
  misconceptionId: string
  setup: string
  code: string
  question: string
  options: { text: string; correct: boolean }[]
  /** What it silently does, which is the part that makes the trap a trap. */
  silently: string
  explanation: string
}

// ------------------------------------------------------------------ step 9

export type Handoff = {
  /** What the learner can now do, phrased as capabilities. */
  canNow: string[]
  note: string
}

// ------------------------------------------------------------------- lesson

export type LessonSteps = {
  vocabulary: VocabTerm[]
  model: MentalModel
  worked: WorkedExample
  fadeLight: FadeExercise
  fadeHeavy: FadeExercise
  parsons: ParsonsExercise
  produce: ProduceExercise
  trap: TrapExercise
  handoff: Handoff
}

export type Lesson = {
  /** Stable id, used in progress and in URLs. */
  id: string
  /** Position in the curriculum, 1 to 58. */
  number: number
  topicId: TopicId
  /** Exam section, for the practice handoff. */
  sectionId: number
  title: string
  /** One sentence, what the learner will be able to do. */
  objective: string
  /** Estimated minutes, capped at 15 by the verifier. */
  minutes: number
  difficulty: Difficulty
  /** Fact ids, question ids, article ids or source headings. Never empty. */
  sources: string[]
  /** Set when a lesson needs a fact the source files do not contain. */
  needsReview?: string
  /** What the step 9 handoff sends the learner into. */
  practice: { questionIds: string[]; factIds: string[] }
  steps: LessonSteps
}

/** The nine steps, in order, as the player walks them. */
export const STEP_KEYS = [
  'vocabulary',
  'model',
  'worked',
  'fadeLight',
  'fadeHeavy',
  'parsons',
  'produce',
  'trap',
  'handoff',
] as const

export type StepKey = (typeof STEP_KEYS)[number]

export const STEP_TITLES: Record<StepKey, string> = {
  vocabulary: 'Words first',
  model: 'How it works',
  worked: 'Worked example',
  fadeLight: 'Finish the last step',
  fadeHeavy: 'Finish the skeleton',
  parsons: 'Order the blocks',
  produce: 'Write it yourself',
  trap: 'The trap',
  handoff: 'What you can now do',
}
