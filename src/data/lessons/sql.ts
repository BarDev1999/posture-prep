import type { Lesson } from '../../types/lesson.ts'
import { lesson as lesson01 } from './lesson-01.ts'
import { lesson as lesson02 } from './lesson-02.ts'
import { lesson as lesson03 } from './lesson-03.ts'
import { lesson as lesson04 } from './lesson-04.ts'
import { lesson as lesson05 } from './lesson-05.ts'
import { lesson as lesson06 } from './lesson-06.ts'
import { lesson as lesson07 } from './lesson-07.ts'
import { lesson as lesson08 } from './lesson-08.ts'
import { lesson as lesson09 } from './lesson-09.ts'
import { lesson as lesson10 } from './lesson-10.ts'
import { lesson as lesson11 } from './lesson-11.ts'
import { lesson as lesson12 } from './lesson-12.ts'
import { lesson as lesson13 } from './lesson-13.ts'
import { lesson as lesson14 } from './lesson-14.ts'
import { lesson as lesson14x } from './lesson-14x.ts'

/**
 * The SQL topic bundle. This module is only ever reached through a dynamic
 * import in ./index.ts, which is what keeps fourteen lessons of prose out of
 * the chunk that has to paint the home screen.
 */
export const lessons: Lesson[] = [
  lesson01,
  lesson02,
  lesson03,
  lesson04,
  lesson05,
  lesson06,
  lesson07,
  lesson08,
  lesson09,
  lesson10,
  lesson11,
  lesson12,
  lesson13,
  lesson14,
  lesson14x,
]
