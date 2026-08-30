import { createContext, useContext, useEffect, useReducer } from 'react'
import type { Dispatch, ReactNode } from 'react'
import type { Level, ProgressState, Rating, SessionRecord, ThemeSetting } from '../types/progress.ts'
import { applyRating, newFactProgress } from '../lib/leitner.ts'
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
      // Settings are preferences, not progress, so they survive a reset.
      return { ...defaultState(), settings: state.settings }
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
