/**
 * Splits a model answer into the points it makes, for the checklist in
 * "Explain it back".
 *
 * This is a mechanical split of text that already exists: bullet lines stay
 * whole, prose is cut at sentence ends, code fences are dropped because you do
 * not tick a code block off a list. Nothing here writes new material.
 */

const MIN_LENGTH = 18
const MAX_POINTS = 8

export function keyPoints(markdown: string): string[] {
  const withoutCode = markdown.replace(/```[\s\S]*?```/g, ' ')
  const points: string[] = []

  for (const rawLine of withoutCode.split('\n')) {
    const line = rawLine.trim()
    if (line.length === 0) continue

    // A bullet or a numbered item is already one point.
    const bullet = /^(?:[-*+]|\d+\.)\s+(.*)$/.exec(line)
    if (bullet) {
      const text = clean(bullet[1] ?? '')
      if (text.length >= MIN_LENGTH) points.push(text)
      continue
    }

    for (const sentence of splitSentences(line)) {
      const text = clean(sentence)
      if (text.length >= MIN_LENGTH) points.push(text)
    }
  }

  // Long answers are trimmed rather than shown in full: a checklist of twenty
  // items is not a checklist.
  const unique: string[] = []
  for (const point of points) {
    if (!unique.some((existing) => existing.toLowerCase() === point.toLowerCase())) unique.push(point)
    if (unique.length >= MAX_POINTS) break
  }
  return unique
}

function splitSentences(text: string): string[] {
  // Split after a full stop, question mark or colon followed by a space and a
  // capital, which keeps `169.254.169.254` and `v1.2` in one piece.
  return text.split(/(?<=[.?!:])\s+(?=[A-Z`])/)
}

function clean(text: string): string {
  return text
    .replace(/^\*\*(.+?)\*\*:?\s*/, '$1: ')
    .replace(/\s+/g, ' ')
    .trim()
}
