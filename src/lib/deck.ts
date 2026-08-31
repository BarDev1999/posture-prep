import { facts as builtInFacts } from './content.ts'
import type { Fact } from '../types/content.ts'
import type { ExtraFact } from '../types/progress.ts'

/**
 * The fact deck the app actually serves: the 58 parsed at build time, plus
 * anything the user imported at runtime. Imported facts sort after the built in
 * ones inside their tier, and carry no reference article, because the importer
 * has no index to match them against.
 */

function toFact(extra: ExtraFact): Fact {
  return {
    id: extra.id,
    number: 1000 + extra.number,
    section: extra.section,
    front: extra.front,
    back: extra.back,
    isPriority: extra.isPriority,
    relatedArticles: [],
  }
}

let cacheKey = ''
let cached: Fact[] = builtInFacts

export function mergeDeck(extra: ExtraFact[]): Fact[] {
  if (extra.length === 0) return builtInFacts
  const key = extra.map((fact) => fact.id).join(',')
  if (key !== cacheKey) {
    cacheKey = key
    cached = [...builtInFacts, ...extra.map(toFact)]
  }
  return cached
}

export function isImported(factId: string): boolean {
  return factId.startsWith('X')
}
