import type { Lesson } from '../../types/lesson.ts'
import { lesson as lesson01 } from './lesson-01.ts'
import { lesson as lesson02 } from './lesson-02.ts'
import { lesson as lesson03 } from './lesson-03.ts'
import { lesson as lesson04 } from './lesson-04.ts'
import { lesson as lesson05 } from './lesson-05.ts'
import { lesson as lesson06 } from './lesson-06.ts'

/**
 * Every written lesson, in curriculum order. A lesson in the curriculum graph
 * with no entry here is not broken: it is simply not authored yet, and the
 * topic map shows it as such.
 *
 * Stage A: lessons 1 to 6, the SQL foundation up to the execution order model.
 */
export const LESSONS: Lesson[] = [lesson01, lesson02, lesson03, lesson04, lesson05, lesson06]

const byId = new Map(LESSONS.map((lesson) => [lesson.id, lesson]))

export function getLesson(lessonId: string): Lesson | undefined {
  return byId.get(lessonId)
}

export function hasLesson(lessonId: string): boolean {
  return byId.has(lessonId)
}
