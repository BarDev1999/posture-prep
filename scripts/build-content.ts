/**
 * Build-time content parser.
 *
 * Reads the four markdown source files from content/source/ and emits
 * src/data/content.json. Run by `npm run content`, which `dev` and `build`
 * both depend on. Never run at runtime.
 *
 * This file fails loudly. A missing source file, an unmatched question ID or
 * a missing priority list stops the build with a non zero exit code, because
 * shipping partial study content is worse than shipping nothing.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// The two overrides exist so the failure paths can be exercised against a
// fixture copy without touching the real content directory.
const SOURCE_DIR = process.env.CONTENT_SOURCE_DIR
  ? resolve(process.env.CONTENT_SOURCE_DIR)
  : resolve(ROOT, 'content', 'source')
const OUT_FILE = process.env.CONTENT_OUT_FILE
  ? resolve(process.env.CONTENT_OUT_FILE)
  : resolve(ROOT, 'src', 'data', 'content.json')

const SOURCE_FILES = {
  brief: 'A_reference_brief_cortex_cloud_posture.md',
  questions: 'B_question_bank_91_questions.md',
  answers: 'C_answer_key.md',
  facts: 'D_fact_deck_54.md',
}

const DIFFICULTIES = ['easy', 'medium', 'hard']
const FORMATS = ['MCQ', 'short', 'SQL', 'Python', 'scenario']

// ---------------------------------------------------------------- utilities

function fail(message: string, detail?: string[]): never {
  console.error('\n  Content build failed.\n')
  console.error(`  ${message}`)
  if (detail && detail.length > 0) {
    for (const line of detail) console.error(`    ${line}`)
  }
  console.error('')
  process.exit(1)
}

function readSource(key: keyof typeof SOURCE_FILES): string {
  const name = SOURCE_FILES[key]
  const path = resolve(SOURCE_DIR, name)
  if (!existsSync(path)) {
    fail(`Missing source file: ${name}`, [
      `Expected at: ${path}`,
      `Put all four source files in ${SOURCE_DIR} and run the build again.`,
      `Expected files: ${Object.values(SOURCE_FILES).join(', ')}`,
    ])
  }
  const text = readFileSync(path, 'utf8')
  if (text.trim().length === 0) fail(`Source file is empty: ${name}`, [`Expected at: ${path}`])
  return text.replace(/\r\n/g, '\n')
}

/**
 * Marks every line that sits inside a fenced code block, delimiters included.
 * Markers and headings inside fences must not be read as structure, and the
 * fence content itself has to survive byte for byte including the language hint.
 */
function fenceMask(lines: string[]): boolean[] {
  const mask: boolean[] = []
  let open = false
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      mask.push(true)
      open = !open
    } else {
      mask.push(open)
    }
  }
  return mask
}

