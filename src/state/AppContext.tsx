import { createContext, useContext, useEffect, useReducer } from 'react'
import type { Dispatch, ReactNode } from 'react'
import type {
  ExtraFact,
  Level,
  MockAttempt,
  ProgressState,
  QuestionResult,
  Rating,
  SessionRecord,
  ThemeSetting,
} from '../types/progress.ts'
import { applyRating, newFactProgress } from '../lib/leitner.ts'
import { NEW_LESSON_PROGRESS, NEW_TOPIC_PROGRESS, TOTAL_STEPS, guidanceTier } from '../lib/learn.ts'
import { defaultState, loadState, saveState } from '../lib/storage.ts'

/**
 * All progress state lives here: React context plus a reducer, no state
 * library. Every change is written straight back to localStorage through
 * src/lib/storage.ts, which is what makes progress survive a reload, a restart
 * and an app close.
 */

export type Action =
  | {
      type: 'rate-fact'
      factId: string
      sectionId: number
      rating: Rating
      today: string
      elapsedMs: number
    }
  | {
      type: 'answer-question'
      questionId: string
      sectionId: number
      result: QuestionResult
      today: string
      elapsedMs: number
    }
  | { type: 'clear-review'; questionId: string }
  | { type: 'lesson-step'; lessonId: string; step: number }
  | { type: 'lesson-produce'; lessonId: string; passed: boolean }
  | { type: 'lesson-trap'; misconceptionId: string; correct: boolean; today: string }
  | { type: 'lesson-complete'; lessonId: string; topicId: string; today: string }
  | { type: 'save-mock'; attempt: MockAttempt }
  | { type: 'import-facts'; facts: ExtraFact[] }
  | { type: 'remove-imported'; sourceName: string }
  | { type: 'set-theme'; theme: ThemeSetting }
  | { type: 'set-level'; level: Level }
  | { type: 'set-exam-date'; examDate: string }
  | { type: 'set-priority-only'; value: boolean }
  | { type: 'set-section-filter'; value: number | null }
  | { type: 'replace'; state: ProgressState }
  | { type: 'reset' }

function upsertSession(sessions: SessionRecord[], today: string, sectionId: number, elapsedMs: number): SessionRecord[] {
  const index = sessions.findIndex((session) => session.date === today)
  const key = String(sectionId)
  if (index === -1) {
    return [...sessions, { date: today, durationMs: elapsedMs, itemsCompleted: 1, perSection: { [key]: 1 } }]
  }
  const existing = sessions[index]
  if (!existing) return sessions
  const updated: SessionRecord = {
    ...existing,
    durationMs: existing.durationMs + elapsedMs,
    itemsCompleted: existing.itemsCompleted + 1,
    perSection: { ...existing.perSection, [key]: (existing.perSection[key] ?? 0) + 1 },
  }
  const next = [...sessions]
  next[index] = updated
  return next
}

