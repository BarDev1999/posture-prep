/**
 * Checks the acceptance criteria that can be proved without a browser:
 * the parser's loud failures, the generated bundle, the Leitner rules and the
 * session queue. The browser only criteria (offline, install, 380px layout,
 * console errors) are checked by hand against a running build.
 *
 * Run with: npm run verify
 */
import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { applyRating, boxInterval, dueDate, isDue, newFactProgress } from '../src/lib/leitner.ts'
import { addDays } from '../src/lib/date.ts'
import { buildDrillQueue, currentStreak, rankByNeed, requeueMissed, sectionStats } from '../src/lib/session.ts'
import {
  SCHEMA_VERSION,
  coerceState,
  defaultState,
  exportFilename,
  exportPayload,
  parseImport,
  summarise,
} from '../src/lib/storage.ts'
import {
  FULL_BLUEPRINT,
  blueprintFor,
  buildMockPaper,
  formatClock,
  paperSize,
  scorePaper,
} from '../src/lib/mock.ts'
import { keyPoints } from '../src/lib/keypoints.ts'
import { clozeSource, makeCloze } from '../src/lib/cloze.ts'
import { parseFactMarkdown } from '../src/lib/importFacts.ts'
import { mergeDeck } from '../src/lib/deck.ts'
import {
  allowsQuestion,
  buildPracticeQueue,
  reduceOptions,
  reviewQueueSize,
  sectionMediumCleared,
} from '../src/lib/practice.ts'
import { search } from '../src/lib/search.ts'
import { changedLineCount, diffLines } from '../src/lib/diff.ts'
import type { ContentBundle, Fact } from '../src/types/content.ts'
import type { FactProgress, ProgressState, QuestionProgress, QuestionResult } from '../src/types/progress.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE_DIR = resolve(ROOT, 'content', 'source')
const CONTENT_FILE = resolve(ROOT, 'src', 'data', 'content.json')

let passed = 0
const failures: string[] = []

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