function trimBlock(lines: string[]): string {
  const copy = [...lines]
  while (copy.length > 0 && copy[0].trim() === '') copy.shift()
  while (copy.length > 0 && copy[copy.length - 1].trim() === '') copy.pop()
  return copy.join('\n')
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ------------------------------------------------------- sections and weights

type SectionMeta = { id: number; title: string; weight: number; questionCount: number }

/** The exam blueprint is data, not a constant: it lives in the table at the top of file B. */
function parseSections(bText: string): SectionMeta[] {
  const rowPattern = /^\|\s*(\d)\.\s*([^|]+?)\s*\|\s*(\d+)\s*percent\s*\|\s*(\d+)\s*\|\s*$/gm
  const sections: SectionMeta[] = []
  for (const match of bText.matchAll(rowPattern)) {
    sections.push({
      id: Number(match[1]),
      title: match[2].trim(),
      weight: Number(match[3]),
      questionCount: Number(match[4]),
    })
  }
  if (sections.length !== 5) {
    fail(`Could not read the five section weights from ${SOURCE_FILES.questions}.`, [
      `Found ${sections.length} rows, expected 5.`,
      'Expected a table with rows like: | 1. Code and SQL | 25 percent | 23 |',
    ])
  }
  const total = sections.reduce((sum, s) => sum + s.weight, 0)
  if (total !== 100) {
    fail(
      `Section weights sum to ${total} percent, expected 100.`,
      sections.map((s) => `${s.id}. ${s.title}: ${s.weight}`),
    )
  }
  return sections
}

// --------------------------------------------------------------- SQL schema

function parseSqlSchema(bText: string): { sql: string; tables: string[] } {
  const lines = bText.split('\n')
  const headingIndex = lines.findIndex((line) => /^##\s+SCHEMA\b/i.test(line))
  if (headingIndex === -1) {
    fail(`No "## SCHEMA" heading found in ${SOURCE_FILES.questions}.`, [
      'The SQL sandbox needs the schema block to build its database.',
    ])
  }
  let start = -1
  for (let i = headingIndex + 1; i < lines.length; i++) {
    if (/^```/.test(lines[i])) {
      start = i
      break
    }
    if (/^#{1,2}\s/.test(lines[i])) break
  }
  if (start === -1) fail(`No fenced code block after the "## SCHEMA" heading in ${SOURCE_FILES.questions}.`)
  let end = -1
  for (let i = start + 1; i < lines.length; i++) {
    if (/^```/.test(lines[i])) {
      end = i
      break
    }
  }
  if (end === -1) fail(`Unterminated schema code block in ${SOURCE_FILES.questions}.`)
  const sql = lines.slice(start + 1, end).join('\n')
  const tables = [...sql.matchAll(/^(\w+)\s*\(/gm)].map((m) => m[1])
  if (tables.length === 0) fail(`The schema block in ${SOURCE_FILES.questions} contains no table definitions.`)
  return { sql, tables }
}

// ---------------------------------------------------------------- questions

type ParsedQuestion = {
  id: string
  section: number
  subsection: string | null
  difficulty: string
  format: string
  prompt: string
  stem: string
  options: string[] | null
  order: number
}

type QuestionDraft = {
  id: string
  section: number
  subsection: string | null
  difficulty: string
  format: string
  body: string[]
}

function parseQuestions(bText: string, sections: SectionMeta[]): ParsedQuestion[] {
  const lines = bText.split('\n')
  const mask = fenceMask(lines)
  const questions: ParsedQuestion[] = []

  let section: number | null = null
  let subsection: string | null = null
  let current: QuestionDraft | null = null

  const flush = () => {
    if (!current) return
    const draft = current
    current = null
    const prompt = trimBlock(draft.body)
    if (prompt.length === 0) fail(`Question ${draft.id} in ${SOURCE_FILES.questions} has no text.`)
    const split = splitOptions(prompt, draft.format)
    questions.push({
      id: draft.id,
      section: draft.section,
      subsection: draft.subsection,
      difficulty: draft.difficulty,
      format: draft.format,
      prompt,
      stem: split.stem,
      options: split.options,
      order: questions.length,
    })
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (mask[i]) {
      if (current) current.body.push(line)
      continue
    }

    const sectionHeading = /^#\s+Section\s+(\d+):/.exec(line)
    if (sectionHeading) {
      flush()
      section = Number(sectionHeading[1])
      subsection = null
      continue
    }

    const marker = /^\*\*Q(\d+)\.(\d+)\*\*\s*(.*)$/.exec(line)
    if (marker) {
      flush()
      const id = `Q${marker[1]}.${marker[2]}`
      const sectionFromId = Number(marker[1])
      if (section !== null && section !== sectionFromId) {
        fail(`Question ${id} appears under section ${section} in ${SOURCE_FILES.questions}.`, [
          'The question ID and the section heading disagree.',
        ])
      }
      const tags = /`(easy|medium|hard)`\s*`(MCQ|short|SQL|Python|scenario)`/.exec(marker[3])
      if (!tags) {
        fail(`Question ${id} in ${SOURCE_FILES.questions} has no difficulty and format tags.`, [
          `Line reads: ${line.trim()}`,
          'Expected the difficulty and format tags on the same line as the question ID.',
        ])
      }
      const remainder = marker[3].replace(tags[0], '').trim()
      current = {
        id,
        section: sectionFromId,
        subsection,
        difficulty: tags[1],
        format: tags[2],
        body: remainder.length > 0 ? [remainder] : [],
      }
      continue
    }

    if (/^##\s+/.test(line)) {
      flush()
      subsection = line.replace(/^##\s+/, '').trim()
      continue
    }
    if (/^#\s+/.test(line) || /^---\s*$/.test(line)) {
      flush()
      continue
    }

    if (current) current.body.push(line)
  }
  flush()

  if (questions.length === 0) fail(`No questions found in ${SOURCE_FILES.questions}.`)

  const seen = new Set<string>()
  const duplicates: string[] = []
  for (const q of questions) {
    if (seen.has(q.id)) duplicates.push(q.id)
    seen.add(q.id)
  }
  if (duplicates.length > 0) fail(`Duplicate question IDs in ${SOURCE_FILES.questions}:`, duplicates)

  const known = new Set(sections.map((s) => s.id))
  const strays = questions.filter((q) => !known.has(q.section)).map((q) => q.id)
  if (strays.length > 0) fail('Questions belong to a section that is not in the weight table:', strays)

  return questions
}

/**
 * Pulls the "a. ... b. ... c. ... d. ..." run off the end of a multiple choice
 * prompt. Best effort: a prompt we cannot split keeps options null and still
 * renders as prose, which beats guessing wrong and dropping an option.
 */
function splitOptions(prompt: string, format: string): { stem: string; options: string[] | null } {
  if (format !== 'MCQ') return { stem: prompt, options: null }
  const lines = prompt.split('\n')
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]
    if (!/(^|\s)a\.\s/.test(line) || !/\sb\.\s/.test(line) || !/\sc\.\s/.test(line) || !/\sd\.\s/.test(line)) continue
    const starts = [...line.matchAll(/(^|\s)([a-d])\.\s+/g)]
    if (starts.length !== 4) continue
    const options: string[] = []
    for (let n = 0; n < starts.length; n++) {
      const from = starts[n].index + starts[n][0].length
      const to = n + 1 < starts.length ? starts[n + 1].index : line.length
      options.push(line.slice(from, to).trim().replace(/\.$/, ''))
    }
    const head = line.slice(0, starts[0].index).trim()
    const stemLines = lines.slice(0, i)
    if (head.length > 0) stemLines.push(head)
    return { stem: trimBlock(stemLines), options }
  }
  return { stem: prompt, options: null }
}

// ------------------------------------------------------------------ answers

type ParsedAnswer = { id: string; markdown: string; answerLetter: string | null; referenceSql: string | null }

function parseAnswers(cText: string): ParsedAnswer[] {
  const lines = cText.split('\n')
  const mask = fenceMask(lines)
  const answers: ParsedAnswer[] = []
  let current: { id: string; body: string[] } | null = null

  const flush = () => {
    if (!current) return
    const draft = current
    current = null
    const markdown = trimBlock(draft.body)
    if (markdown.length === 0) fail(`Answer ${draft.id} in ${SOURCE_FILES.answers} is empty.`)
    const letter = /^Answer\s+([a-d])\b/i.exec(markdown)
    const sql = /```sql\n([\s\S]*?)\n```/.exec(markdown)
    answers.push({
      id: draft.id,
      markdown,
      answerLetter: letter ? letter[1].toLowerCase() : null,
      referenceSql: sql ? sql[1] : null,
    })
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (mask[i]) {
      if (current) current.body.push(line)
      continue
    }
    const marker = /^\*\*Q(\d+)\.(\d+)\*\*\s*(.*)$/.exec(line)
    if (marker) {
      flush()
      const remainder = marker[3].trim()
      current = { id: `Q${marker[1]}.${marker[2]}`, body: remainder.length > 0 ? [remainder] : [] }
      continue
    }
    if (/^#{1,6}\s+/.test(line) || /^---\s*$/.test(line)) {
      flush()
      continue
    }
    if (current) current.body.push(line)
  }
  flush()

  if (answers.length === 0) fail(`No answers found in ${SOURCE_FILES.answers}.`)

  const seen = new Set<string>()
  const duplicates: string[] = []
  for (const a of answers) {
    if (seen.has(a.id)) duplicates.push(a.id)
    seen.add(a.id)
  }
  if (duplicates.length > 0) fail(`Duplicate answer IDs in ${SOURCE_FILES.answers}:`, duplicates)

  return answers
}

// -------------------------------------------------------------------- facts

type ParsedFact = {
  id: string
  number: number
  section: number
  front: string
  back: string
  isPriority: boolean
}

function parseFacts(dText: string, sections: SectionMeta[]): ParsedFact[] {
  const lines = dText.split('\n')
  const mask = fenceMask(lines)
  const facts: ParsedFact[] = []
  let section: number | null = null
  let inPriority = false
  const priorityLines: string[] = []
  let current: { number: number; section: number; front: string; body: string[] } | null = null

  const flush = () => {
    if (!current) return
    const draft = current
    current = null
    const back = trimBlock(draft.body)
    if (back.length === 0) fail(`Fact ${draft.number} in ${SOURCE_FILES.facts} has a question but no answer.`)
    facts.push({
      id: `F${draft.number}`,
      number: draft.number,
      section: draft.section,
      front: draft.front,
      back,
      isPriority: false,
    })
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (mask[i]) {
      if (current) current.body.push(line)
      continue
    }

    if (/^#{1,6}\s+Priority\b/i.test(line)) {
      flush()
      inPriority = true
      continue
    }
    if (inPriority) {
      if (/^#{1,6}\s+/.test(line)) inPriority = false
      else {
        priorityLines.push(line)
        continue
      }
    }

    const sectionHeading = /^#\s+Section\s+(\d+):/.exec(line)
    if (sectionHeading) {
      flush()
      section = Number(sectionHeading[1])
      continue
    }

    const marker = /^\*\*(\d+)\.\s+(.+?)\*\*\s*$/.exec(line)
    if (marker) {
      flush()
      if (section === null) {
        fail(`Fact ${marker[1]} in ${SOURCE_FILES.facts} appears before any "# Section N:" heading.`)
      }
      current = { number: Number(marker[1]), section, front: marker[2].trim(), body: [] }
      continue
    }

    if (/^#{1,6}\s+/.test(line) || /^---\s*$/.test(line)) {
      flush()
      continue
    }
    if (current) current.body.push(line)
  }
  flush()

  if (facts.length === 0) fail(`No facts found in ${SOURCE_FILES.facts}.`)

  const byNumber = new Map<number, ParsedFact>()
  const duplicates: string[] = []
  for (const fact of facts) {
    if (byNumber.has(fact.number)) duplicates.push(String(fact.number))
    byNumber.set(fact.number, fact)
  }
  if (duplicates.length > 0) fail(`Duplicate fact numbers in ${SOURCE_FILES.facts}:`, duplicates)

  const priorityText = priorityLines.join(' ')
  if (priorityText.trim().length === 0) {
    fail(`No priority list found in ${SOURCE_FILES.facts}.`, [
      'Expected a "Priority if you run out of time" heading followed by the fact numbers.',
      'The priority filter in the fact drill depends on it.',
    ])
  }
  const afterColon = priorityText.includes(':') ? priorityText.slice(priorityText.lastIndexOf(':') + 1) : priorityText
  const priorityNumbers = [...afterColon.matchAll(/\d+/g)].map((m) => Number(m[0]))
  if (priorityNumbers.length === 0) {
    fail(`The priority list in ${SOURCE_FILES.facts} contains no fact numbers.`, [`Read: ${priorityText.trim()}`])
  }
  const unknown = priorityNumbers.filter((n) => !byNumber.has(n))
  if (unknown.length > 0) {
    fail(
      `The priority list in ${SOURCE_FILES.facts} names facts that do not exist:`,
      unknown.map(String),
    )
  }
  for (const n of priorityNumbers) {
    const fact = byNumber.get(n)
    if (fact) fact.isPriority = true
  }

  const known = new Set(sections.map((s) => s.id))
  const strays = facts.filter((f) => !known.has(f.section)).map((f) => f.id)
  if (strays.length > 0) fail('Facts belong to a section that is not in the weight table:', strays)

  return facts
}

// ------------------------------------------------------------------ articles

type ParsedArticle = {
  id: string
  slug: string
  title: string
  markdown: string
  headings: string[]
  hasTable: boolean
  order: number
}

function parseArticles(aText: string): ParsedArticle[] {
  const lines = aText.split('\n')
  const mask = fenceMask(lines)
  const articles: ParsedArticle[] = []
  let current: { title: string; body: string[]; headings: string[] } | null = null

  const flush = () => {
    if (!current) return
    const draft = current
    current = null
    const markdown = trimBlock(draft.body)
    if (markdown.length === 0 && draft.headings.length === 0) return
    const order = articles.length
    articles.push({
      id: `A${order + 1}`,
      slug: slugify(draft.title) || `article-${order + 1}`,
      title: draft.title,
      markdown,
      headings: draft.headings,
      hasTable: /^\|/m.test(markdown),
      order,
    })
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (mask[i]) {
      if (current) current.body.push(line)
      continue
    }
    const h2 = /^##\s+(?!#)(.+?)\s*$/.exec(line)
    if (h2) {
      flush()
      current = { title: h2[1].trim(), body: [], headings: [] }
      continue
    }
    if (current) {
      const h3 = /^###\s+(.+?)\s*$/.exec(line)
      if (h3) current.headings.push(h3[1].trim())
      current.body.push(line)
    }
  }
  flush()

  if (articles.length === 0) {
    fail(`No "## " headings found in ${SOURCE_FILES.brief}, so no articles could be split out.`)
  }
  return articles
}

// ------------------------------------------------------------ code blocks

/** First fenced block of a given language, used for the Python before and after diff. */
function firstCodeBlock(markdown: string, language: string): string | null {
  const pattern = new RegExp('```' + language + '\\n([\\s\\S]*?)\\n```')
  const match = pattern.exec(markdown)
  return match ? (match[1] ?? null) : null
}

// -------------------------------------------------------- related articles

const STOPWORDS = new Set([
  'the', 'and', 'that', 'this', 'with', 'for', 'from', 'you', 'your', 'what', 'which', 'when', 'where',
  'who', 'why', 'how', 'not', 'are', 'was', 'were', 'has', 'have', 'had', 'can', 'will', 'would', 'does',
  'did', 'but', 'its', 'it', 'one', 'two', 'three', 'all', 'any', 'each', 'every', 'into', 'onto', 'out',
  'over', 'under', 'than', 'then', 'there', 'their', 'them', 'they', 'his', 'her', 'him', 'she', 'and',
  'give', 'name', 'explain', 'describe', 'write', 'return', 'returns', 'given', 'answer', 'question',
  'example', 'difference', 'between', 'first', 'second', 'third', 'more', 'most', 'only', 'also', 'use',
  'used', 'using', 'still', 'must', 'should', 'because', 'about', 'without', 'inside', 'after', 'before',
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/```[\s\S]*?```/g, ' ')
    .split(/[^a-z0-9_.-]+/)
    .map((token) => token.replace(/^[.-]+|[.-]+$/g, ''))
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token) && !/^\d+$/.test(token))
}

/**
 * Links each question and fact to the reference articles that actually discuss
 * it, scored by term overlap weighted towards rare terms. This is an index over
 * the source files, not new content: a question with no strong match gets no
 * link rather than a guessed one.
 */
function buildArticleIndex(articles: ParsedArticle[]) {
  const articleTokens = articles.map((article) => {
    const counts = new Map<string, number>()
    for (const token of tokenize(`${article.title}\n${article.markdown}`)) {
      counts.set(token, (counts.get(token) ?? 0) + 1)
    }
    return counts
  })

  const documentFrequency = new Map<string, number>()
  for (const counts of articleTokens) {
    for (const token of counts.keys()) documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1)
  }

  const total = articles.length

  /**
   * Tuned against the real files. A question about prompt injection or the
   * OWASP lists scores above 20 against the frameworks article; a plain SQL or
   * Python question, which file A simply does not cover, tops out around 8.
   * The floor sits between the two so those questions get no link at all,
   * rather than a confident link to an article that will not help.
   */
  const MIN_SCORE = 10

  return function relatedTo(text: string, limit = 2): string[] {
    const queryTokens = [...new Set(tokenize(text))]
    if (queryTokens.length === 0) return []

    const scores = articles.map((article, index) => {
      const counts = articleTokens[index]
      if (!counts) return { id: article.id, score: 0 }
      let score = 0
      for (const token of queryTokens) {
        const inArticle = counts.get(token)
        if (!inArticle) continue
        const frequency = documentFrequency.get(token) ?? total
        const idf = Math.log((total + 1) / frequency)
        // A term that appears in only one or two articles is the strongest
        // signal there is, and repeated mentions count for less than the first.
        const rarity = frequency <= 2 ? 2.5 : 1
        score += idf * idf * (1 + Math.log(inArticle)) * rarity
      }
      // Divided by query length so a long scenario is not favoured over a
      // one line question purely for having more words.
      return { id: article.id, score: score / Math.sqrt(queryTokens.length) }
    })

    const best = scores.sort((a, b) => b.score - a.score)
    const top = best[0]
    if (!top || top.score < MIN_SCORE) return []
    return best
      .filter((entry) => entry.score >= Math.max(MIN_SCORE, top.score * 0.7))
      .slice(0, limit)
      .map((entry) => entry.id)
  }
}

