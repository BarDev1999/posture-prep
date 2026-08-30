import raw from '../data/content.json'
import type { ContentBundle, Fact, Question, SectionMeta } from '../types/content.ts'

/**
 * The generated bundle is imported into the JS chunk rather than fetched, which
 * is what makes the app work with the network disabled after one visit.
 */
export const content = raw as unknown as ContentBundle

export const sections: SectionMeta[] = content.sections
export const facts: Fact[] = content.facts
export const questions: Question[] = content.questions

const factsById = new Map(facts.map((fact) => [fact.id, fact]))
const sectionsById = new Map(sections.map((section) => [section.id, section]))

export function getFact(id: string): Fact | undefined {
  return factsById.get(id)
}

export function getSection(id: number): SectionMeta | undefined {
  return sectionsById.get(id)
}

export function sectionTitle(id: number): string {
  return sectionsById.get(id)?.title ?? `Section ${id}`
}

export function factsInSection(id: number): Fact[] {
  return facts.filter((fact) => fact.section === id)
}

export function questionsInSection(id: number): Question[] {
  return questions.filter((question) => question.section === id)
}
