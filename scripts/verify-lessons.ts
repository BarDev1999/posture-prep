/**
 * Checks the Learn module's acceptance criteria that can be proved without a
 * browser: the curriculum graph, the lesson shape, backward fading, the Parsons
 * rules, every trap mapping to a documented misconception, and every source
 * resolving to something that actually exists in files A to D.
 *
 * It also runs every piece of SQL a lesson can ask a learner to produce against
 * the real sandbox database, because a lesson whose model answer does not run
 * is worse than no lesson. Python and the security sections have no runtime to
 * run against, so what is checked there is structural: a trace that steps
 * outside its own program, a blank with no marker, a rule row whose answer is
 * not among its options.
 *
 * Run with: npm run verify:lessons
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

import { CURRICULUM, TOPICS } from '../src/data/curriculum.ts'
import { hasLesson, isWritten, writtenCount } from '../src/data/lessons/index.ts'
import { lessons as SQL_LESSONS } from '../src/data/lessons/sql.ts'
import { lessons as PYTHON_LESSONS } from '../src/data/lessons/python.ts'
import { lessons as AI_LESSONS } from '../src/data/lessons/ai-security.ts'
import { lessons as CLOUD_LESSONS } from '../src/data/lessons/cloud.ts'
import { lessons as LINUX_LESSONS } from '../src/data/lessons/linux-web-containers.ts'
import { lessons as IDENTITY_LESSONS } from '../src/data/lessons/identity.ts'
import { DOCUMENTED_SQL_TRAPS, MISCONCEPTIONS, getMisconception } from '../src/data/misconceptions.ts'
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
  pythonBlankAccepted,
  pythonBlanksSatisfied,
  ruleSatisfied,
  stepsForTier,
  templateSegments,
  visibleBlocks,
} from '../src/lib/learn.ts'
import { schemaStatements } from '../src/lib/sql/schema.ts'
import { seedStatements } from '../src/lib/sql/seed.ts'
import { todayISO } from '../src/lib/date.ts'
import type { ContentBundle } from '../src/types/content.ts'
import type { FadeExercise, Lesson, ParsonsExercise, TopicId } from '../src/types/lesson.ts'
import { RULE_PARTS } from '../src/types/lesson.ts'
import type { LessonProgress } from '../src/types/progress.ts'

/** Every authored lesson, eagerly. In the app these arrive one chunk per topic. */
const BUNDLES: Record<TopicId, Lesson[]> = {
  sql: SQL_LESSONS,
  python: PYTHON_LESSONS,
  'ai-security': AI_LESSONS,
  cloud: CLOUD_LESSONS,
  'linux-web-containers': LINUX_LESSONS,
  identity: IDENTITY_LESSONS,
}

const LESSONS = Object.values(BUNDLES).flat()

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

// Guided order off is the default, and it is what "unlock everything" means:
// the graph still exists and is still drawn, it just advises.
check('by default every written lesson is open, whatever comes before it', lessonState(secondEntry!, noProgress) === 'available')
check(
  'by default a lesson deep in a later topic is open too',
  lessonState(CURRICULUM.find((entry) => entry.id === 'L52')!, noProgress) === 'available',
)

// Guided order on restores the original rule exactly.
check('guided: the first lesson is available with no progress at all', lessonState(firstEntry!, noProgress, true) === 'available')
check('guided: the second is locked until the first is complete', lessonState(secondEntry!, noProgress, true) === 'locked')

const doneFirst: Record<string, LessonProgress> = {
  L1: {
    status: 'complete',
    currentStep: 9,
    produceAttempts: 1,
    aided: false,
    passedUnaided: true,
    skipped: false,
    completedAt: '2026-08-31',
  },
}
check('guided: and available once it is', lessonState(secondEntry!, doneFirst, true) === 'available')

const skippedFirst: Record<string, LessonProgress> = {
  L1: { ...doneFirst.L1!, skipped: true, passedUnaided: false },
}
check('a lesson marked as known reads as skipped, not as done', lessonState(firstEntry!, skippedFirst) === 'skipped')
check(
  'guided: marking a lesson as known still unlocks what came after it',
  lessonState(secondEntry!, skippedFirst, true) === 'available',
)