// --------------------------------------------------------------------- main

console.log('\n  Building content from ' + SOURCE_DIR)

const bText = readSource('questions')
const cText = readSource('answers')
const dText = readSource('facts')
const aText = readSource('brief')

const sections = parseSections(bText)
const sqlSchema = parseSqlSchema(bText)
const parsedQuestions = parseQuestions(bText, sections)
const parsedAnswers = parseAnswers(cText)
const facts = parseFacts(dText, sections)
const articles = parseArticles(aText)

// Pair every question with its answer. This is the loud failure the spec asks for.
const answersById = new Map(parsedAnswers.map((a) => [a.id, a]))
const questionIds = new Set(parsedQuestions.map((q) => q.id))
const questionsWithoutAnswer = parsedQuestions.filter((q) => !answersById.has(q.id)).map((q) => q.id)
const answersWithoutQuestion = parsedAnswers.filter((a) => !questionIds.has(a.id)).map((a) => a.id)

if (questionsWithoutAnswer.length > 0 || answersWithoutQuestion.length > 0) {
  const detail: string[] = []
  if (questionsWithoutAnswer.length > 0) {
    detail.push(
      `${questionsWithoutAnswer.length} question(s) in ${SOURCE_FILES.questions} with no answer in ${SOURCE_FILES.answers}:`,
    )
    detail.push(questionsWithoutAnswer.join(', '))
  }
  if (answersWithoutQuestion.length > 0) {
    detail.push(
      `${answersWithoutQuestion.length} answer(s) in ${SOURCE_FILES.answers} with no question in ${SOURCE_FILES.questions}:`,
    )
    detail.push(answersWithoutQuestion.join(', '))
  }
  fail('Questions and answers do not pair up by ID.', detail)
}

