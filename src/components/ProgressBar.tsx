/**
 * A ruled bar, not a pill. It sits like an underline on the row it belongs to
 * and fills with the accent, which in this app means cleared.
 *
 * Motivation stays quiet: a number and a bar, no badges and no celebration.
 */
export function ProgressBar({ value, label }: { value: number; label: string }) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div
      className="h-[3px] w-full overflow-hidden bg-raised"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${percent}%` }} />
    </div>
  )
}
