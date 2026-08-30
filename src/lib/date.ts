/**
 * Day handling for scheduling. Everything is a calendar day string, YYYY-MM-DD,
 * in the user's local time zone, because "due today" means the user's today.
 * Arithmetic runs in UTC on the date only value so a daylight saving change
 * cannot shift a card by a day.
 */

const DAY_MS = 24 * 60 * 60 * 1000

export function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now)
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const time = Date.parse(`${value}T00:00:00Z`)
  return Number.isFinite(time)
}

function toUTC(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`)
}

export function addDays(iso: string, days: number): string {
  const shifted = new Date(toUTC(iso) + days * DAY_MS)
  const year = shifted.getUTCFullYear()
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const day = String(shifted.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Whole days from `from` to `to`. Negative when `to` is in the past. */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUTC(to) - toUTC(from)) / DAY_MS)
}

export function isOnOrBefore(iso: string, other: string): boolean {
  return toUTC(iso) <= toUTC(other)
}

export function formatDayCount(days: number): string {
  if (days === 1) return '1 day'
  return `${days} days`
}