const relatedTo = buildArticleIndex(articles)

const questions = parsedQuestions.map((q) => {
  const answer = answersById.get(q.id)
  if (!answer) fail(`No answer for ${q.id}.`)
  return {
    ...q,
    answer: answer.markdown,
    answerLetter: answer.answerLetter,
    referenceSql: q.format === 'SQL' ? answer.referenceSql : null,
    // Buggy code as shown in the question, and the model code from the answer.
    // Question practice diffs one against the other line by line.
    promptCode: firstCodeBlock(q.prompt, 'python'),
    answerCode: firstCodeBlock(answer.markdown, 'python'),
    relatedArticles: relatedTo(`${q.prompt}\n${q.subsection ?? ''}`),
  }
})

const factsWithLinks = facts.map((fact) => ({
  ...fact,
  relatedArticles: relatedTo(`${fact.front}\n${fact.back}`, 1),
}))

// A section that quietly lost questions to a parsing slip is a silent failure,
// so check parsed counts against the counts the source file states for itself.
const countMismatch: string[] = []
for (const section of sections) {
  const actual = questions.filter((q) => q.section === section.id).length
  if (actual !== section.questionCount) {
    countMismatch.push(
      `Section ${section.id} (${section.title}): parsed ${actual}, table says ${section.questionCount}`,
    )
  }
}
if (countMismatch.length > 0) {
  fail(`Parsed question counts disagree with the table in ${SOURCE_FILES.questions}.`, countMismatch)
}

