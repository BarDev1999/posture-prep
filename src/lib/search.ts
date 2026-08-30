import { articles, facts, questions } from './content.ts'

/**
 * One search box across everything: reference articles, questions and facts.
 * Deliberately simple substring and term matching, run over the bundle already
 * in memory, so it works offline and needs no index to ship.
 */

export type SearchKind = 'article' | 'question' | 'fact'

export type SearchHit = {
  kind: SearchKind
  id: string
  title: string
  snippet: string
  section: number | null
  score: number
}

type Document = {
  kind: SearchKind
  id: string
  title: string
  body: string
  section: number | null
}

let corpus: Document[] | null = null

function buildCorpus(): Document[] {
  if (corpus) return corpus
  corpus = [
    ...articles.map((article) => ({
      kind: 'article' as const,
      id: article.id,
      title: article.title,
      body: `${article.headings.join('\n')}\n${article.markdown}`,
      section: null,
    })),
    ...questions.map((question) => ({
      kind: 'question' as const,
      id: question.id,
      title: `${question.id}, ${question.format}, ${question.difficulty}`,
      body: `${question.prompt}\n${question.answer}`,
      section: question.section,
    })),
    ...facts.map((fact) => ({
      kind: 'fact' as const,
      id: fact.id,
      title: fact.front,
      body: fact.back,
      section: fact.section,
    })),
  ]
  return corpus
}

function makeSnippet(body: string, term: string): string {
  const plain = body.replace(/\s+/g, ' ').trim()
  const at = plain.toLowerCase().indexOf(term)
  if (at === -1) return plain.slice(0, 140)
  const from = Math.max(0, at - 60)
  const to = Math.min(plain.length, at + term.length + 90)
  return `${from > 0 ? '...' : ''}${plain.slice(from, to)}${to < plain.length ? '...' : ''}`
}

export function search(query: string, limit = 40): SearchHit[] {
  const trimmed = query.trim().toLowerCase()
  if (trimmed.length < 2) return []

  const terms = trimmed.split(/\s+/).filter((term) => term.length >= 2)
  if (terms.length === 0) return []

  const hits: SearchHit[] = []
  for (const document of buildCorpus()) {
    const title = document.title.toLowerCase()
    const body = document.body.toLowerCase()
    let score = 0
    let matchedAll = true

    for (const term of terms) {
      const inTitle = title.includes(term)
      const bodyCount = body.split(term).length - 1
      if (!inTitle && bodyCount === 0) {
        matchedAll = false
        break
      }
      // A hit in the title is worth more than a passing mention in the body.
      score += (inTitle ? 6 : 0) + Math.min(bodyCount, 6)
    }
    if (!matchedAll) continue

    hits.push({
      kind: document.kind,
      id: document.id,
      title: document.title,
      snippet: makeSnippet(document.body, terms[0] ?? ''),
      section: document.section,
      score,
    })
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit)
}
