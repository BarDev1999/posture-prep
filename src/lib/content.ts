import raw from '../data/content.json' with { type: 'json' }
import type { Article, ContentBundle, Fact, Question, SectionMeta } from '../types/content.ts'

/**
 * The generated bundle is imported into the JS chunk rather than fetched, which
 * is what makes the app work with the network disabled after one visit.
 */
export const content = raw as unknown as ContentBundle

export const sections: SectionMeta[] = content.sections
export const facts: Fact[] = content.facts
export const questions: Question[] = content.questions

export const articles: Article[] = content.articles

const factsById = new Map(facts.map((fact) => [fact.id, fact]))
const sectionsById = new Map(sections.map((section) => [section.id, section]))
const articlesById = new Map(articles.map((article) => [article.id, article]))
const questionsById = new Map(questions.map((question) => [question.id, question]))

export function articleById(id: string): Article | undefined {
  return articlesById.get(id)
}

export function getQuestion(id: string): Question | undefined {
  return questionsById.get(id)
}

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
