import type { Lesson } from '../../types/lesson.ts'
import { lesson as lesson15 } from './lesson-15.ts'
import { lesson as lesson16 } from './lesson-16.ts'
import { lesson as lesson17 } from './lesson-17.ts'
import { lesson as lesson18 } from './lesson-18.ts'
import { lesson as lesson19 } from './lesson-19.ts'
import { lesson as lesson20 } from './lesson-20.ts'
import { lesson as lesson21 } from './lesson-21.ts'
import { lesson as lesson22 } from './lesson-22.ts'
import { lesson as lesson23 } from './lesson-23.ts'

/**
 * The Python topic bundle, lessons 15 to 23.
 *
 * PRIMM rather than the plain worked example sequence: every lesson predicts,
 * then runs as a stepped trace, then investigates, then modifies. There is no
 * Python runtime in the app, so Run is authored line by line and step 7 is a
 * fill in the blanks over a template, which is what the brief asks for.
 */
export const lessons: Lesson[] = [
  lesson15,
  lesson16,
  lesson17,
  lesson18,
  lesson19,
  lesson20,
  lesson21,
  lesson22,
  lesson23,
]
