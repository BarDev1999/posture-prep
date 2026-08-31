/**
 * Cloze deletion for level 1: the answer with one term blanked out.
 *
 * Filling a blank is an easier retrieval step than free recall, which is what
 * material seen for the first time needs. Nothing is written here: the sentence
 * is the answer from the source with one span removed, so the only judgement is
 * which span to take.
 *
 * The term is picked in order of how much it carries: a backticked identifier
 * first, then an acronym or a name, then the longest ordinary word. A fact with
 * no good candidate returns null and the drill falls back to normal recall,
 * which is better than blanking a word that gives nothing away.
 */

export type Cloze = {
  before: string
  /** The removed term, revealed after the attempt. */
  answer: string
  after: string
}

const MIN_WORDS = 6
const STOPWORDS = new Set([
  'the', 'and', 'that', 'this', 'with', 'from', 'which', 'when', 'where', 'what', 'because', 'there',
  'their', 'them', 'they', 'then', 'than', 'been', 'being', 'have', 'has', 'had', 'does', 'did',
  'into', 'onto', 'over', 'under', 'about', 'after', 'before', 'inside', 'without', 'against',
  'every', 'each', 'both', 'some', 'only', 'also', 'still', 'must', 'should', 'would', 'could',
  'means', 'meaning', 'something', 'anything', 'nothing', 'itself', 'rather', 'through',
])

function appearsIn(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

function split(text: string, term: string): Cloze | null {
  const at = text.indexOf(term)
  if (at === -1) return null
  return { before: text.slice(0, at), answer: term, after: text.slice(at + term.length) }
}

/** The first line of an answer as plain text, which is how the drill shows it. */
export function clozeSource(back: string): string {
  // A single line only. Blanking a term out of a five sentence answer leaves the
  // user hunting rather than recalling. Backticks come off because the cloze is
  // rendered as text, not as markdown, so they would otherwise show up literally.
  return (back.split('\n')[0] ?? '').replace(/`/g, '').trim()
}

export function makeCloze(front: string, back: string): Cloze | null {
  const line = clozeSource(back)
  if (line.length === 0) return null
  if (line.split(/\s+/).length < MIN_WORDS) return null

  // 1. An identifier the source marked as code: IS NULL, ss -tulpn, CAP_SYS_ADMIN.
  const firstLine = back.split('\n')[0] ?? ''
  for (const match of firstLine.matchAll(/`([^`]+)`/g)) {
    const inner = (match[1] ?? '').trim()
    if (inner.length < 2 || appearsIn(front, inner)) continue
    const result = split(line, inner)
    if (result) return result
  }

  // 2. An acronym or a proper name, which is usually the load bearing word.
  for (const match of line.matchAll(/\b[A-Z][A-Za-z0-9_]{2,}\b/g)) {
    const term = match[0]
    if (appearsIn(front, term)) continue
    const result = split(line, term)
    if (result) return result
  }

  // 3. The longest ordinary word the question has not already given away.
  const words = [...line.matchAll(/\b[a-z][a-z-]{6,}\b/g)]
    .map((match) => match[0])
    .filter((word) => !STOPWORDS.has(word) && !appearsIn(front, word))
    .sort((a, b) => b.length - a.length)

  const longest = words[0]
  if (longest) {
    const result = split(line, longest)
    if (result) return result
  }

  return null
}