export function reducer(state: ProgressState, action: Action): ProgressState {
  switch (action.type) {
    case 'rate-fact': {
      const previous = state.facts[action.factId] ?? newFactProgress()
      return {
        ...state,
        facts: { ...state.facts, [action.factId]: applyRating(previous, action.rating, action.today) },
        sessions: upsertSession(state.sessions, action.today, action.sectionId, Math.max(0, action.elapsedMs)),
      }
    }
    case 'answer-question': {
      const previous = state.questions[action.questionId]
      return {
        ...state,
        questions: {
          ...state.questions,
          [action.questionId]: {
            attempts: (previous?.attempts ?? 0) + 1,
            lastResult: action.result,
            // Anything short of correct comes back at the start of the next session.
            inReviewQueue: action.result !== 'correct',
            lastAttemptedAt: action.today,
          },
        },
        sessions: upsertSession(state.sessions, action.today, action.sectionId, Math.max(0, action.elapsedMs)),
      }
    }
    case 'clear-review': {
      const previous = state.questions[action.questionId]
      if (!previous) return state
      return {
        ...state,
        questions: { ...state.questions, [action.questionId]: { ...previous, inReviewQueue: false } },
      }
    }
    case 'lesson-step': {
      const previous = state.lessons[action.lessonId] ?? NEW_LESSON_PROGRESS
      const step = Math.min(TOTAL_STEPS, Math.max(1, action.step))
      if (previous.currentStep === step && previous.status !== 'not-started') return state
      return {
        ...state,
        lessons: {
          ...state.lessons,
          [action.lessonId]: {
            ...previous,
            currentStep: step,
            // A completed lesson stays completed while it is being reread.
            status: previous.status === 'complete' ? 'complete' : 'in-progress',
          },
        },
      }
    }
    case 'lesson-produce': {
      const previous = state.lessons[action.lessonId] ?? NEW_LESSON_PROGRESS
      // Unaided means the learner never had to fall back to the Parsons help.
      const aided = previous.aided || !action.passed
      return {
        ...state,
        lessons: {
          ...state.lessons,
          [action.lessonId]: {
            ...previous,
            status: previous.status === 'complete' ? 'complete' : 'in-progress',
            produceAttempts: previous.produceAttempts + 1,
            aided,
            passedUnaided: action.passed && !aided,
          },
        },
      }
    }
    case 'lesson-trap': {
      const previous = state.misconceptions[action.misconceptionId] ?? {
        fellFor: 0,
        lastFellAt: null,
        clearedAt: null,
      }
      const next = action.correct
        ? {
            ...previous,
            // Cleared only means something for a misconception they once fell for.
            clearedAt: previous.fellFor > 0 ? action.today : previous.clearedAt,
          }
        : { fellFor: previous.fellFor + 1, lastFellAt: action.today, clearedAt: null }
      return { ...state, misconceptions: { ...state.misconceptions, [action.misconceptionId]: next } }
    }
    case 'lesson-complete': {
      const previous = state.lessons[action.lessonId] ?? NEW_LESSON_PROGRESS
      // Reaching the end of a lesson twice must not count twice towards fluency.
      if (previous.status === 'complete') return state
      const topic = state.topics[action.topicId] ?? NEW_TOPIC_PROGRESS
      const clean = previous.passedUnaided
      const cleanCompletions = topic.cleanCompletions + (clean ? 1 : 0)
      return {
        ...state,
        lessons: {
          ...state.lessons,
          [action.lessonId]: {
            ...previous,
            status: 'complete',
            currentStep: TOTAL_STEPS,
            completedAt: action.today,
          },
        },
        topics: {
          ...state.topics,
          [action.topicId]: {
            // Consecutive, so one aided lesson resets it. Two in a row is fluent.
            fluencyStreak: clean ? topic.fluencyStreak + 1 : 0,
            cleanCompletions,
            guidanceTier: guidanceTier(cleanCompletions),
          },
        },
      }
    }
    case 'save-mock':
      return { ...state, mockAttempts: [...state.mockAttempts, action.attempt] }
    case 'import-facts':
      return { ...state, extraFacts: [...state.extraFacts, ...action.facts] }
    case 'remove-imported': {
      const removed = new Set(
        state.extraFacts.filter((fact) => fact.sourceName === action.sourceName).map((fact) => fact.id),
      )
      if (removed.size === 0) return state
      const facts = { ...state.facts }
      for (const id of removed) delete facts[id]
      return {
        ...state,
        facts,
        extraFacts: state.extraFacts.filter((fact) => fact.sourceName !== action.sourceName),
      }
    }
    case 'set-theme':
      return { ...state, settings: { ...state.settings, theme: action.theme } }
    case 'set-level':
      return { ...state, settings: { ...state.settings, level: action.level } }
    case 'set-exam-date':
      return { ...state, settings: { ...state.settings, examDate: action.examDate } }
    case 'set-priority-only':
      return { ...state, settings: { ...state.settings, priorityOnly: action.value } }
    case 'set-section-filter':
      return { ...state, settings: { ...state.settings, sectionFilter: action.value } }
    case 'replace':
      return action.state
    case 'reset':
      // Settings are preferences and imported facts are content. Neither is
      // progress, so both survive a reset.
      return { ...defaultState(), settings: state.settings, extraFacts: state.extraFacts }
  }
}

const StateContext = createContext<ProgressState | null>(null)
const DispatchContext = createContext<Dispatch<Action> | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  // Dark mode follows the system setting unless the user has picked a side.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = state.settings.theme === 'system' ? media.matches : state.settings.theme === 'dark'
      document.documentElement.classList.toggle('dark', dark)
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [state.settings.theme])

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StateContext.Provider>
  )
}

export function useProgress(): ProgressState {
  const state = useContext(StateContext)
  if (!state) throw new Error('useProgress must be used inside AppProvider')
  return state
}

export function useAppDispatch(): Dispatch<Action> {
  const dispatch = useContext(DispatchContext)
  if (!dispatch) throw new Error('useAppDispatch must be used inside AppProvider')
  return dispatch
}

export function useSettings() {
  return useProgress().settings
}
