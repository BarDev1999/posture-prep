/**
 * Line diff for the Python questions: the buggy code as the question shows it
 * against the model code from the answer key. Seeing which line changed is the
 * point, so this is a plain longest common subsequence, no heuristics.
 */

export type DiffLine = {
  type: 'same' | 'added' | 'removed'
  text: string
  /** Line number in the original, or null for an added line. */
  before: number | null
  /** Line number in the model, or null for a removed line. */
  after: number | null
}

export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split('\n')
  const b = after.split('\n')

  // lengths[i][j] is the LCS length of a[i..] and b[j..].
  const lengths: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      const row = lengths[i]
      const next = lengths[i + 1]
      if (!row || !next) continue
      row[j] = a[i] === b[j] ? (next[j + 1] ?? 0) + 1 : Math.max(next[j] ?? 0, row[j + 1] ?? 0)
    }
  }

  const out: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ type: 'same', text: a[i] ?? '', before: i + 1, after: j + 1 })
      i += 1
      j += 1
      continue
    }
    const down = lengths[i + 1]?.[j] ?? 0
    const right = lengths[i]?.[j + 1] ?? 0
    if (down >= right) {
      out.push({ type: 'removed', text: a[i] ?? '', before: i + 1, after: null })
      i += 1
    } else {
      out.push({ type: 'added', text: b[j] ?? '', before: null, after: j + 1 })
      j += 1
    }
  }
  while (i < a.length) {
    out.push({ type: 'removed', text: a[i] ?? '', before: i + 1, after: null })
    i += 1
  }
  while (j < b.length) {
    out.push({ type: 'added', text: b[j] ?? '', before: null, after: j + 1 })
    j += 1
  }
  return out
}

export function changedLineCount(lines: DiffLine[]): number {
  return lines.filter((line) => line.type !== 'same').length
}
