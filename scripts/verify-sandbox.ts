/**
 * Builds the sandbox database outside the browser and checks the seed against
 * the properties the exercises depend on, then runs every reference query from
 * file C to prove the sandbox can actually grade them.
 *
 * Run with: npm run verify:sandbox
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

import { schemaStatements } from '../src/lib/sql/schema.ts'
import { seedStatements } from '../src/lib/sql/seed.ts'
import { grade, gradeError, orderMatters } from '../src/lib/sql/grade.ts'
import { sqliteReference } from '../src/lib/sql/adaptations.ts'
import { todayISO } from '../src/lib/date.ts'
import type { ContentBundle } from '../src/types/content.ts'

const require = createRequire(import.meta.url)
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const content = JSON.parse(readFileSync(resolve(ROOT, 'src/data/content.json'), 'utf8')) as ContentBundle

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

const initSqlJs = require('sql.js')
const SQL = await initSqlJs()
const db = new SQL.Database()

console.log('\nSchema')
const statements = schemaStatements(content.sqlSchema)
check('the schema block converts to seven CREATE TABLE statements', statements.length === 7, `got ${statements.length}`)
for (const statement of statements) db.run(statement)
check('SQLite accepts every generated statement', true)

const seed = seedStatements(todayISO())
for (const statement of seed.statements) db.run(statement)

const scalar = (sql: string): number => {
  const result = db.exec(sql)
  const value = result[0]?.values?.[0]?.[0]
  return typeof value === 'number' ? value : Number(value)
}
const rows = (sql: string): unknown[][] => (db.exec(sql)[0]?.values as unknown[][]) ?? []

console.log('\nSeed volumes')
check('six accounts', scalar('SELECT COUNT(*) FROM cloud_accounts') === 6)
check('forty resources', scalar('SELECT COUNT(*) FROM resources') === 40)
check('eighty findings', scalar('SELECT COUNT(*) FROM findings') === 80, `got ${scalar('SELECT COUNT(*) FROM findings')}`)
check('twenty identities', scalar('SELECT COUNT(*) FROM identities') === 20)
check('thirty vulnerabilities', scalar('SELECT COUNT(*) FROM vulnerabilities') === 30)
check('ten rules', scalar('SELECT COUNT(*) FROM rules') === 10)
check('thirty permissions', scalar('SELECT COUNT(*) FROM permissions') === 30)

console.log('\nSeed properties the exercises depend on')

const falseCount = scalar('SELECT COUNT(*) FROM resources WHERE is_public = 0')
const nullCount = scalar('SELECT COUNT(*) FROM resources WHERE is_public IS NULL')
const trueCount = scalar('SELECT COUNT(*) FROM resources WHERE is_public = 1')
check(
  'is_public = 0 and is_public IS NULL return different non zero counts',
  falseCount > 0 && nullCount > 0 && falseCount !== nullCount,
  `= 0 gives ${falseCount}, IS NULL gives ${nullCount}`,
)
check('at least six resources have an unknown is_public', nullCount >= 6, `got ${nullCount}`)
check('public, private and unknown all appear', trueCount > 0 && falseCount > 0 && nullCount > 0)
check(
  'the three counts add up to every resource',
  trueCount + falseCount + nullCount === 40,
  `${trueCount} + ${falseCount} + ${nullCount}`,
)
check(
  'a comparison against NULL silently drops rows',
  scalar('SELECT COUNT(*) FROM resources WHERE is_public != 1') === falseCount,
  'the NULL rows must not come back from !=',
)

const orphans = scalar(
  'SELECT COUNT(*) FROM resources r LEFT JOIN findings f ON f.resource_id = r.resource_id WHERE f.finding_id IS NULL',
)
check('at least five resources have no findings', orphans >= 5, `got ${orphans}`)

const orphanInstances = scalar(
  "SELECT COUNT(*) FROM resources r LEFT JOIN findings f ON f.resource_id = r.resource_id WHERE f.finding_id IS NULL AND r.resource_type = 'ec2_instance'",
)
check('the anti join question about ec2_instance has rows to find', orphanInstances >= 1, `got ${orphanInstances}`)

const zeroAccounts = rows(`
  SELECT a.account_id
  FROM cloud_accounts a
  LEFT JOIN resources r ON r.account_id = a.account_id AND r.is_public = 1
  LEFT JOIN vulnerabilities v ON v.resource_id = r.resource_id AND v.exploit_available = 1
  GROUP BY a.account_id
  HAVING COUNT(DISTINCT CASE WHEN v.cve_id IS NOT NULL THEN r.resource_id END) = 0
`)
check('at least one account has no public exploitable resource', zeroAccounts.length >= 1, `got ${zeroAccounts.length}`)

const innerJoinAccounts = scalar(`
  SELECT COUNT(DISTINCT a.account_id)
  FROM cloud_accounts a
  JOIN resources r ON r.account_id = a.account_id AND r.is_public = 1
  JOIN vulnerabilities v ON v.resource_id = r.resource_id AND v.exploit_available = 1
`)
check(
  'an INNER JOIN loses the zero account, so the LEFT JOIN lesson is testable',
  innerJoinAccounts < 6,
  `inner join shows ${innerJoinAccounts} of 6 accounts`,
)

const fanOut = scalar(`
  SELECT COUNT(*)
  FROM resources r
  JOIN findings f ON f.resource_id = r.resource_id
  JOIN vulnerabilities v ON v.resource_id = r.resource_id
  WHERE r.resource_id = 'res-01'
`)
const trueFindings = scalar("SELECT COUNT(*) FROM findings WHERE resource_id = 'res-01'")
check(
  'a double join fans out visibly on the busiest resource',
  fanOut > trueFindings * 2,
  `${trueFindings} findings become ${fanOut} joined rows`,
)
check(
  'COUNT(DISTINCT ...) recovers the true number',
  scalar(`
    SELECT COUNT(DISTINCT f.finding_id)
    FROM resources r
    JOIN findings f ON f.resource_id = r.resource_id
    JOIN vulnerabilities v ON v.resource_id = r.resource_id
    WHERE r.resource_id = 'res-01'
  `) === trueFindings,
)

const neverUsed = scalar('SELECT COUNT(*) FROM identities WHERE last_used_at IS NULL')
const stale = scalar("SELECT COUNT(*) FROM identities WHERE last_used_at < date('now', '-90 days')")
check('identities include never used ones', neverUsed >= 3, `got ${neverUsed}`)
check('identities include some unused for over ninety days', stale >= 3, `got ${stale}`)
check('both halves of the stale identity question are non empty', neverUsed > 0 && stale > 0)

const environments = rows('SELECT DISTINCT environment FROM cloud_accounts').map((row) => String(row[0])).sort()
check('accounts span prod, staging and dev', environments.join(',') === 'dev,prod,staging', environments.join(','))
const providers = rows('SELECT DISTINCT provider FROM cloud_accounts').map((row) => String(row[0])).sort()
check('providers span aws, azure and gcp', providers.join(',') === 'aws,azure,gcp', providers.join(','))

const openCriticalAccounts = scalar(`
  SELECT COUNT(*) FROM (
    SELECT a.account_id
    FROM findings f
    JOIN resources r ON r.resource_id = f.resource_id
    JOIN cloud_accounts a ON a.account_id = r.account_id
    WHERE f.status = 'open' AND f.severity = 'critical'
    GROUP BY a.account_id
  )
`)
check(
  'the top five accounts question has five accounts to rank',
  openCriticalAccounts >= 5,
  `got ${openCriticalAccounts}`,
)

const severities = rows("SELECT DISTINCT severity FROM findings").map((row) => String(row[0])).sort()
check('findings use all four severities', severities.join(',') === 'critical,high,low,medium', severities.join(','))
const statuses = rows('SELECT DISTINCT status FROM findings').map((row) => String(row[0])).sort()
check('findings use all three statuses', statuses.join(',') === 'open,resolved,suppressed', statuses.join(','))

console.log('\nReference queries from file C')

const sqlQuestions = content.questions.filter((q) => q.format === 'SQL')
check('every SQL question carries a reference query', sqlQuestions.every((q) => q.referenceSql !== null))

let runnable = 0
let adapted = 0
for (const question of sqlQuestions) {
  const source = question.referenceSql
  if (!source) continue
  const adaptation = sqliteReference(question.id, source)
  if (adaptation.adapted) adapted += 1
  try {
    const result = db.exec(adaptation.sql)
    const first = result[0]
    const count = first?.values?.length ?? 0
    runnable += 1
    const note = adaptation.adapted ? ' (adapted for SQLite)' : ''
    console.log(`  ok   ${question.id} runs and returns ${count} rows${note}`)
    if (count === 0) failures.push(`${question.id} returns no rows on the seed data`)
  } catch (error) {
    console.log(`  FAIL ${question.id}: ${error instanceof Error ? error.message : String(error)}`)
    failures.push(`${question.id} reference query does not run`)
  }
}
check('every reference query runs against the seed', runnable === sqlQuestions.length, `${runnable} of ${sqlQuestions.length}`)
console.log(`  note ${adapted} reference queries needed a SQLite dialect adaptation`)

console.log('\nGrading')

const run = (sql: string) => {
  const result = db.exec(sql)[0]
  return result ? { columns: result.columns, rows: result.values } : { columns: [], rows: [] }
}

const referenceOne = run(`
  SELECT r.name, r.region FROM resources r
  JOIN cloud_accounts a ON a.account_id = r.account_id
  WHERE r.resource_type = 's3_bucket' AND a.environment = 'prod'
`)
const differentlyWritten = run(`
  SELECT name, region FROM resources
  WHERE resource_type = 's3_bucket'
    AND account_id IN (SELECT account_id FROM cloud_accounts WHERE environment = 'prod')
`)
check(
  'a correct query written differently is still correct',
  grade(differentlyWritten, referenceOne, false).verdict === 'correct',
)

const missingNulls = run('SELECT * FROM resources WHERE is_public = 0')
const withNulls = run('SELECT * FROM resources WHERE is_public IS NOT 1')
const nullGrade = grade(missingNulls, withNulls, false)
check('forgetting NULL is marked wrong', nullGrade.verdict === 'wrong-rows')
check('and the hint names the missing rows', nullGrade.missingRows === nullCount, nullGrade.hint)

const orderedReference = run("SELECT severity, COUNT(*) c FROM findings GROUP BY severity ORDER BY c DESC")
const orderedWrong = run("SELECT severity, COUNT(*) c FROM findings GROUP BY severity ORDER BY c ASC")
check(
  'right rows in the wrong order is its own verdict',
  grade(orderedWrong, orderedReference, true).verdict === 'right-rows-wrong-order',
)
check('the same comparison unordered is correct', grade(orderedWrong, orderedReference, false).verdict === 'correct')

check(
  'an ORDER BY in the reference makes order matter',
  orderMatters('Return the count per severity', 'SELECT severity FROM findings ORDER BY severity'),
)
check(
  'a window function ORDER BY does not make order matter',
  !orderMatters(
    'For each account return the resources',
    'SELECT ROW_NUMBER() OVER (PARTITION BY a ORDER BY b) FROM resources',
  ),
)
check(
  'a task asking for the highest N makes order matter',
  orderMatters('Return the five accounts with the highest number of open critical findings.', 'SELECT 1'),
)

let syntaxError = ''
try {
  db.exec('SELECT * FROM')
} catch (error) {
  syntaxError = error instanceof Error ? error.message : String(error)
}
check('a syntax error produces a SQLite message', syntaxError.length > 0, syntaxError)
check('the message is passed through unchanged', gradeError(syntaxError).errorMessage === syntaxError)

console.log(`\n  ${passed} checks passed, ${failures.length} failed\n`)
if (failures.length > 0) {
  for (const failure of failures) console.error(`  FAILED: ${failure}`)
  process.exit(1)
}
