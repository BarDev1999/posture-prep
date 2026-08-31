import type { ExtraFact } from '../types/progress.ts'

/**
 * Runtime parser for extra fact decks, in the same format as file D.
 *
 * This is how the user adds material after the exam without a rebuild, so it
 * runs in the browser rather than at build time. It deliberately repeats the
 * rules from scripts/build-content.ts rather than sharing them, because that
 * file is a Node script and pulling it into the bundle would drag the whole
 * build pipeline along with it.
 */

export type FactImport =
  | { ok: true; facts: ExtraFact[]; warnings: string[] }
  | { ok: false; error: string; hint: string }

const EXAMPLE = [
  '# Section 3: Cloud Security',
  '',
  '**1. What is a VPC endpoint for?**',
  'Reaching a service without traversing the public internet.',
  '',
  '## Priority',
  'Learn these first: facts 1',
].join('\n')

export function parseFactMarkdown(text: string, sourceName: string, idOffset = 0): FactImport {
  const normalised = text.replace(/\r\n/g, '\n')
  const lines = normalised.split('\n')

  const drafts: { number: number; section: number; front: string; body: string[] }[] = []
  const warnings: string[] = []
  const priorityLines: string[] = []

  let section: number | null = null
  let inPriority = false
  let inFence = false
  let current: { number: number; section: number; front: string; body: string[] } | null = null

  const flush = () => {
    if (!current) return
    const draft = current
    current = null
    while (draft.body.length > 0 && (draft.body[0] ?? '').trim() === '') draft.body.shift()
    while (draft.body.length > 0 && (draft.body[draft.body.length - 1] ?? '').trim() === '') draft.body.pop()
    if (draft.body.length === 0) {
      warnings.push(`Fact ${draft.number} has a question but no answer, so it was skipped.`)
      return
    }
    drafts.push(draft)
  }

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence
      if (current) current.body.push(line)
      continue
    }
    if (inFence) {
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
      const parsed = Number(sectionHeading[1])
      if (parsed >= 1 && parsed <= 5) {
        section = parsed
      } else {
        warnings.push(`Section ${parsed} is not one of the five exam sections, so its facts were skipped.`)
        section = null
      }
      continue
    }

    const marker = /^\*\*(\d+)\.\s+(.+?)\*\*\s*$/.exec(line)
    if (marker) {
      flush()
      if (section === null) {
        warnings.push(`Fact ${marker[1]} appears before any section heading, so it was skipped.`)
        continue
      }
      current = { number: Number(marker[1]), section, front: (marker[2] ?? '').trim(), body: [] }
      continue
    }

    if (/^#{1,6}\s+/.test(line) || /^---\s*$/.test(line)) {
      flush()
      continue
    }
    if (current) current.body.push(line)
  }
  flush()

  if (drafts.length === 0) {
    const sawSection = lines.some((line) => /^#\s+Section\s+\d+:/.test(line))
    return {
      ok: false,
      error: sawSection
        ? 'No facts were found in that file.'
        : 'That file has no "# Section N:" heading, so there is nothing to attach the facts to.',
      hint: `Expected the same shape as the fact deck:\n\n${EXAMPLE}`,
    }
  }

  const priorityText = priorityLines.join(' ')
  const afterColon = priorityText.includes(':') ? priorityText.slice(priorityText.lastIndexOf(':') + 1) : priorityText
  const priorityNumbers = new Set([...afterColon.matchAll(/\d+/g)].map((match) => Number(match[0])))

  const seen = new Set<number>()
  const facts: ExtraFact[] = []
  for (const draft of drafts) {
    if (seen.has(draft.number)) {
      warnings.push(`Fact number ${draft.number} appears more than once. Only the first was kept.`)
      continue
    }
    seen.add(draft.number)
    facts.push({
      id: `X${idOffset + facts.length + 1}`,
      number: draft.number,
      section: draft.section,
      front: draft.front,
      back: draft.body.join('\n'),
      isPriority: priorityNumbers.has(draft.number),
      sourceName,
    })
  }

  if (priorityNumbers.size === 0) {
    warnings.push('No priority list found, so none of these facts are flagged as priority.')
  }

  return { ok: true, facts, warnings }
}