/** Runs the parser against a fixture directory and returns exit code plus output. */
function runParser(sourceDir: string, outFile: string): { code: number; output: string } {
  try {
    const output = execFileSync(process.execPath, [resolve(ROOT, 'scripts', 'build-content.ts')], {
      env: { ...process.env, CONTENT_SOURCE_DIR: sourceDir, CONTENT_OUT_FILE: outFile },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { code: 0, output }
  } catch (error) {
    const err = error as { status?: number; stdout?: string; stderr?: string }
    return { code: err.status ?? 1, output: `${err.stdout ?? ''}${err.stderr ?? ''}` }
  }
}

function withFixture(mutate: (dir: string) => void): { code: number; output: string } {
  const dir = mkdtempSync(resolve(tmpdir(), 'posture-fixture-'))
  try {
    cpSync(SOURCE_DIR, dir, { recursive: true })
    mutate(dir)
    return runParser(dir, resolve(dir, 'out.json'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

// ------------------------------------------------------------------ content

section('Content')

const content = JSON.parse(readFileSync(CONTENT_FILE, 'utf8')) as ContentBundle

check('58 facts in content.json', content.facts.length === 58, `got ${content.facts.length}`)
check('91 questions in content.json', content.questions.length === 91, `got ${content.questions.length}`)
check(
  'every question carries an answer',
  content.questions.every((q) => typeof q.answer === 'string' && q.answer.length > 0),
)
check('19 facts flagged priority', content.facts.filter((f) => f.isPriority).length === 19)
check('five sections, weights sum to 100', content.sections.reduce((sum, s) => sum + s.weight, 0) === 100)
check('SQL schema holds seven tables', content.sqlSchemaTables.length === 7, content.sqlSchemaTables.join(', '))
check('reference articles were split out', content.articles.length >= 7, `got ${content.articles.length}`)
check('articles keep their markdown tables', content.articles.some((a) => a.hasTable))

const fencedQuestions = content.questions.filter((q) => q.prompt.includes('```'))
check('code fences survive in questions', fencedQuestions.length >= 6, `got ${fencedQuestions.length}`)
check(
  'fences keep their language hint',
  content.questions.some((q) => q.prompt.includes('```python')) &&
    content.questions.some((q) => q.prompt.includes('```yaml')) &&
    content.questions.some((q) => q.prompt.includes('```json')),
)
check(
  'SQL questions carry a reference query for grading',
  content.questions.filter((q) => q.format === 'SQL' && q.referenceSql).length >= 9,
)

section('Parser fails loudly')

const missingFile = withFixture((dir) => rmSync(resolve(dir, 'D_fact_deck_54.md')))
check('missing source file fails the build', missingFile.code !== 0)
check(
  'missing source file names the file and the path',
  missingFile.output.includes('D_fact_deck_54.md') && missingFile.output.includes('Expected at:'),
)

const unmatched = withFixture((dir) => {
  const path = resolve(dir, 'C_answer_key.md')
  const text = readFileSync(path, 'utf8')
  writeFileSync(path, text.replace('**Q3.12**', '**Q3.99**'))
})
check('an unmatched question ID fails the build', unmatched.code !== 0)
check(
  'the unmatched IDs are printed',
  unmatched.output.includes('Q3.12') && unmatched.output.includes('Q3.99'),
  unmatched.output.split('\n').slice(0, 6).join(' | '),
)

const emptyFile = withFixture((dir) => writeFileSync(resolve(dir, 'B_question_bank_91_questions.md'), ''))
check('an empty source file fails the build', emptyFile.code !== 0)

const noPriority = withFixture((dir) => {
  const path = resolve(dir, 'D_fact_deck_54.md')
  const text = readFileSync(path, 'utf8')
  writeFileSync(path, text.slice(0, text.indexOf('## Priority')))
})
check('a missing priority list fails the build', noPriority.code !== 0)
check('the priority failure explains itself', noPriority.output.includes('priority'))

// ------------------------------------------------------------------ leitner

section('Leitner scheduling')

const today = '2026-08-31'

const fresh = newFactProgress()
check('a new card starts in box 1', fresh.box === 1)

const missed = applyRating({ box: 4, lastReviewed: today, reviewCount: 9, lastRating: 'got' }, 'missed', today)
check('Missed it sends a card back to box 1', missed.box === 1)
check('a missed card is due again the next day', isDue(missed, addDays(today, 1)))

const hard = applyRating({ box: 3, lastReviewed: today, reviewCount: 4, lastRating: 'got' }, 'hard', today)
check('Hard keeps the card in its box', hard.box === 3)

const got = applyRating({ box: 3, lastReviewed: today, reviewCount: 4, lastRating: 'got' }, 'got', today)
check('Got it moves the card up one box', got.box === 4)

const easyAtFour = applyRating({ box: 4, lastReviewed: today, reviewCount: 6, lastRating: 'got' }, 'easy', today)
check('Easy moves the card up one box', easyAtFour.box === 5)
check('box 5 never overflows', applyRating(easyAtFour, 'easy', today).box === 5)

check('the five intervals are 1, 2, 4, 8, 16', [1, 2, 3, 4, 5].map(boxInterval).join(',') === '1,2,4,8,16')

const atBoxFive = applyRating(easyAtFour, 'easy', today)
check('a box 5 card is not due for 16 days', !isDue(atBoxFive, addDays(today, 15)))
check('a box 5 card returns on day 16', isDue(atBoxFive, addDays(today, 16)))
check('the due date is last review plus the box interval', dueDate(atBoxFive) === addDays(today, 16))

// ------------------------------------------------------------------ session

section('Session queue')

const facts = content.facts as Fact[]
const empty: Record<string, FactProgress> = {}

const allNew = buildDrillQueue(facts, empty, { sectionId: null, priorityOnly: false }, today)
check('a fresh deck queues all 58 cards', allNew.order.length === 58, `got ${allNew.order.length}`)
check('a fresh deck counts 58 unseen', allNew.unseenCount === 58)

const firstNineteen = allNew.order.slice(0, 19).map((id) => facts.find((f) => f.id === id))
check(
  'priority facts are served first',
  firstNineteen.every((fact) => fact?.isPriority === true),
)

const firstFiveSections = allNew.order.slice(0, 5).map((id) => facts.find((f) => f.id === id)?.section)
check(
  'the session interleaves sections rather than blocking one',
  new Set(firstFiveSections).size >= 3,
  firstFiveSections.join(','),
)

const priorityQueue = buildDrillQueue(facts, empty, { sectionId: null, priorityOnly: true }, today)
check('the priority filter serves only priority facts', priorityQueue.order.length === 19)
check(
  'no non priority fact leaks into the priority filter',
  priorityQueue.order.every((id) => facts.find((f) => f.id === id)?.isPriority === true),
)

const cloudOnly = buildDrillQueue(facts, empty, { sectionId: 3, priorityOnly: false }, today)
check(
  'the section filter serves only that section',
  cloudOnly.order.length === facts.filter((f) => f.section === 3).length &&
    cloudOnly.order.every((id) => facts.find((f) => f.id === id)?.section === 3),
)

// Due cards come before unseen cards.
const seeded: Record<string, FactProgress> = {}
const lateFact = facts.find((f) => !f.isPriority)
if (lateFact) seeded[lateFact.id] = { box: 1, lastReviewed: addDays(today, -5), reviewCount: 1, lastRating: 'hard' }
const mixed = buildDrillQueue(facts, seeded, { sectionId: null, priorityOnly: false }, today)
check('a due card is served before unseen cards', mixed.order[0] === lateFact?.id, `first was ${mixed.order[0]}`)
check('due and unseen are counted separately', mixed.dueCount === 1 && mixed.unseenCount === 57)

// A card scheduled for later is held back unless the user asks to drill ahead.
const parked: Record<string, FactProgress> = {}
for (const fact of facts) parked[fact.id] = { box: 5, lastReviewed: today, reviewCount: 5, lastRating: 'easy' }
const nothingDue = buildDrillQueue(facts, parked, { sectionId: null, priorityOnly: false }, today)
check('nothing is served when nothing is due', nothingDue.order.length === 0)
check('the held back cards are still counted', nothingDue.laterCount === 58)
const ahead = buildDrillQueue(facts, parked, { sectionId: null, priorityOnly: false }, today, { includeNotDue: true })
check('drilling ahead serves the whole deck', ahead.order.length === 58)

const requeued = requeueMissed(['a', 'b', 'c', 'd', 'e'], 0, 'a')
check('a missed card is requeued inside the same session', requeued.includes('a') && requeued.length === 6)
check('the requeued card does not come back immediately', requeued[1] !== 'a')

// -------------------------------------------------------------- home screen

section('Home screen logic')

const stats = sectionStats(content.sections, facts, content.questions, empty, {}, today)
check('every section reports stats', stats.length === 5)
check('an untouched deck reports zero progress', stats.every((s) => s.progress === 0))
check(
  'what to study next weights by exam percentage times gap',
  rankByNeed(stats)[0]?.section.weight === 25,
  `top was section ${rankByNeed(stats)[0]?.section.id}`,
)

const masteredSectionOne: Record<string, FactProgress> = {}
for (const fact of facts.filter((f) => f.section === 1)) {
  masteredSectionOne[fact.id] = { box: 5, lastReviewed: today, reviewCount: 5, lastRating: 'easy' }
}
const afterWork = sectionStats(content.sections, facts, content.questions, masteredSectionOne, {}, today)
const topAfter = rankByNeed(afterWork)[0]
check('a worked section drops down the ranking', topAfter?.section.id !== 1, `top was section ${topAfter?.section.id}`)

check('no sessions means no streak', currentStreak([], today) === 0)
check(
  'consecutive days build a streak',
  currentStreak(
    [
      { date: addDays(today, -2), durationMs: 0, itemsCompleted: 3, perSection: {} },
      { date: addDays(today, -1), durationMs: 0, itemsCompleted: 3, perSection: {} },
      { date: today, durationMs: 0, itemsCompleted: 1, perSection: {} },
    ],
    today,
  ) === 3,
)
check(
  'a gap breaks the streak',
  currentStreak(
    [
      { date: addDays(today, -5), durationMs: 0, itemsCompleted: 3, perSection: {} },
      { date: today, durationMs: 0, itemsCompleted: 1, perSection: {} },
    ],
    today,
  ) === 1,
)
check(
  'a streak still counts before today has a session',
  currentStreak([{ date: addDays(today, -1), durationMs: 0, itemsCompleted: 2, perSection: {} }], today) === 1,
)

// ------------------------------------------------------------------ storage

section('Storage')

const restored = coerceState(JSON.parse(JSON.stringify(defaultState())))
check(
  'a default state round trips',
  restored.schemaVersion === SCHEMA_VERSION && restored.settings.examDate === '2026-09-03',
)
check('rubbish input still yields a usable state', coerceState('not a state').facts !== undefined)
check('an out of range box is clamped', coerceState({ facts: { F1: { box: 99 } } }).facts.F1?.box === 5)
check('an invalid date is dropped', coerceState({ facts: { F1: { lastReviewed: 'yesterday' } } }).facts.F1?.lastReviewed === null)
check(
  'an unknown theme falls back to system',
  coerceState({ settings: { theme: 'neon' } }).settings.theme === 'system',
)

// ------------------------------------------------------------ level system

section('Difficulty levels')

const noAnswers: Record<string, QuestionProgress> = {}
const allQuestions = content.questions

check(
  'every multiple choice question knows its correct option',
  allQuestions.filter((q) => q.format === 'MCQ').every((q) => q.answerLetter !== null),
)

const levelOne = allQuestions.filter((q) => allowsQuestion(q, 1, noAnswers, allQuestions))
check('level 1 serves only the easy set', levelOne.every((q) => q.difficulty === 'easy'), `${levelOne.length} questions`)
check('level 1 is not empty', levelOne.length === 22, `got ${levelOne.length}`)

const levelTwo = allQuestions.filter((q) => allowsQuestion(q, 2, noAnswers, allQuestions))
check(
  'level 2 serves easy and medium, and no hard until a section is cleared',
  levelTwo.every((q) => q.difficulty !== 'hard') && levelTwo.length === 65,
  `${levelTwo.length} questions`,
)

const levelThree = allQuestions.filter((q) => allowsQuestion(q, 3, noAnswers, allQuestions))
check(
  'level 3 serves hard questions and medium scenarios only',
  levelThree.every((q) => q.difficulty === 'hard' || (q.format === 'scenario' && q.difficulty === 'medium')),
  `${levelThree.length} questions`,
)
check('level 3 includes every hard question', levelThree.filter((q) => q.difficulty === 'hard').length === 26)

// Clearing the medium set for section 5 should unlock its hard questions at level 2.
const clearedSectionFive: Record<string, QuestionProgress> = {}
for (const question of allQuestions.filter((q) => q.section === 5 && q.difficulty === 'medium')) {
  clearedSectionFive[question.id] = {
    attempts: 1,
    lastResult: 'correct',
    inReviewQueue: false,
    lastAttemptedAt: today,
  }
}
check('clearing the medium set is detected', sectionMediumCleared(5, allQuestions, clearedSectionFive))
check('another section is not affected', !sectionMediumCleared(1, allQuestions, clearedSectionFive))
const hardFive = allQuestions.find((q) => q.section === 5 && q.difficulty === 'hard')
check(
  'a cleared section unlocks its hard questions at level 2',
  hardFive !== undefined && allowsQuestion(hardFive, 2, clearedSectionFive, allQuestions),
)
const hardOne = allQuestions.find((q) => q.section === 1 && q.difficulty === 'hard')
check(
  'an uncleared section keeps them locked',
  hardOne !== undefined && !allowsQuestion(hardOne, 2, clearedSectionFive, allQuestions),
)

const fourOption = allQuestions.find((q) => q.format === 'MCQ' && q.options?.length === 4 && q.answerLetter !== null)
if (fourOption && fourOption.options) {
  const reduced = reduceOptions(fourOption.options, fourOption.answerLetter, 1)
  const correctIndex = ['a', 'b', 'c', 'd'].indexOf(fourOption.answerLetter ?? '')
  check('level 1 cuts four options down to two', reduced.options.length === 2)
  check(
    'and the correct answer is still one of them',
    reduced.options.includes(fourOption.options[correctIndex] ?? ''),
  )
  check(
    'level 2 leaves all four in place',
    reduceOptions(fourOption.options, fourOption.answerLetter, 2).options.length === 4,
  )
}

section('Practice queue')

const practiceFresh = buildPracticeQueue(allQuestions, {}, 2, { sectionId: null, formats: null }, today)
check('a fresh practice queue holds the whole level 2 pool', practiceFresh.order.length === 65)
check('and counts them all as new', practiceFresh.freshCount === 65)

const missedYesterday: Record<string, QuestionProgress> = {}
const targetQuestion = allQuestions.find((q) => q.difficulty === 'medium' && q.section === 4)
if (targetQuestion) {
  missedYesterday[targetQuestion.id] = {
    attempts: 1,
    lastResult: 'wrong',
    inReviewQueue: true,
    lastAttemptedAt: addDays(today, -1),
  }
}
const withReview = buildPracticeQueue(allQuestions, missedYesterday, 2, { sectionId: null, formats: null }, today)
check(
  'a question missed on an earlier day comes back first',
  withReview.order[0] === targetQuestion?.id,
  `first was ${withReview.order[0]}`,
)
check('the review count is reported', withReview.reviewCount === 1)
check('the review queue size is readable from progress', reviewQueueSize(missedYesterday) === 1)

const missedToday: Record<string, QuestionProgress> = {}
if (targetQuestion) {
  missedToday[targetQuestion.id] = {
    attempts: 1,
    lastResult: 'wrong',
    inReviewQueue: true,
    lastAttemptedAt: today,
  }
}
const sameDay = buildPracticeQueue(allQuestions, missedToday, 2, { sectionId: null, formats: null }, today)
check(
  'a question missed a moment ago goes to the back instead',
  sameDay.order[sameDay.order.length - 1] === targetQuestion?.id,
)

const formatFiltered = buildPracticeQueue(allQuestions, {}, 2, { sectionId: null, formats: ['MCQ'] }, today)
check(
  'the format filter serves only that format',
  formatFiltered.order.every((id) => allQuestions.find((q) => q.id === id)?.format === 'MCQ'),
)

section('Search and diffs')

const imdsHits = search('imds')
check('search finds a term across kinds', imdsHits.length >= 3, `${imdsHits.length} hits`)
check(
  'search covers articles, questions and facts',
  new Set(search('injection').map((hit) => hit.kind)).size >= 2,
  [...new Set(search('injection').map((hit) => hit.kind))].join(','),
)
check('a one letter query returns nothing', search('a').length === 0)
check('a term that appears nowhere returns nothing', search('zzzznotathing').length === 0)

const bugHunt = allQuestions.filter((q) => q.promptCode !== null && q.answerCode !== null)
check('three python questions can be diffed', bugHunt.length === 3, `got ${bugHunt.length}`)
for (const question of bugHunt) {
  const lines = diffLines(question.promptCode ?? '', question.answerCode ?? '')
  const changed = changedLineCount(lines)
  check(
    `${question.id} diffs to a small, readable change`,
    changed > 0 && changed < lines.length,
    `${changed} changed of ${lines.length} lines`,
  )
}

// ---------------------------------------------------------------- migration

section('Schema migration')

// A state written before mock attempts and imported facts existed.
const legacy = {
  schemaVersion: 1,
  settings: { level: 3, examDate: '2026-09-03', theme: 'dark', priorityOnly: true, sectionFilter: 2 },
  facts: { F1: { box: 3, lastReviewed: today, reviewCount: 4, lastRating: 'got' } },
  questions: { 'Q1.4': { attempts: 2, lastResult: 'wrong', inReviewQueue: true, lastAttemptedAt: today } },
  sessions: [{ date: today, durationMs: 1000, itemsCompleted: 5, perSection: { '1': 5 } }],
}
const migrated = coerceState(legacy)
check('an older state is migrated forward', migrated.schemaVersion === SCHEMA_VERSION)
check('the new collections start empty', migrated.mockAttempts.length === 0 && migrated.extraFacts.length === 0)
check(
  'nothing that was already there is lost',
  migrated.facts.F1?.box === 3 &&
    migrated.questions['Q1.4']?.attempts === 2 &&
    migrated.sessions.length === 1 &&
    migrated.settings.level === 3 &&
    migrated.settings.sectionFilter === 2,
)

section('Export and import')

const populated: ProgressState = {
  ...defaultState(),
  facts: { F1: { box: 2, lastReviewed: today, reviewCount: 1, lastRating: 'got' } },
  questions: { 'Q2.1': { attempts: 1, lastResult: 'correct', inReviewQueue: false, lastAttemptedAt: today } },
  sessions: [{ date: today, durationMs: 5000, itemsCompleted: 3, perSection: { '2': 3 } }],
  mockAttempts: [
    {
      id: '2026-08-31T10:00:00.000Z',
      date: today,
      variant: 'full',
      durationMs: 60_000,
      timedOut: false,
      questionIds: ['Q2.1'],
      results: { 'Q2.1': 'correct' },
      perSection: { '2': { correct: 1, total: 1 } },
      weightedScore: 100,
      rawCorrect: 1,
      rawTotal: 1,
    },
  ],
  extraFacts: [
    { id: 'X1', number: 1, section: 3, front: 'front', back: 'back', isPriority: true, sourceName: 'extra.md' },
  ],
}

const payload = exportPayload(populated, new Date('2026-08-31T12:00:00Z'))
check('the export is valid JSON', (() => {
  try {
    JSON.parse(payload)
    return true
  } catch {
    return false
  }
})())
check('the filename is dated', exportFilename(new Date('2026-08-31T12:00:00Z')) === 'posture-prep-progress-2026-08-31.json')

const reimported = parseImport(payload)
check('the export imports back', reimported.ok)
if (reimported.ok) {
  check(
    'every record survives the round trip',
    reimported.state.facts.F1?.box === 2 &&
      reimported.state.questions['Q2.1']?.lastResult === 'correct' &&
      reimported.state.sessions.length === 1 &&
      reimported.state.mockAttempts.length === 1 &&
      reimported.state.extraFacts.length === 1,
  )
  check(
    'the import summary counts what will be replaced',
    JSON.stringify(summarise(reimported.state)) === JSON.stringify(summarise(populated)),
  )
}
check('a bare state object imports too', parseImport(JSON.stringify(populated)).ok)
check('rubbish is rejected with a reason', !parseImport('not json').ok)
check('an unrelated JSON file is rejected', !parseImport('{"hello":"world"}').ok)

section('Mock exam')

check('the full paper is 25 questions', paperSize('full') === 25)
check('the short paper is 17 questions', paperSize('short') === 17)
check(
  'the full blueprint is 6, 6, 5, 5, 3',
  JSON.stringify(blueprintFor('full')) === JSON.stringify({ 1: 6, 2: 6, 3: 5, 4: 5, 5: 3 }),
)
check(
  'the short paper covers sections 1, 2 and 4 only',
  Object.keys(blueprintFor('short')).join(',') === '1,2,4',
)

const paper = buildMockPaper(allQuestions, 'full', 1234)
check('a full paper draws 25 questions', paper.length === 25)
check('with no repeats', new Set(paper).size === 25)
const paperSections = paper.map((id) => allQuestions.find((q) => q.id === id)?.section)
check(
  'and matches the blueprint section by section',
  [1, 2, 3, 4, 5].every(
    (sectionId) => paperSections.filter((value) => value === sectionId).length === FULL_BLUEPRINT[sectionId],
  ),
  paperSections.join(','),
)

const shortPaper = buildMockPaper(allQuestions, 'short', 1234)
check('a short paper is 17 questions from three sections', shortPaper.length === 17)
check(
  'and never draws from sections 3 or 5',
  shortPaper.every((id) => {
    const found = allQuestions.find((q) => q.id === id)?.section
    return found === 1 || found === 2 || found === 4
  }),
)

const secondPaper = buildMockPaper(allQuestions, 'full', 5678, paper)
const overlap = secondPaper.filter((id) => paper.includes(id)).length
check('a second attempt avoids the previous paper where it can', overlap < 8, `${overlap} of 25 repeated`)

const perfect: Record<string, QuestionResult> = {}
for (const id of paper) perfect[id] = 'correct'
const fullMarks = scorePaper(paper, allQuestions, perfect, content.sections)
check('a perfect paper scores 100', Math.round(fullMarks.weightedScore) === 100)
check('and counts every mark', fullMarks.rawCorrect === 25 && fullMarks.rawTotal === 25)

const halfMarks: Record<string, QuestionResult> = {}
for (const id of paper) halfMarks[id] = 'partial'
check('partial answers are worth half a mark', scorePaper(paper, allQuestions, halfMarks, content.sections).rawCorrect === 12.5)

const sectionOneOnly: Record<string, QuestionResult> = {}
for (const id of paper) {
  const found = allQuestions.find((q) => q.id === id)
  if (found?.section === 1) sectionOneOnly[id] = 'correct'
}
const skewed = scorePaper(paper, allQuestions, sectionOneOnly, content.sections)
check(
  'the score is weighted by section, not by question count',
  Math.round(skewed.weightedScore) === 25,
  `got ${skewed.weightedScore.toFixed(1)} for section 1 alone, which is 25 percent of the exam`,
)
check('unmarked answers are reported', scorePaper(paper, allQuestions, {}, content.sections).ungraded === 25)
check('the clock formats as minutes and seconds', formatClock(90 * 60 * 1000) === '90:00' && formatClock(-5) === '00:00')

section('Explain it back')

const sampleAnswer = content.questions.find((q) => q.id === 'Q5.6')?.answer ?? ''
const points = keyPoints(sampleAnswer)
check('a model answer splits into checklist points', points.length >= 3, `${points.length} points`)
check('no point is a fragment', points.every((point) => point.length >= 18))
check('the checklist is capped', keyPoints(content.questions.map((q) => q.answer).join('\n')).length <= 8)
check(
  'code blocks are left out of the checklist',
  keyPoints('Do this.\n```sql\nSELECT 1;\n```\nAnd then do that properly.').every(
    (point) => !point.includes('SELECT'),
  ),
)

section('Importing extra facts')

const goodDeck = [
  '# Section 3: Cloud Security',
  '',
  '**1. What makes a subnet public?**',
  'A route to an internet gateway in its route table.',
  '',
  '**2. What is a NAT gateway for?**',
  'Outbound connections from a private subnet, which is why it does not stop C2 traffic.',
  '',
  '## Priority if you run out of time',
  'Learn these first: facts 2',
].join('\n')

const imported = parseFactMarkdown(goodDeck, 'extra.md', 0)
check('a well formed deck imports', imported.ok)
if (imported.ok) {
  check('both facts are found', imported.facts.length === 2)
  check('the section comes from the heading', imported.facts.every((fact) => fact.section === 3))
  check('the priority list is honoured', imported.facts.filter((fact) => fact.isPriority).length === 1)
  check('ids do not collide with the built in deck', imported.facts.every((fact) => fact.id.startsWith('X')))
  const merged = mergeDeck(imported.facts)
  check('the imported facts merge into the deck', merged.length === content.facts.length + 2)
  check(
    'and the drill will serve them',
    buildDrillQueue(merged, {}, { sectionId: 3, priorityOnly: false }, today).order.some((id) =>
      id.startsWith('X'),
    ),
  )
}

const noSection = parseFactMarkdown('**1. A question?**\nAn answer.', 'bad.md', 0)
check('a file with no section heading is rejected', !noSection.ok)
check('and the message says what was expected', !noSection.ok && noSection.hint.includes('# Section'))
check('an empty file is rejected', !parseFactMarkdown('', 'empty.md', 0).ok)

const partialDeck = parseFactMarkdown(
  ['# Section 1: Code and SQL', '', '**1. A question with no answer?**', '', '**2. A real one?**', 'Yes.'].join('\n'),
  'partial.md',
  0,
)
check('a fact with no answer is skipped, not fatal', partialDeck.ok && partialDeck.facts.length === 1)
check('and the skip is reported', partialDeck.ok && partialDeck.warnings.some((w) => w.includes('no answer')))

section('Cloze deletion, level 1')

const clozes = content.facts.map((fact) => ({ fact, cloze: makeCloze(fact.front, fact.back) }))
const withCloze = clozes.filter((entry) => entry.cloze !== null)
check(
  'most facts can be turned into a blank to fill',
  withCloze.length >= 45,
  `${withCloze.length} of ${content.facts.length}`,
)
check(
  'the blank always comes out of the real answer',
  withCloze.every(
    ({ fact, cloze }) => cloze !== null && `${cloze.before}${cloze.answer}${cloze.after}` === clozeSource(fact.back),
  ),
)
check(
  'the cloze sentence carries no stray markdown',
  withCloze.every(({ cloze }) => !`${cloze?.before ?? ''}${cloze?.after ?? ''}`.includes('`')),
)
check(
  'the removed term is never already in the question',
  withCloze.every(({ fact, cloze }) => !fact.front.toLowerCase().includes((cloze?.answer ?? '').toLowerCase())),
)
check('no blank is a single character', withCloze.every(({ cloze }) => (cloze?.answer.length ?? 0) >= 2))
check(
  'the sentence still has context around the blank',
  withCloze.every(({ cloze }) => `${cloze?.before ?? ''}${cloze?.after ?? ''}`.trim().split(/\s+/).length >= 4),
)

const clozeOne = makeCloze('What is the only way to test for NULL?', 'Use `IS NULL` or `IS NOT NULL` on the column.')
check('a backticked identifier is preferred', clozeOne?.answer === 'IS NOT NULL' || clozeOne?.answer === 'IS NULL')
check(
  'a term the question already gave away is skipped',
  makeCloze('What does CAP_SYS_ADMIN grant?', 'CAP_SYS_ADMIN grants effectively everything a host root user can do.')
    ?.answer !== 'CAP_SYS_ADMIN',
)
check('a one word answer yields no blank', makeCloze('Question?', 'Yes.') === null)

// --------------------------------------------------------------------- done

console.log(`\n  ${passed} checks passed, ${failures.length} failed\n`)
if (failures.length > 0) {
  for (const failure of failures) console.error(`  FAILED: ${failure}`)
  process.exit(1)
}
