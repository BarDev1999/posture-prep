import type { Lesson } from '../../types/lesson.ts'
import { lesson as lesson35 } from './lesson-35.ts'
import { lesson as lesson36 } from './lesson-36.ts'
import { lesson as lesson37 } from './lesson-37.ts'
import { lesson as lesson38 } from './lesson-38.ts'
import { lesson as lesson39 } from './lesson-39.ts'
import { lesson as lesson40 } from './lesson-40.ts'
import { lesson as lesson41 } from './lesson-41.ts'
import { lesson as lesson42 } from './lesson-42.ts'
import { lesson as lesson43 } from './lesson-43.ts'

/**
 * The cloud security topic bundle, lessons 35 to 43.
 *
 * The topic is built to end where it does: the last lesson is a rule that
 * reuses routing, security groups, IAM, metadata and classification at once,
 * because the job is not knowing those separately, it is noticing when they
 * meet.
 */
export const lessons: Lesson[] = [
  lesson35,
  lesson36,
  lesson37,
  lesson38,
  lesson39,
  lesson40,
  lesson41,
  lesson42,
  lesson43,
]
