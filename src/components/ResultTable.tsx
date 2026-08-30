import type { SqlValue } from 'sql.js'
import type { QueryResult } from '../lib/sql/types.ts'

const MAX_ROWS = 200

function cell(value: SqlValue): { text: string; isNull: boolean } {
  if (value === null) return { text: 'NULL', isNull: true }
  if (value instanceof Uint8Array) return { text: `blob (${value.length} bytes)`, isNull: false }
  return { text: String(value), isNull: false }
}

/**
 * Query output. NULL is printed as NULL in a dimmer colour rather than as an
 * empty cell, because telling NULL apart from an empty string is half the
 * lesson in this section.
 */
export function ResultTable({ result }: { result: QueryResult }) {
  if (result.rows.length === 0) {
    return (
      <p className="border border-line bg-surface2 p-3 font-mono text-xs text-muted">
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
                  className="border-b border-line bg-surface2 px-2 py-1.5 text-left font-semibold whitespace-nowrap text-muted"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((value, columnIndex) => {
                  const { text, isNull } = cell(value)
                  return (
                    <td
                      key={columnIndex}
                      className={`border-b border-line px-2 py-1.5 whitespace-nowrap ${isNull ? 'text-faint italic' : ''}`}
                    >
                      {text}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 font-mono text-[11px] text-faint">
        {result.rows.length} {result.rows.length === 1 ? 'row' : 'rows'}
        {result.rows.length > MAX_ROWS ? `, showing the first ${MAX_ROWS}` : ''}
      </p>
    </div>
  )
}
