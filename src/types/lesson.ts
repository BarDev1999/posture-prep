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
 *
 * Three families of lesson share this shape. SQL produces a query and is graded
 * by running it. Python produces code and is graded on filled blanks, because
 * there is no Python runtime in the browser. The security sections produce a
 * detection rule, because that is what the job actually produces, and the rule
 * is graded row by row against the seven part template from file A.
 */

import type { Difficulty } from './content.ts'

export type TopicId = 'sql' | 'python' | 'ai-security' | 'cloud' | 'linux-web-containers' | 'identity'

/** Which syntax a code block is in. Drives the comment marker and indentation. */
export type Language = 'sql' | 'python' | 'javascript' | 'yaml' | 'json' | 'text'

// ------------------------------------------------------------------ step 1

/** Pre training. Plain one sentence definitions, no jargon inside them. */
export type VocabTerm = {
  term: string
  definition: string
}

// ------------------------------------------------------------------ step 2

/**
 * Diagrams are described, not drawn, so the renderer can size them for a 380px
 * screen and colour them from the theme.
 *
 *   pipeline  stages of query processing, with the row count changing
 *   rows      a table as a grid, optionally with a top N bracket
 *   buckets   a set of rows split three ways, for three valued logic
 *   link      two tables side by side, joined on a key column
 *   flow      boxes and arrows, for a request crossing a system
 *   stack     layers of one thing, labelled by how far each is trusted
 *   compare   two columns of claims, for the pairs that keep being confused
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
  | {
      kind: 'link'
      caption: string
      left: { title: string; columns: string[]; rows: string[][] }
      right: { title: string; columns: string[]; rows: string[][] }
      /** Index of the key column in each table. The link is drawn between them. */
      leftKey: number
      rightKey: number
    }
  | {
      kind: 'flow'
      caption: string
      /** Drawn top to bottom, one box per node, an arrow between each pair. */
      nodes: { label: string; note: string; danger?: boolean }[]
    }
  | {
      kind: 'stack'
      caption: string
      /** Drawn as stacked layers, the first at the top. */
      layers: { label: string; note: string; trust: 'trusted' | 'untrusted' | 'mixed' }[]
    }
  | {
      kind: 'compare'
      caption: string
      left: { title: string; points: string[] }
      right: { title: string; points: string[] }
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
  /** Set on a rule row, or any other step whose body is prose and not code. */
  prose?: boolean
  /** Why this step is here, not what it does. */
  why: string
  /** Self explanation prompt, answer behind a reveal. Two or three per example. */
  prompt?: { question: string; answer: string }
}

/**
 * Predict and Run, from PRIMM, for the Python lessons: the learner commits to
 * an answer, then walks the code one line at a time watching the variables
 * change. Tracing is the skill novices are usually never taught, and it is the
 * one that has to come before writing.
 */
export type TraceFrame = {
  /** 1 based index into `code`: the line that has just run. */
  line: number
  /** Variable name to displayed value, the whole visible state after that line. */
  vars: Record<string, string>
  /** Anything the line printed, appended to the output pane. */
  output?: string
  note: string
}

export type Trace = {
  caption: string
  /** The program, one entry per line, rendered with the current line marked. */
  code: string[]
  language: Language
  /** Answered before the trace can be stepped. This is the P in PRIMM. */
  predict: { question: string; options: { text: string; correct: boolean }[] }
  frames: TraceFrame[]
  /** What the run proved, shown once the last frame is reached. */
  conclusion: string
}

export type WorkedExample = {
  task: string
  steps: WorkedStep[]
  /** Python lessons only. The player will not advance until it is stepped out. */
  trace?: Trace
  /** What the finished query, program or rule produces, in words. */
  result: string
}

// -------------------------------------------------------------- steps 4, 5

export type FadeStep = {
  label: string
  code: string
  /** Set when the body is prose rather than code, as every rule row is. */
  prose?: boolean
  why: string
  /**
   * Candidate answers, used when this step is blanked. A rule row cannot be
   * graded as free text, so the security lessons blank into a choice rather
   * than a box. The right answer is `code` and must appear in this list.
   */
  choices?: string[]
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
  /** Required indentation level, for Python. Zero unless stated. */
  indent?: number
  /** A plausible but wrong line. Hidden at level 1. */
  distractor?: boolean
}

export type ParsonsExercise = {
  task: string
  /** SQL unless stated. A Python exercise is graded on its indentation too. */
  language?: Language
  blocks: ParsonsBlock[]
  /** Block ids in the one correct order. Distractors never appear here. */
  solution: string[]
  closing: string
}

// ------------------------------------------------------------------ step 7

/**
 * The seven part rule template from file A, section 3. The order is fixed: it
 * is the order a researcher answers the questions in, and backward fading
 * blanks it from the end.
 */
export const RULE_PARTS = [
  'source',
  'condition',
  'context',
  'severity',
  'falsePositives',
  'remediation',
  'evidence',
] as const

export type RulePart = (typeof RULE_PARTS)[number]

export const RULE_PART_TITLES: Record<RulePart, string> = {
  source: 'Data source',
  condition: 'Condition',
  context: 'Context and enrichment',
  severity: 'Severity',
  falsePositives: 'False positives and exceptions',
  remediation: 'Remediation',
  evidence: 'Evidence',
}

export const RULE_PART_QUESTIONS: Record<RulePart, string> = {
  source: 'Where do I pull from?',
  condition: 'What exactly am I looking for?',
  context: 'What raises or lowers the severity?',
  severity: 'How bad is it, given exposure and impact?',
  falsePositives: 'Who legitimate gets caught, and how do I let them out?',
  remediation: 'What is the exact fix, and can it be automated safely?',
  evidence: 'What do I show the team that has to fix it?',
}

export type RuleRow = {
  part: RulePart
  /** The right answer for this row. */
  answer: string
  /** What the learner picks from. Holds `answer` and at least two others. */
  options: string[]
  /** Why that row is right, shown once the whole rule is graded. */
  why: string
}

/**
 * Free production. Three kinds, one per family of lesson, and all three carry
 * `fallback`: the same problem as blocks, shown when the learner fails. Parsons
 * as help, and it never reveals the answer text.
 */
export type ProduceExercise =
  | {
      kind: 'sql'
      task: string
      starter: string
      referenceSql: string
      fallback: ParsonsExercise
      closing: string
    }
  | {
      kind: 'python'
      task: string
      /**
       * The program with `[[1]]`, `[[2]]` and so on where the blanks are. One
       * marker per entry in `blanks`, numbered from one, in order.
       */
      template: string
      blanks: { answer: string; hint: string; accept?: string[] }[]
      fallback: ParsonsExercise
      closing: string
    }
  | {
      kind: 'rule'
      task: string
      /** All seven rows, every one of them chosen by the learner. */
      rows: RuleRow[]
      fallback: ParsonsExercise
      closing: string
    }

// ------------------------------------------------------------------ step 8

export type TrapExercise = {
  /** Must name an entry in src/data/misconceptions.ts. Verified at build. */
  misconceptionId: string
  setup: string
  code: string
  /** The syntax `code` is written in. */
  language?: Language
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

/** The comment marker each language uses, for the Parsons subgoal labels. */
export const COMMENT_MARKER: Record<Language, string> = {
  sql: '--',
  python: '#',
  javascript: '//',
  yaml: '#',
  json: '//',
  text: '--',
}