section('Guidance tiers')

check('the full tier walks all nine steps', stepsForTier('full').length === 9)
check('the faded tier drops the worked example and nothing else', JSON.stringify(stepsForTier('faded')) === JSON.stringify(['vocabulary', 'model', 'fadeLight', 'fadeHeavy', 'parsons', 'produce', 'trap', 'handoff']))
check(
  'the minimal tier keeps words, model, production, trap and the handoff',
  JSON.stringify(stepsForTier('minimal')) === JSON.stringify(['vocabulary', 'model', 'produce', 'trap', 'handoff']),
)
check('no clean completions means the full nine steps', guidanceTier(0) === 'full' && guidanceTier(1) === 'full')
check('two clean completions drop the worked example', guidanceTier(2) === 'faded' && guidanceTier(4) === 'faded')
check('five drop the rest', guidanceTier(5) === 'minimal' && guidanceTier(9) === 'minimal')

// -------------------------------------------------------------- lesson shape

section('Code splitting')

for (const topic of TOPICS) {
  const bundle = BUNDLES[topic.id]
  check(
    `the index and the ${topic.id} bundle agree`,
    bundle.every((lesson) => isWritten(lesson.id)) && writtenCount(topic.id) === bundle.length,
    `index says ${writtenCount(topic.id)}, bundle holds ${bundle.length}`,
  )
  check(
    `every ${topic.id} lesson is filed under its own topic`,
    bundle.every((lesson) => lesson.topicId === topic.id),
  )
}
check(
  'every id the index claims is written resolves to a real lesson',
  CURRICULUM.filter((entry) => hasLesson(entry.id)).every((entry) =>
    LESSONS.some((lesson) => lesson.id === entry.id),
  ),
)

section('Lesson shape')

