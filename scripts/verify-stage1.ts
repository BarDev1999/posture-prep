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
import { coerceState, defaultState } from '../src/lib/storage.ts'
import type { ContentBundle, Fact } from '../src/types/content.ts'
import type { FactProgress } from '../src/types/progress.ts'

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
check('a default state round trips', restored.schemaVersion === 1 && restored.settings.examDate === '2026-09-03')
check('rubbish input still yields a usable state', coerceState('not a state').facts !== undefined)
check('an out of range box is clamped', coerceState({ facts: { F1: { box: 99 } } }).facts.F1?.box === 5)
check('an invalid date is dropped', coerceState({ facts: { F1: { lastReviewed: 'yesterday' } } }).facts.F1?.lastReviewed === null)
check(
  'an unknown theme falls back to system',
  coerceState({ settings: { theme: 'neon' } }).settings.theme === 'system',
)

// --------------------------------------------------------------------- done

console.log(`\n  ${passed} checks passed, ${failures.length} failed\n`)
if (failures.length > 0) {
  for (const failure of failures) console.error(`  FAILED: ${failure}`)
  process.exit(1)
}