const content = {
  contentVersion: 1,
  generatedFrom: SOURCE_FILES,
  sections: sections.map((s) => ({
    ...s,
    factCount: facts.filter((f) => f.section === s.id).length,
  })),
  sqlSchema: sqlSchema.sql,
  sqlSchemaTables: sqlSchema.tables,
  facts: factsWithLinks,
  questions,
  articles,
  counts: {
    facts: facts.length,
    priorityFacts: facts.filter((f) => f.isPriority).length,
    questionsWithReference: questions.filter((q) => q.relatedArticles.length > 0).length,
    pythonDiffs: questions.filter((q) => q.promptCode && q.answerCode).length,
    questions: questions.length,
    answers: parsedAnswers.length,
    articles: articles.length,
    sqlQuestions: questions.filter((q) => q.format === 'SQL').length,
    mcqTotal: questions.filter((q) => q.format === 'MCQ').length,
    mcqWithOptions: questions.filter((q) => q.format === 'MCQ' && q.options !== null).length,
  },
}

mkdirSync(dirname(OUT_FILE), { recursive: true })
writeFileSync(OUT_FILE, JSON.stringify(content, null, 2) + '\n', 'utf8')

const byDifficulty = DIFFICULTIES.map((d) => `${d} ${questions.filter((q) => q.difficulty === d).length}`).join(', ')
const byFormat = FORMATS.map((f) => `${f} ${questions.filter((q) => q.format === f).length}`).join(', ')

console.log(`  Facts:     ${content.counts.facts} (${content.counts.priorityFacts} priority)`)
console.log(`  Questions: ${content.counts.questions}, every one paired with an answer`)
console.log(`             ${byDifficulty}`)
console.log(`             ${byFormat}`)
console.log(`  MCQ options parsed: ${content.counts.mcqWithOptions} of ${content.counts.mcqTotal}`)
console.log(`  Linked:    ${content.counts.questionsWithReference} of ${content.counts.questions} questions have a reference article, ${content.counts.pythonDiffs} python diffs`)
console.log(`  Articles:  ${content.counts.articles} (${articles.filter((a) => a.hasTable).length} contain tables)`)
console.log(`  Schema:    ${sqlSchema.tables.length} tables (${sqlSchema.tables.join(', ')})`)
console.log(`  Wrote      ${OUT_FILE}\n`)