check('every lesson in the curriculum is authored', LESSONS.length === CURRICULUM.length, `${LESSONS.length} of ${CURRICULUM.length}`)
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
  'the section id agrees with the topic',
  LESSONS.every((lesson) => TOPICS.find((topic) => topic.id === lesson.topicId)?.sectionId === lesson.sectionId),
)
check(
  'every objective is one sentence about what the learner will be able to do',
  LESSONS.every((lesson) => /^You will be able to /.test(lesson.objective) && lesson.objective.length < 220),
  LESSONS.filter((lesson) => !/^You will be able to /.test(lesson.objective) || lesson.objective.length >= 220)
    .map((lesson) => lesson.id)
    .join(', '),
)
check('no lesson is longer than 15 minutes', LESSONS.every((lesson) => lesson.minutes >= 5 && lesson.minutes <= 15))
check(
  'vocabulary holds three to six terms',
  LESSONS.every((lesson) => lesson.steps.vocabulary.length >= 3 && lesson.steps.vocabulary.length <= 6),
  LESSONS.filter((lesson) => lesson.steps.vocabulary.length < 3 || lesson.steps.vocabulary.length > 6)
    .map((lesson) => `${lesson.id}:${lesson.steps.vocabulary.length}`)
    .join(' '),
)
check(
  'no definition is empty and none is a paragraph',
  LESSONS.every((lesson) =>
    lesson.steps.vocabulary.every((term) => term.definition.length > 20 && term.definition.length < 260),
  ),
  LESSONS.flatMap((lesson) =>
    lesson.steps.vocabulary
      .filter((term) => term.definition.length <= 20 || term.definition.length >= 260)
      .map((term) => `${lesson.id}:${term.term}`),
  ).join(' '),
)
check(
  'the model step has a diagram and a takeaway',
  LESSONS.every((lesson) => lesson.steps.model.takeaway.length > 0 && lesson.steps.model.diagram !== undefined),
)
check(
  'the worked example carries at least two self explanation prompts',
  LESSONS.every((lesson) => lesson.steps.worked.steps.filter((step) => step.prompt).length >= 2),
  LESSONS.filter((lesson) => lesson.steps.worked.steps.filter((step) => step.prompt).length < 2)
    .map((lesson) => lesson.id)
    .join(', '),
)
check(
  'every handoff names at least two capabilities',
  LESSONS.every((lesson) => lesson.steps.handoff.canNow.length >= 2),
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
  CURRICULUM.every((entry) => entry.practice.questionIds.every((questionId) => questionIds.has(questionId))),
  CURRICULUM.flatMap((entry) => entry.practice.questionIds.filter((id) => !questionIds.has(id))).join(', '),
)
check(
  'every practice fact id exists in the deck',
  CURRICULUM.every((entry) => entry.practice.factIds.every((factId) => factIds.has(factId))),
  CURRICULUM.flatMap((entry) => entry.practice.factIds.filter((id) => !factIds.has(id))).join(', '),
)
check(
  'every lesson hands off to something, or says in its note that it does not',
  CURRICULUM.filter((entry) => hasLesson(entry.id)).every((entry) => {
    const lesson = LESSONS.find((candidate) => candidate.id === entry.id)
    if (!lesson) return false
    if (entry.practice.questionIds.length > 0 || entry.practice.factIds.length > 0) return true
    return lesson.steps.handoff.note.length > 40
  }),
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
  'and that misconception is one this topic can actually hold',
  LESSONS.every((lesson) => getMisconception(lesson.steps.trap.misconceptionId)?.topics.includes(lesson.topicId)),
  LESSONS.filter((lesson) => !getMisconception(lesson.steps.trap.misconceptionId)?.topics.includes(lesson.topicId))
    .map((lesson) => `${lesson.id}:${lesson.steps.trap.misconceptionId}`)
    .join(', '),
)
check(
  'a misconception derived from the source files names where it came from',
  MISCONCEPTIONS.filter((entry) => entry.kind === 'derived').every(
    (entry) => entry.source !== undefined && resolveSource(entry.source),
  ),
  MISCONCEPTIONS.filter((entry) => entry.kind === 'derived' && (entry.source === undefined || !resolveSource(entry.source)))
    .map((entry) => entry.id)
    .join(', '),
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
for (const topic of TOPICS) {
  const bundle = BUNDLES[topic.id]
  const used = bundle.map((lesson) => lesson.steps.trap.misconceptionId)
  check(
    `no two ${topic.id} lessons reuse the same misconception`,
    new Set(used).size === used.length,
    used.filter((id, index) => used.indexOf(id) !== index).join(', '),
  )
}

// The brief's section 5 lists twelve specific SQL traps. They map one to one
// onto lessons 3 to 14, which is what this pair of checks pins down.
check('section 5 lists twelve specific SQL traps', DOCUMENTED_SQL_TRAPS.length === 12, `got ${DOCUMENTED_SQL_TRAPS.length}`)

const sqlLessons = BUNDLES.sql
const documentedFrom3 = sqlLessons.filter((lesson) => lesson.number >= 3 && !lesson.id.endsWith('X'))
const notDocumented = documentedFrom3.filter(
  (lesson) => !DOCUMENTED_SQL_TRAPS.includes(lesson.steps.trap.misconceptionId),
)
check(
  'every numbered SQL lesson from the third onward ends on one of those twelve',
  notDocumented.length === 0,
  notDocumented.map((lesson) => `${lesson.id}:${lesson.steps.trap.misconceptionId}`).join(', '),
)

const used = sqlLessons.map((lesson) => lesson.steps.trap.misconceptionId)
const unused = DOCUMENTED_SQL_TRAPS.filter((id) => !used.includes(id))
check('and all twelve are used, each exactly once', unused.length === 0, `unused: ${unused.join(', ')}`)

const categoryLessons = sqlLessons.filter(
  (lesson) => getMisconception(lesson.steps.trap.misconceptionId)?.kind === 'category',
)
check(
  'only the two lessons before the traps begin fall back to a category',
  categoryLessons.every((lesson) => lesson.number <= 2),
  categoryLessons.map((lesson) => lesson.id).join(', '),
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
  LESSONS.filter((lesson) => lesson.steps.fadeLight.blanks !== 1).map((lesson) => lesson.id).join(', '),
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
  LESSONS.filter((lesson) => lesson.steps.fadeHeavy.blanks < 2).map((lesson) => lesson.id).join(', '),
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
  fadeGrading
    .filter(({ fade }) =>
      blankedIndices(fade.steps.length, fade.blanks).some(
        (index) => !fadeAnswerAccepted(fade, index, fade.steps[index]?.code ?? ''),
      ),
    )
    .map(({ lesson }) => lesson.id)
    .join(', '),
)
check(
  'a code answer is still accepted with different case, spacing and no semicolon',
  fadeGrading.every(({ fade }) =>
    blankedIndices(fade.steps.length, fade.blanks).every((index) => {
      const step = fade.steps[index]
      if (!step || step.prose) return true
      const messy = step.code.toUpperCase().replace(/\s+/g, '   ').replace(/;+$/, '')
      return fadeAnswerAccepted(fade, index, messy)
    }),
  ),
)
check(
  'an empty answer is never accepted',
  fadeGrading.every(({ fade }) => !fadeSatisfied(fade, {})),
)
check(
  'a blanked prose row offers a choice, and the right answer is one of them',
  fadeGrading.every(({ fade }) =>
    blankedIndices(fade.steps.length, fade.blanks).every((index) => {
      const step = fade.steps[index]
      if (!step || !step.prose) return true
      return step.choices !== undefined && step.choices.length >= 3 && step.choices.includes(step.code)
    }),
  ),
  fadeGrading
    .filter(({ fade }) =>
      blankedIndices(fade.steps.length, fade.blanks).some((index) => {
        const step = fade.steps[index]
        return step?.prose === true && (step.choices === undefined || !step.choices.includes(step.code))
      }),
    )
    .map(({ lesson }) => lesson.id)
    .join(', '),
)
check(
  'no choice list repeats itself',
  fadeGrading.every(({ fade }) =>
    fade.steps.every((step) => step.choices === undefined || new Set(step.choices).size === step.choices.length),
  ),
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
  LESSONS.filter((lesson) => !lesson.steps.parsons.blocks.some((block) => block.distractor))
    .map((lesson) => lesson.id)
    .join(', '),
)
check(
  'the step 7 fallback carries none, because it is help rather than a test',
  LESSONS.every((lesson) => lesson.steps.produce.fallback.blocks.every((block) => !block.distractor)),
)
check(
  'the authored solution is graded as correct, indentation included',
  allParsons.every(({ exercise }) => {
    const indents: Record<string, number> = {}
    for (const block of exercise.blocks) indents[block.id] = block.indent ?? 0
    return parsonsSatisfied(exercise, exercise.solution, indents)
  }),
  allParsons
    .filter(({ exercise }) => {
      const indents: Record<string, number> = {}
      for (const block of exercise.blocks) indents[block.id] = block.indent ?? 0
      return !parsonsSatisfied(exercise, exercise.solution, indents)
    })
    .map(({ lesson, where }) => `${lesson.id} ${where}`)
    .join(', '),
)
check(
  'a Python solution with everything flattened to the left is rejected',
  allParsons
    .filter(({ exercise }) => exercise.language === 'python' && exercise.blocks.some((block) => (block.indent ?? 0) > 0))
    .every(({ exercise }) => !parsonsSatisfied(exercise, exercise.solution, {})),
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
check(
  'every Python Parsons exercise says so, so it is graded on indentation',
  LESSONS.filter((lesson) => lesson.topicId === 'python').every(
    (lesson) => lesson.steps.parsons.language === 'python' && lesson.steps.produce.fallback.language === 'python',
  ),
  LESSONS.filter((lesson) => lesson.topicId === 'python' && lesson.steps.parsons.language !== 'python')
    .map((lesson) => lesson.id)
    .join(', '),
)

// -------------------------------------------------------------- free production

section('Free production')

check(
  'each family of lesson produces the thing that family produces',
  LESSONS.every((lesson) => {
    if (lesson.topicId === 'sql') return lesson.steps.produce.kind === 'sql'
    if (lesson.topicId === 'python') return lesson.steps.produce.kind === 'python'
    return lesson.steps.produce.kind === 'rule'
  }),
  LESSONS.filter((lesson) => {
    if (lesson.topicId === 'sql') return lesson.steps.produce.kind !== 'sql'
    if (lesson.topicId === 'python') return lesson.steps.produce.kind !== 'python'
    return lesson.steps.produce.kind !== 'rule'
  })
    .map((lesson) => `${lesson.id}:${lesson.steps.produce.kind}`)
    .join(', '),
)

const pythonProduce = LESSONS.map((lesson) => ({ lesson, produce: lesson.steps.produce })).filter(
  (entry): entry is { lesson: Lesson; produce: Extract<(typeof entry)['produce'], { kind: 'python' }> } =>
    entry.produce.kind === 'python',
)

check(
  'every Python blank has a marker in the template, numbered from one',
  pythonProduce.every(({ produce }) => {
    const markers = templateSegments(produce.template)
      .filter((segment) => segment.blank !== null)
      .map((segment) => segment.blank as number)
    return (
      markers.length === produce.blanks.length &&
      markers.every((marker, index) => marker === index + 1)
    )
  }),
  pythonProduce
    .filter(({ produce }) => {
      const markers = templateSegments(produce.template).filter((segment) => segment.blank !== null)
      return markers.length !== produce.blanks.length
    })
    .map(({ lesson }) => lesson.id)
    .join(', '),
)
check(
  'the authored answer is accepted for every Python blank',
  pythonProduce.every(({ produce }) =>
    produce.blanks.every((blank, index) => pythonBlankAccepted(produce, index, blank.answer)),
  ),
)
check(
  'and the answer is still accepted with extra spacing around it',
  pythonProduce.every(({ produce }) =>
    produce.blanks.every((blank, index) => pythonBlankAccepted(produce, index, `  ${blank.answer}  `)),
  ),
)
check('an empty Python answer is never accepted', pythonProduce.every(({ produce }) => !pythonBlanksSatisfied(produce, {})))
check(
  'every Python blank carries a hint that describes the job, not the answer',
  pythonProduce.every(({ produce }) =>
    produce.blanks.every((blank) => blank.hint.length > 20 && !blank.hint.includes(blank.answer)),
  ),
  pythonProduce
    .flatMap(({ lesson, produce }) =>
      produce.blanks.filter((blank) => blank.hint.length <= 20 || blank.hint.includes(blank.answer)).map(() => lesson.id),
    )
    .join(', '),
)

const ruleProduce = LESSONS.map((lesson) => ({ lesson, produce: lesson.steps.produce })).filter(
  (entry): entry is { lesson: Lesson; produce: Extract<(typeof entry)['produce'], { kind: 'rule' }> } =>
    entry.produce.kind === 'rule',
)

check(
  'every produced rule has all seven parts, in the template order',
  ruleProduce.every(({ produce }) =>
    produce.rows.length === RULE_PARTS.length && produce.rows.every((row, index) => row.part === RULE_PARTS[index]),
  ),
  ruleProduce
    .filter(({ produce }) => produce.rows.length !== RULE_PARTS.length)
    .map(({ lesson }) => `${lesson.id}:${lesson.steps.produce.kind === 'rule' ? lesson.steps.produce.rows.length : 0}`)
    .join(', '),
)
check(
  'every rule row offers at least three options and the answer is one of them',
  ruleProduce.every(({ produce }) =>
    produce.rows.every((row) => row.options.length >= 3 && row.options.includes(row.answer)),
  ),
  ruleProduce
    .flatMap(({ lesson, produce }) =>
      produce.rows.filter((row) => row.options.length < 3 || !row.options.includes(row.answer)).map((row) => `${lesson.id}:${row.part}`),
    )
    .join(', '),
)
check(
  'no rule row repeats an option',
  ruleProduce.every(({ produce }) => produce.rows.every((row) => new Set(row.options).size === row.options.length)),
)
check(
  'the authored rule is graded as correct, and an empty one is not',
  ruleProduce.every(({ produce }) => {
    const answers: Record<string, string> = {}
    for (const row of produce.rows) answers[row.part] = row.answer
    return ruleSatisfied(produce, answers) && !ruleSatisfied(produce, {})
  }),
)
check(
  'every rule row explains why that answer is the right one',
  ruleProduce.every(({ produce }) => produce.rows.every((row) => row.why.length > 30)),
)

// The security lessons' worked example is the rule template itself, per the
// brief: for those sections the process is what is being taught, not a solution.
check(
  'the security worked examples are the seven part template',
  LESSONS.filter((lesson) => lesson.steps.produce.kind === 'rule').every(
    (lesson) => lesson.steps.worked.steps.length === RULE_PARTS.length,
  ),
  LESSONS.filter(
    (lesson) => lesson.steps.produce.kind === 'rule' && lesson.steps.worked.steps.length !== RULE_PARTS.length,
  )
    .map((lesson) => `${lesson.id}:${lesson.steps.worked.steps.length}`)
    .join(', '),
)

// --------------------------------------------------------------- trace stepper

section('Trace stepper')

const traces = LESSONS.filter((lesson) => lesson.steps.worked.trace !== undefined).map((lesson) => ({
  lesson,
  trace: lesson.steps.worked.trace!,
}))

check('every Python lesson carries a trace, because Run is what PRIMM needs', BUNDLES.python.every((lesson) => lesson.steps.worked.trace !== undefined), BUNDLES.python.filter((lesson) => lesson.steps.worked.trace === undefined).map((lesson) => lesson.id).join(', '))
check(
  'every frame points at a line the program actually has',
  traces.every(({ trace }) => trace.frames.every((frame) => frame.line >= 1 && frame.line <= trace.code.length)),
  traces
    .filter(({ trace }) => trace.frames.some((frame) => frame.line < 1 || frame.line > trace.code.length))
    .map(({ lesson }) => lesson.id)
    .join(', '),
)
check(
  'the trace has at least four frames, so there is something to walk',
  traces.every(({ trace }) => trace.frames.length >= 4),
)
check(
  'the prediction has one right answer out of at least three',
  traces.every(
    ({ trace }) =>
      trace.predict.options.length >= 3 && trace.predict.options.filter((option) => option.correct).length === 1,
  ),
)
check(
  'the trace never runs backwards through the program without saying why',
  traces.every(({ trace }) =>
    trace.frames.every((frame, index) => {
      if (index === 0) return true
      const previous = trace.frames[index - 1]!
      // Going back up a file is a loop, and a loop frame has to say so.
      return frame.line >= previous.line || frame.note.length > 0
    }),
  ),
)
check(
  'the last frame prints something, or the conclusion explains what it left behind',
  traces.every(({ trace }) => trace.frames.some((frame) => frame.output !== undefined) || trace.conclusion.length > 60),
)

// ------------------------------------------------------------------ the SQL

section('Every SQL model answer runs against the sandbox')

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
for (const lesson of sqlLessons) {
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
  if (lesson.steps.produce.kind === 'sql') {
    runnable.push({ label: `${lesson.id} step 7 reference`, sql: lesson.steps.produce.referenceSql })
  }
}

check(
  'the assembled last step of every SQL fade is a complete statement',
  sqlLessons.every((lesson) =>
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

// Stage B, the JOIN and GROUP BY block.
check('L7 worked example: 21 resources sit in production accounts', scalar("SELECT COUNT(*) FROM resources WHERE account_id IN (SELECT account_id FROM cloud_accounts WHERE environment = 'prod')") === 21)
check("L7 trap: IS NOT runs here and returns the right 31 rows", scalar("SELECT COUNT(*) FROM resources WHERE account_id IS NOT 'acc-101'") === 31)
check('L8 model: 80 join rows over 32 distinct resources, 8 dropped', scalar('SELECT COUNT(*) FROM resources r JOIN findings f ON f.resource_id = r.resource_id') === 80 && scalar('SELECT COUNT(DISTINCT r.resource_id) FROM resources r JOIN findings f ON f.resource_id = r.resource_id') === 32)
check('L8 trap: an inner join searching for absence returns zero', scalar("SELECT COUNT(*) FROM resources r JOIN findings f ON f.resource_id = r.resource_id WHERE r.resource_type = 'ec2_instance' AND f.finding_id IS NULL") === 0)
check('L9 worked example: the condition in ON gives 45 rows', scalar("SELECT COUNT(*) FROM resources r LEFT JOIN findings f ON f.resource_id = r.resource_id AND f.severity = 'critical'") === 45)
check('L9 trap: the same condition in WHERE gives 26, an inner join', scalar("SELECT COUNT(*) FROM resources r LEFT JOIN findings f ON f.resource_id = r.resource_id WHERE f.severity = 'critical'") === 26 && scalar("SELECT COUNT(*) FROM findings WHERE severity = 'critical'") === 26)
check('L10 worked example: 2 ec2 instances have no findings', scalar("SELECT COUNT(*) FROM resources r LEFT JOIN findings f ON f.resource_id = r.resource_id WHERE r.resource_type = 'ec2_instance' AND f.finding_id IS NULL") === 2)
check('L11 model: 4 severity piles from 49 open findings', scalar("SELECT COUNT(*) FROM (SELECT severity FROM findings WHERE status = 'open' GROUP BY severity)") === 4)
check('L11 trap: grouping by severity alone yields 4 rows, not the 11 real pairs', scalar('SELECT COUNT(*) FROM (SELECT severity, status FROM findings GROUP BY severity)') === 4 && scalar('SELECT COUNT(*) FROM (SELECT severity, status FROM findings GROUP BY severity, status)') === 11)
check('L12 model: the three counts answer 40, 32 and 2', scalar('SELECT COUNT(*) FROM resources') === 40 && scalar('SELECT COUNT(is_public) FROM resources') === 32 && scalar('SELECT COUNT(DISTINCT is_public) FROM resources') === 2)
check('L12 heavy fade: 20 identities, 15 ever used', scalar('SELECT COUNT(*) FROM identities') === 20 && scalar('SELECT COUNT(last_used_at) FROM identities') === 15)
check('L13 worked example: 2 severities hold more than 10 open findings', scalar("SELECT COUNT(*) FROM (SELECT severity FROM findings WHERE status = 'open' GROUP BY severity HAVING COUNT(*) > 10)") === 2)
check('L14 model: res-01 fans out to 27 rows from 9 findings and 3 CVEs', scalar("SELECT COUNT(*) FROM resources r JOIN findings f ON f.resource_id = r.resource_id JOIN vulnerabilities v ON v.resource_id = r.resource_id WHERE r.resource_id = 'res-01'") === 27)
check('L14 trap: SUM over that fan out reports 245.7 instead of 27.3', Math.round(Number(scalar("SELECT SUM(v.cvss_score) FROM resources r JOIN findings f ON f.resource_id = r.resource_id JOIN vulnerabilities v ON v.resource_id = r.resource_id WHERE r.resource_id = 'res-01'")) * 10) / 10 === 245.7 && Number(scalar("SELECT SUM(cvss_score) FROM vulnerabilities WHERE resource_id = 'res-01'")) === 27.3)
check('L14 produce: res-03 totals 19.8, and 59.4 through the findings join', Number(scalar("SELECT SUM(cvss_score) FROM vulnerabilities WHERE resource_id = 'res-03'")) === 19.8 && Math.round(Number(scalar("SELECT SUM(v.cvss_score) FROM resources r JOIN findings f ON f.resource_id = r.resource_id JOIN vulnerabilities v ON v.resource_id = r.resource_id WHERE r.resource_id = 'res-03'")) * 10) / 10 === 59.4)
check('L14 heavy fade: 263.8 honestly, 802.7 through the double join', Number(scalar('SELECT SUM(cvss_score) FROM vulnerabilities')) === 263.8 && Math.round(Number(scalar('SELECT SUM(v.cvss_score) FROM resources r JOIN findings f ON f.resource_id = r.resource_id JOIN vulnerabilities v ON v.resource_id = r.resource_id')) * 10) / 10 === 802.7)

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
