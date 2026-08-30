import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { MoreSheet } from './MoreSheet.tsx'
import { levelInfo } from '../lib/levels.ts'
import { daysUntilExam } from '../lib/session.ts'
import { todayISO } from '../lib/date.ts'
import { useSettings } from '../state/AppContext.tsx'

/**
 * The frame: a thin header rule, one scrolling region, and a bottom bar that
 * keeps navigation and the difficulty control under the thumb on every screen.
 */

const navItemClass =
  'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-[11px] leading-tight'

function tabClass({ isActive }: { isActive: boolean }) {
  return `${navItemClass} ${isActive ? 'text-accent' : 'text-muted hover:text-ink'}`
}

export function AppShell() {
  const settings = useSettings()
  const [moreOpen, setMoreOpen] = useState(false)
  const today = todayISO()
  const daysLeft = daysUntilExam(settings.examDate, today)
  const level = levelInfo(settings.level)

  const daysLabel =
    daysLeft > 1 ? `${daysLeft} days left` : daysLeft === 1 ? '1 day left' : daysLeft === 0 ? 'Exam today' : 'Exam passed'

  return (
    <div className="flex h-dvh flex-col bg-ground text-ink">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2">
        <Link to="/" className="font-mono text-xs tracking-[0.14em] text-muted uppercase">
          Posture prep
        </Link>
        <Link
          to="/settings"
          className="rounded border border-line px-2 py-1 font-mono text-xs text-muted hover:text-ink"
        >
          {daysLabel}
        </Link>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>

      <nav
        aria-label="Main"
        className="flex shrink-0 items-stretch border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
      >
        <NavLink to="/" end className={tabClass}>
          <span className="font-medium">Home</span>
          <span className="text-faint">progress</span>
        </NavLink>
        <NavLink to="/drill" className={tabClass}>
          <span className="font-medium">Drill</span>
          <span className="text-faint">facts</span>
        </NavLink>
        <NavLink to="/practice" className={tabClass}>
          <span className="font-medium">Practice</span>
          <span className="text-faint">questions</span>
        </NavLink>
        <NavLink to="/sandbox" className={tabClass}>
          <span className="font-medium">Sandbox</span>
          <span className="text-faint">queries</span>
        </NavLink>
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          className={`${navItemClass} text-muted hover:text-ink`}
        >
          <span className="font-medium">More</span>
          <span className="text-faint">{level.name}</span>
        </button>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  )
}
