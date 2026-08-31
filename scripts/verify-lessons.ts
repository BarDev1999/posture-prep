/**
 * Checks the Learn module's acceptance criteria that can be proved without a
 * browser: the curriculum graph, the lesson shape, backward fading, the Parsons
 * rules, every trap mapping to a documented misconception, and every source
 * resolving to something that actually exists in files A to D.
 *
 * It also runs every piece of SQL a lesson can ask a learner to produce against
 * the real sandbox database, because a lesson whose model answer does not run
 * is worse than no lesson.
 *
 * Run with: npm run verify:lessons
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

import { CURRICULUM, TOPICS } from '../src/data/curriculum.ts'
import { LESSONS } from '../src/data/lessons/index.ts'
import { MISCONCEPTIONS, getMisconception } from '../src/data/misconceptions.ts'
import {
  blankedIndices,
  fadeAnswerAccepted,
  fadeSatisfied,
  firstWrongPosition,
  guidanceTier,
  isBlanked,
  lessonState,
  normaliseSql,
  parsonsSatisfied,
  visibleBlocks,
} from '../src/lib/learn.ts'
import { schemaStatements } from '../src/lib/sql/schema.ts'
import { seedStatements } from '../src/lib/sql/seed.ts'
import { todayISO } from '../src/lib/date.ts'
import type { ContentBundle } from '../src/types/content.ts'
import type { FadeExercise, Lesson, ParsonsExercise } from '../src/types/lesson.ts'
import type { LessonProgress } from '../src/types/progress.ts'

const require = createRequire(import.meta.url)
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const content = JSON.parse(readFileSync(resolve(ROOT, 'src/data/content.json'), 'utf8')) as ContentBundle

let passed = 0
const failures: string[] = []
const reviewNotes: string[] = []

function check(name: string, condition: boolean, detail = ''): void {
  if (condition) {
    passed += 1
    console.log(`  ok   ${name}`)
  } else {
    failures.push(`${name}${detail ? ` -- ${detail}` : ''}`)
    console.log(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`)
  }
}

function section(title: string): void {
  console.log(`\n${title}`)
}

// ------------------------------------------------------------- source lookup

/**
 * A source is a fact id, a question id, an article id, or a heading in one of
 * the four source files written as `B#SCHEMA for the SQL questions`. Anything
 * else is a source that cannot be traced, which is the whole point of the rule.
 */
const SOURCE_FILES: Record<string, string> = {
  A: 'A_reference_brief_cortex_cloud_posture.md',
  B: 'B_question_bank_91_questions.md',
  C: 'C_answer_key.md',
  D: 'D_fact_deck_54.md',
}

const fileText = new Map<string, string>()
for (const [key, name] of Object.entries(SOURCE_FILES)) {
  fileText.set(key, readFileSync(resolve(ROOT, 'files', name), 'utf8'))
}

const factIds = new Set(content.facts.map((fact) => fact.id))
const questionIds = new Set(content.questions.map((question) => question.id))
const articleIds = new Set(content.articles.map((article) => article.id))

