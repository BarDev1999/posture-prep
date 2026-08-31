import type { SqlValue } from 'sql.js'
import type { QueryResult } from '../lib/sql/types.ts'

const MAX_ROWS = 200

/**
 * The severity ramp, used here as information rather than decoration: when a
 * column really does hold a severity, the value is coloured on the scale. The
 * word is always there too, so the colour is never the only thing saying it.
 */
const SEVERITY_TONE: Record<string, string> = {
  critical: 'text-critical',
  high: 'text-high',
  medium: 'text-medium',
  low: 'text-low',
}

const STATUS_TONE: Record<string, string> = {
  open: 'text-high',
  resolved: 'text-easy',
  suppressed: 'text-faint',
}

function toneFor(column: string, text: string): string {
  const name = column.toLowerCase()
  const value = text.toLowerCase()
  if (name.includes('severity')) return SEVERITY_TONE[value] ?? ''
  if (name === 'status') return STATUS_TONE[value] ?? ''
  return ''
}

function cell(value: SqlValue): { text: string; isNull: boolean } {
  if (value === null) return { text: 'NULL', isNull: true }
  if (value instanceof Uint8Array) return { text: `blob (${value.length} bytes)`, isNull: false }
  return { text: String(value), isNull: false }
}

/**
 * Query output. NULL is printed as the word NULL in a dimmer colour rather than
 * as an empty cell, because telling NULL apart from an empty string is half the
 * lesson in this section.
 */
export function ResultTable({ result }: { result: QueryResult }) {
  if (result.rows.length === 0) {
    return (
      <p className="border border-rule bg-raised p-3 font-mono text-xs text-muted">
        0 rows. The query ran, it just matched nothing.
      </p>
    )
  }

  const shown = result.rows.slice(0, MAX_ROWS)

  return (
    <div>
      <div className="table-scroll">
        <table className="min-w-full border-collapse font-mono text-xs">
          <thead>
            <tr>
              {result.columns.map((column, index) => (
                <th
                  key={`${column}-${index}`}
                  className="border-b border-rule bg-raised px-2 py-1.5 text-left text-[11px] font-semibold tracking-[0.04em] whitespace-nowrap text-muted uppercase"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, rowIndex) => (
              <tr key={rowIndex} className="odd:bg-raised/40">
                {row.map((value, columnIndex) => {
                  const { text, isNull } = cell(value)
                  const tone = isNull ? 'text-faint italic' : toneFor(result.columns[columnIndex] ?? '', text)
                  return (
                    <td key={columnIndex} className={`border-b border-rule px-2 py-1.5 whitespace-nowrap ${tone}`}>
                      {text}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="data mt-1">
        {result.rows.length} {result.rows.length === 1 ? 'row' : 'rows'}
        {result.rows.length > MAX_ROWS ? `, showing the first ${MAX_ROWS}` : ''}
      </p>
    </div>
  )
}
