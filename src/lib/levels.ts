import type { Level } from '../types/progress.ts'

export type LevelInfo = {
  value: Level
  name: string
  blurb: string
}

/** The three difficulty levels, named plainly because the control never uses an icon alone. */
export const LEVELS: LevelInfo[] = [
  {
    value: 1,
    name: 'From zero',
    blurb: 'For material never seen before. Definitions first, two options per question, hints on.',
  },
  {
    value: 2,
    name: 'Exam level',
    blurb: 'Matches the real assessment. Four options, short answers, write the query, fix the code.',
  },
  {
    value: 3,
    name: 'Hard',
    blurb: 'Only the questions tagged hard, plus scenarios. No hints, and each question is timed.',
  },
]

export function levelInfo(level: Level): LevelInfo {
  return LEVELS.find((entry) => entry.value === level) ?? LEVELS[1]!
}
