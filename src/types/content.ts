/** Shape of src/data/content.json, produced by scripts/build-content.ts. */

export type Difficulty = 'easy' | 'medium' | 'hard'
export type QuestionFormat = 'MCQ' | 'short' | 'SQL' | 'Python' | 'scenario'

export type SectionMeta = {
  id: number
  title: string
  /** Percentage of the exam. The five weights sum to 100. */
  weight: number
  questionCount: number
  factCount: number
}

export type Fact = {
  id: string
  number: number
  section: number
  front: string
  back: string
  /** True when file D's priority list names this fact. */
  isPriority: boolean
}

export type Question = {
  id: string
  section: number
  subsection: string | null
  difficulty: Difficulty
  format: QuestionFormat
  /** Full prompt as written in file B, code fences intact. */
  prompt: string
  /** Prompt with the multiple choice options split off, otherwise same as prompt. */
  stem: string
  options: string[] | null
  order: number
  /** Model answer from file C. */
  answer: string
  answerLetter: string | null
  referenceSql: string | null
}

export type Article = {
  id: string
  slug: string
  title: string
  markdown: string
  headings: string[]
  hasTable: boolean
  order: number
}

export type ContentBundle = {
  contentVersion: number
  generatedFrom: Record<string, string>
  sections: SectionMeta[]
  sqlSchema: string
  sqlSchemaTables: string[]
  facts: Fact[]
  questions: Question[]
  articles: Article[]
  counts: {
    facts: number
    priorityFacts: number
    questions: number
    answers: number
    articles: number
    sqlQuestions: number
    mcqTotal: number
    mcqWithOptions: number
  }
}