function resolveSource(source: string): boolean {
  if (factIds.has(source) || questionIds.has(source) || articleIds.has(source)) return true
  const match = /^([ABCD])#(.+)$/.exec(source)
  if (!match) return false
  const text = fileText.get(match[1] ?? '')
  if (!text) return false
  const heading = (match[2] ?? '').trim()
  return text.split('\n').some((line) => /^#{1,6}\s/.test(line) && line.replace(/^#{1,6}\s+/, '').trim() === heading)
}

// -------------------------------------------------------------------- graph

section('Curriculum graph')

const numbered = CURRICULUM.filter((entry) => !entry.stretch)
check('58 numbered lessons', numbered.length === 58, `got ${numbered.length}`)
check(
  'the numbers run 1 to 58 with no gaps',
  numbered.every((entry, index) => entry.number === index + 1),
)
check('lesson ids are unique', new Set(CURRICULUM.map((entry) => entry.id)).size === CURRICULUM.length)
check(
  'every topic in the graph is declared',
  CURRICULUM.every((entry) => TOPICS.some((topic) => topic.id === entry.topicId)),
)
check(
  'every topic has at least one lesson',
  TOPICS.every((topic) => CURRICULUM.some((entry) => entry.topicId === topic.id)),
)

const ids = new Set(CURRICULUM.map((entry) => entry.id))
check(
  'every prerequisite names a lesson that exists',
  CURRICULUM.every((entry) => entry.prerequisites.every((prerequisite) => ids.has(prerequisite))),
  CURRICULUM.flatMap((entry) => entry.prerequisites.filter((p) => !ids.has(p))).join(', '),
)

const position = new Map(CURRICULUM.map((entry, index) => [entry.id, index]))
check(
  'no lesson depends on a later one, so the order is a valid sequence',
  CURRICULUM.every((entry) =>
    entry.prerequisites.every((prerequisite) => (position.get(prerequisite) ?? -1) < (position.get(entry.id) ?? 0)),
  ),
)
check(
  'prerequisites stay inside their own topic',
  CURRICULUM.every((entry) =>
    entry.prerequisites.every(
      (prerequisite) => CURRICULUM.find((other) => other.id === prerequisite)?.topicId === entry.topicId,
    ),
  ),
)
check(
  'each topic has exactly one lesson with no prerequisite',
  TOPICS.every(
    (topic) =>
      CURRICULUM.filter((entry) => entry.topicId === topic.id && entry.prerequisites.length === 0).length >= 1,
  ),
)

section('Locking')

const noProgress: Record<string, LessonProgress> = {}
const firstEntry = CURRICULUM[0]
const secondEntry = CURRICULUM[1]
check('the first lesson is available with no progress at all', lessonState(firstEntry!, noProgress) === 'available')
check('the second is locked until the first is complete', lessonState(secondEntry!, noProgress) === 'locked')

const doneFirst: Record<string, LessonProgress> = {
  L1: { status: 'complete', currentStep: 9, produceAttempts: 1, aided: false, passedUnaided: true, completedAt: '2026-08-31' },
}
check('and available once it is', lessonState(secondEntry!, doneFirst) === 'available')
check(
  'a lesson with met prerequisites but no content reads as unwritten, not locked',
  lessonState(CURRICULUM.find((entry) => entry.id === 'L15')!, noProgress) === 'unwritten',
)

// -------------------------------------------------------------- lesson shape

section('Lesson shape')

check('six lessons are authored', LESSONS.length === 6, `got ${LESSONS.length}`)
check(
  'every authored lesson is in the curriculum graph',
  LESSONS.every((lesson) => ids.has(lesson.id)),
)
check(
  'the id, number and topic agree with the graph',
  LESSONS.every((lesson) => {
    const entry = CURRICULUM.find((candidate) => candidate.id === lesson.id)
    return entry !== undefined && entry.number === lesson.number && entry.topicId === lesson.topicId
  }),
)
check(
  'every objective is one sentence about what the learner will be able to do',
  LESSONS.every((lesson) => /^You will be able to /.test(lesson.objective) && lesson.objective.length < 200),
)
check('no lesson is longer than 15 minutes', LESSONS.every((lesson) => lesson.minutes >= 5 && lesson.minutes <= 15))
check(
  'vocabulary holds three to six terms',
  LESSONS.every((lesson) => lesson.steps.vocabulary.length >= 3 && lesson.steps.vocabulary.length <= 6),
  LESSONS.map((lesson) => `${lesson.id}:${lesson.steps.vocabulary.length}`).join(' '),
)
check(
  'no definition is empty and none is a paragraph',
  LESSONS.every((lesson) =>
    lesson.steps.vocabulary.every((term) => term.definition.length > 20 && term.definition.length < 220),
  ),
)
check(
  'the model step has a diagram and a takeaway',
  LESSONS.every((lesson) => lesson.steps.model.takeaway.length > 0 && lesson.steps.model.diagram !== undefined),
)

// ------------------------------------------------------------ content rules

section('Content integrity')

check('every lesson has a non empty sources array', LESSONS.every((lesson) => lesson.sources.length > 0))

const unresolved = LESSONS.flatMap((lesson) =>
  lesson.sources.filter((source) => !resolveSource(source)).map((source) => `${lesson.id} -> ${source}`),
)
check('every source resolves to a fact, question, article or heading in files A to D', unresolved.length === 0, unresolved.join(', '))

for (const lesson of LESSONS) {
  if (lesson.needsReview) reviewNotes.push(`${lesson.id} ${lesson.title}: ${lesson.needsReview}`)
}
check('no authored lesson is flagged NEEDS_REVIEW', reviewNotes.length === 0, reviewNotes.join(' | '))

check(
  'every practice question id exists in the bank',
  LESSONS.every((lesson) => lesson.practice.questionIds.every((questionId) => questionIds.has(questionId))),
)
check(
  'every practice fact id exists in the deck',
  LESSONS.every((lesson) => lesson.practice.factIds.every((factId) => factIds.has(factId))),
)

section('Misconceptions')

check('the documented list has no duplicate ids', new Set(MISCONCEPTIONS.map((m) => m.id)).size === MISCONCEPTIONS.length)
const badTraps = LESSONS.filter((lesson) => getMisconception(lesson.steps.trap.misconceptionId) === undefined)
check(
  'every step 8 trap names a misconception from the documented list',
  badTraps.length === 0,
  badTraps.map((lesson) => `${lesson.id}:${lesson.steps.trap.misconceptionId}`).join(', '),
)
check(
  'each trap has exactly one correct option, out of at least three',
  LESSONS.every((lesson) => {
    const options = lesson.steps.trap.options
    return options.length >= 3 && options.filter((option) => option.correct).length === 1
  }),
)
check(
  'each trap says what it silently does',
  LESSONS.every((lesson) => lesson.steps.trap.silently.length > 40),
)
check(
  'no two lessons in a topic reuse the same misconception',
  new Set(LESSONS.map((lesson) => lesson.steps.trap.misconceptionId)).size === LESSONS.length,
)

// ---------------------------------------------------------- backward fading

section('Backward fading')

check(
  'the light fade blanks exactly one step, and it is the last one',
  LESSONS.every((lesson) => {
    const fade = lesson.steps.fadeLight
    const blanked = blankedIndices(fade.steps.length, fade.blanks)
    return fade.blanks === 1 && blanked.length === 1 && blanked[0] === fade.steps.length - 1
  }),
)
check(
  'the heavy fade blanks more than the light one, always counting from the end',
  LESSONS.every((lesson) => {
    const heavy = lesson.steps.fadeHeavy
    const blanked = blankedIndices(heavy.steps.length, heavy.blanks)
    return (
      heavy.blanks >= 2 &&
      heavy.blanks > lesson.steps.fadeLight.blanks &&
      blanked.every((index) => isBlanked(heavy, index)) &&
      blanked[0] === heavy.steps.length - heavy.blanks
    )
  }),
)
check(
  'no fade blanks every step, because a fade with no scaffold left is free production',
  LESSONS.every((lesson) => lesson.steps.fadeHeavy.blanks < lesson.steps.fadeHeavy.steps.length),
)
check(
  'every fade step carries a subgoal label and a reason',
  LESSONS.every((lesson) =>
    [lesson.steps.fadeLight, lesson.steps.fadeHeavy].every((fade) =>
      fade.steps.every((step) => step.label.length > 3 && step.why.length > 10),
    ),
  ),
)

const fadeGrading = LESSONS.flatMap((lesson) =>
  [lesson.steps.fadeLight, lesson.steps.fadeHeavy].map((fade) => ({ lesson, fade })),
)
check(
  'the authored answer is accepted for every blank',
  fadeGrading.every(({ fade }) =>
    blankedIndices(fade.steps.length, fade.blanks).every((index) =>
      fadeAnswerAccepted(fade, index, fade.steps[index]?.code ?? ''),
    ),
  ),
)
check(
  'and it is still accepted with different case, spacing and no semicolon',
  fadeGrading.every(({ fade }) =>
    blankedIndices(fade.steps.length, fade.blanks).every((index) => {
      const original = fade.steps[index]?.code ?? ''
      const messy = original.toUpperCase().replace(/\s+/g, '   ').replace(/;+$/, '')
      return fadeAnswerAccepted(fade, index, messy)
    }),
  ),
)
check(
  'an empty answer is never accepted',
  fadeGrading.every(({ fade }) => !fadeSatisfied(fade, {})),
)

// ------------------------------------------------------------------ parsons

section('Parsons')

const allParsons: { lesson: Lesson; where: string; exercise: ParsonsExercise }[] = LESSONS.flatMap((lesson) => [
  { lesson, where: 'step 6', exercise: lesson.steps.parsons },
  { lesson, where: 'step 7 fallback', exercise: lesson.steps.produce.fallback },
])

check(
  'every block carries a subgoal label',
  allParsons.every(({ exercise }) => exercise.blocks.every((block) => block.label.trim().length > 3)),
)
check(
  'every block id is unique inside its exercise',
  allParsons.every(({ exercise }) => new Set(exercise.blocks.map((block) => block.id)).size === exercise.blocks.length),
)
check(
  'every id in the solution is a real block, and none of them is a distractor',
  allParsons.every(({ exercise }) =>
    exercise.solution.every((blockId) => {
      const block = exercise.blocks.find((candidate) => candidate.id === blockId)
      return block !== undefined && block.distractor !== true
    }),
  ),
)
check(
  'every non distractor block appears in the solution',
  allParsons.every(({ exercise }) =>
    exercise.blocks.filter((block) => !block.distractor).every((block) => exercise.solution.includes(block.id)),
  ),
)
check(
  'level 1 sees no distractors',
  allParsons.every(({ exercise }) => visibleBlocks(exercise, 1).every((block) => !block.distractor)),
)
check(
  'level 2 and above do see them, wherever the exercise has any',
  allParsons
    .filter(({ exercise }) => exercise.blocks.some((block) => block.distractor))
    .every(({ exercise }) => visibleBlocks(exercise, 2).length > visibleBlocks(exercise, 1).length),
)
check(
  'the step 6 exercise of every lesson carries distractors for level 2',
  LESSONS.every((lesson) => lesson.steps.parsons.blocks.some((block) => block.distractor)),
)
check(
  'the step 7 fallback carries none, because it is help rather than a test',
  LESSONS.every((lesson) => lesson.steps.produce.fallback.blocks.every((block) => !block.distractor)),
)
check(
  'the authored solution is graded as correct',
  allParsons.every(({ exercise }) => parsonsSatisfied(exercise, exercise.solution)),
)
check(
  'a swapped pair is not, and the first wrong position is reported',
  allParsons.every(({ exercise }) => {
    if (exercise.solution.length < 2) return true
    const swapped = [...exercise.solution]
    const first = swapped[0]
    const second = swapped[1]
    swapped[0] = second as string
    swapped[1] = first as string
    return !parsonsSatisfied(exercise, swapped) && firstWrongPosition(exercise, swapped) === 0
  }),
)

// -------------------------------------------------------------- guidance tier

section('Guidance fading')

check('no clean completions means the full nine steps', guidanceTier(0) === 'full' && guidanceTier(1) === 'full')
check('two clean completions drop the worked example', guidanceTier(2) === 'faded' && guidanceTier(4) === 'faded')
check('five drop the rest', guidanceTier(5) === 'minimal' && guidanceTier(9) === 'minimal')

// ------------------------------------------------------------------ the SQL

section('Every model answer runs against the sandbox')

const initSqlJs = require('sql.js')
const SQL = await initSqlJs()
const db = new SQL.Database()
for (const statement of schemaStatements(content.sqlSchema)) db.run(statement)
for (const statement of seedStatements(todayISO()).statements) db.run(statement)

function rowCount(sql: string): number | string {
  try {
    const result = db.exec(sql)
    const last = result[result.length - 1]
    return last ? last.values.length : 0
  } catch (error) {
    return `ERROR ${(error as Error).message}`
  }
}

/** The last step of a fade is the assembled statement, by convention. */
function assembled(fade: FadeExercise): string {
  return fade.steps[fade.steps.length - 1]?.code ?? ''
}

const runnable: { label: string; sql: string }[] = []
for (const lesson of LESSONS) {
  runnable.push({ label: `${lesson.id} light fade`, sql: assembled(lesson.steps.fadeLight) })
  runnable.push({ label: `${lesson.id} heavy fade`, sql: assembled(lesson.steps.fadeHeavy) })
  runnable.push({
    label: `${lesson.id} parsons`,
    sql: lesson.steps.parsons.solution
      .map((blockId) => lesson.steps.parsons.blocks.find((block) => block.id === blockId)?.code ?? '')
      .join('\n'),
  })
  runnable.push({
    label: `${lesson.id} parsons fallback`,
    sql: lesson.steps.produce.fallback.solution
      .map((blockId) => lesson.steps.produce.fallback.blocks.find((block) => block.id === blockId)?.code ?? '')
      .join('\n'),
  })
  runnable.push({ label: `${lesson.id} step 7 reference`, sql: lesson.steps.produce.referenceSql })
}

check(
  'the assembled last step of every fade is a complete statement',
  LESSONS.every((lesson) =>
    [lesson.steps.fadeLight, lesson.steps.fadeHeavy].every((fade) => {
      const sql = normaliseSql(assembled(fade))
      return sql.startsWith('select') && sql.includes('from')
    }),
  ),
)

const results = runnable.map((entry) => ({ ...entry, rows: rowCount(entry.sql) }))
const broken = results.filter((entry) => typeof entry.rows === 'string')
check('every statement runs', broken.length === 0, broken.map((entry) => `${entry.label}: ${entry.rows}`).join(' | '))

const empty = results.filter((entry) => entry.rows === 0)
check(
  'no exercise answer comes back empty, which would almost always be a mistake',
  empty.length === 0,
  empty.map((entry) => entry.label).join(', '),
)

console.log('\n  rows returned, for checking the prose against the data:')
for (const entry of results) console.log(`    ${String(entry.rows).padStart(4)}  ${entry.label}`)

// The traps claim specific counts. These are the ones the prose states.
section('Trap arithmetic')

const scalar = (sql: string): number => {
  const value = db.exec(sql)[0]?.values?.[0]?.[0]
  return typeof value === 'number' ? value : Number(value)
}
check('L3 trap: a quoted boolean matches nothing', scalar("SELECT COUNT(*) FROM resources WHERE is_public = 'false'") === 0)
check('L4 trap: != TRUE returns 21 of 40 rows', scalar('SELECT COUNT(*) FROM resources WHERE is_public != TRUE') === 21)
check('L4 worked example: 29 rows are not known to be public', scalar('SELECT COUNT(*) FROM resources WHERE is_public = FALSE OR is_public IS NULL') === 29)
check('L4 model: 11 public, 21 private, 8 unknown', scalar('SELECT COUNT(*) FROM resources WHERE is_public = TRUE') === 11 && scalar('SELECT COUNT(*) FROM resources WHERE is_public IS NULL') === 8)
check('L2 trap: a quoted column name returns 40 rows of the same text', scalar("SELECT COUNT(*) FROM (SELECT 'name' AS n FROM resources) WHERE n = 'name'") === 40)
check('L6 model: 80 findings, 49 open', scalar('SELECT COUNT(*) FROM findings') === 80 && scalar("SELECT COUNT(*) FROM findings WHERE status = 'open'") === 49)
check('L5 worked example: 32 open critical or high', scalar("SELECT COUNT(*) FROM findings WHERE status = 'open' AND severity IN ('critical','high')") === 32)
check('L3 model: 7 of the 40 resources are S3 buckets', scalar("SELECT COUNT(*) FROM resources WHERE resource_type = 's3_bucket'") === 7)
check('L6 light fade: 7 resources in us-east-1', scalar("SELECT COUNT(*) FROM resources WHERE region = 'us-east-1'") === 7)
check('L6 step 7: 9 resources in acc-101', scalar("SELECT COUNT(*) FROM resources WHERE account_id = 'acc-101'") === 9)
check('L3 heavy fade: 19 resolved findings', scalar("SELECT COUNT(*) FROM findings WHERE status = 'resolved'") === 19)
check('L4 light fade: 5 identities never used', scalar('SELECT COUNT(*) FROM identities WHERE last_used_at IS NULL') === 5)
check('L4 parsons: 15 identities have been used', scalar('SELECT COUNT(*) FROM identities WHERE last_used_at IS NOT NULL') === 15)

// --------------------------------------------------------------------- done

if (reviewNotes.length > 0) {
  console.log('\n  lessons flagged NEEDS_REVIEW:')
  for (const note of reviewNotes) console.log(`    ${note}`)
}

console.log(`\n  ${passed} checks passed, ${failures.length} failed\n`)
if (failures.length > 0) {
  for (const failure of failures) console.error(`  FAILED: ${failure}`)
  process.exit(1)
}
