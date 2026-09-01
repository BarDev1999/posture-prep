import type { Lesson } from '../../types/lesson.ts'
import { lesson as lesson24 } from './lesson-24.ts'
import { lesson as lesson25 } from './lesson-25.ts'
import { lesson as lesson26 } from './lesson-26.ts'
import { lesson as lesson27 } from './lesson-27.ts'
import { lesson as lesson28 } from './lesson-28.ts'
import { lesson as lesson29 } from './lesson-29.ts'
import { lesson as lesson30 } from './lesson-30.ts'
import { lesson as lesson31 } from './lesson-31.ts'
import { lesson as lesson32 } from './lesson-32.ts'
import { lesson as lesson33 } from './lesson-33.ts'
import { lesson as lesson34 } from './lesson-34.ts'

/**
 * The AI security topic bundle, lessons 24 to 34.
 *
 * Every lesson here produces a detection rule rather than a solution, because
 * that is what the job produces: the worked example is the seven part template
 * from file A, section 3, and step 7 fills all seven rows for a scenario the
 * learner has not seen. The fades blank rows from the end, so a lesson that
 * fades the front half drills precision and one that fades the back half drills
 * remediation and evidence.
 */
export const lessons: Lesson[] = [
  lesson24,
  lesson25,
  lesson26,
  lesson27,
  lesson28,
  lesson29,
  lesson30,
  lesson31,
  lesson32,
  lesson33,
  lesson34,
]
