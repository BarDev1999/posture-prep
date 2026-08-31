import type { Diagram as DiagramSpec } from '../../types/lesson.ts'

/**
 * Lesson diagrams, drawn as inline SVG rather than shipped as images: they have
 * to follow the theme, stay sharp, and work with the network off.
 *
 * Three shapes cover the SQL block. A pipeline for a query moving stage by
 * stage with the row count shrinking, a grid for a table, and three buckets for
 * three valued logic. Each one is sized in a 340 unit viewBox, which is roughly
 * the content width of a 380px phone, so the type inside is real size there and
 * scales up rather than down.
 */

const WIDTH = 340

export function Diagram({ spec }: { spec: DiagramSpec }) {
  return (
    <figure className="mt-4">
      <div className="sheet overflow-hidden p-3">
        {spec.kind === 'pipeline' ? <Pipeline spec={spec} /> : null}
        {spec.kind === 'rows' ? <Rows spec={spec} /> : null}
        {spec.kind === 'buckets' ? <Buckets spec={spec} /> : null}
      </div>
      <figcaption className="mt-1.5 text-xs leading-relaxed text-muted">{spec.caption}</figcaption>
    </figure>
  )
}

// ------------------------------------------------------------------ pipeline

const STAGE_HEIGHT = 46

function Pipeline({ spec }: { spec: Extract<DiagramSpec, { kind: 'pipeline' }> }) {
  const max = Math.max(...spec.stages.map((stage) => stage.rows), 1)
  const height = spec.stages.length * STAGE_HEIGHT

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      width="100%"
      className="block h-auto w-full text-ink"
      role="img"
      aria-label={spec.stages.map((stage) => `${stage.label}, ${stage.rows} rows`).join('. ')}
    >
      {spec.stages.map((stage, index) => {
        const y = index * STAGE_HEIGHT
        const previous = spec.stages[index - 1]
        const shrank = previous !== undefined && stage.rows < previous.rows
        const barWidth = Math.max(28, (WIDTH * stage.rows) / max)
        return (
          <g key={stage.label}>
            <rect x={0} y={y} width={WIDTH} height={24} className="fill-raised" />
            <rect
              x={0}
              y={y}
              width={barWidth}
              height={24}
              className={shrank ? 'fill-accent-soft' : 'fill-raised'}
            />
            <rect x={0} y={y} width={WIDTH} height={24} className="fill-none stroke-rule" strokeWidth={1} />
            <text x={7} y={y + 16} className="fill-current font-mono text-[11px]">
              {stage.label}
            </text>
            <text x={WIDTH - 7} y={y + 16} textAnchor="end" className="fill-current font-mono text-[11px] font-semibold">
              {stage.rows}
            </text>
            <text x={7} y={y + 37} className="fill-muted text-[10px]">
              {stage.note}
            </text>
            {/* The flow marker sits on the right, clear of the note text. */}
            {index < spec.stages.length - 1 ? (
              <path
                d={`M ${WIDTH - 14} ${y + 26} v 14 m -3 -4 l 3 4 l 3 -4`}
                className="fill-none stroke-rule-strong"
                strokeWidth={1}
              />
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}

// ---------------------------------------------------------------------- rows

const HEADER_HEIGHT = 22
const ROW_HEIGHT = 21

function Rows({ spec }: { spec: Extract<DiagramSpec, { kind: 'rows' }> }) {
  // The bracket label sits in a gutter on the right, sized to the label so a
  // longer one is not clipped by the viewBox.
  const label = spec.keepLabel ?? 'kept'
  const gutter = spec.keepFirst ? Math.min(140, label.length * 6 + 24) : 0
  const available = WIDTH - gutter - 8

  // Column widths follow the longest cell in each column, so a column of long
  // resource names is not squeezed to the same width as a two digit number.
  const widths = spec.columns.map((column, index) => {
    const longest = Math.max(column.length, ...spec.rows.map((row) => (row[index] ?? '').length))
    return longest + 2
  })
  const totalChars = widths.reduce((sum, value) => sum + value, 0)
  const fontSize = Math.max(9, Math.min(11, available / (totalChars * 0.62)))
  const unit = available / totalChars

  let cursor = 0
  const offsets = widths.map((width) => {
    const value = cursor
    cursor += width * unit
    return value
  })

  const height = HEADER_HEIGHT + spec.rows.length * ROW_HEIGHT + 2

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      width="100%"
      className="block h-auto w-full text-ink"
      role="img"
      aria-label={`Table with columns ${spec.columns.join(', ')} and ${spec.rows.length} rows shown`}
    >
      <g>
        {spec.columns.map((column, index) => (
          <text
            key={column}
            x={(offsets[index] ?? 0) + 2}
            y={14}
            className="fill-muted font-mono text-[10px] tracking-wider uppercase"
          >
            {column}
          </text>
        ))}
        <path d={`M 0 ${HEADER_HEIGHT - 4} H ${available}`} className="stroke-rule-strong" strokeWidth={1} />
      </g>

      {spec.rows.map((row, rowIndex) => {
        const y = HEADER_HEIGHT + rowIndex * ROW_HEIGHT
        const kept = spec.keepFirst !== undefined && rowIndex < spec.keepFirst
        return (
          <g key={row.join('|')}>
            {kept ? <rect x={-2} y={y - 2} width={available + 2} height={ROW_HEIGHT} className="fill-accent-soft" /> : null}
            {row.map((cell, cellIndex) => (
              <text
                key={cellIndex}
                x={(offsets[cellIndex] ?? 0) + 2}
                y={y + 12}
                className={`font-mono ${spec.highlightColumns?.includes(cellIndex) ? 'fill-current font-semibold' : 'fill-current'}`}
                fontSize={fontSize}
              >
                {cell}
              </text>
            ))}
            <path d={`M 0 ${y + ROW_HEIGHT - 2} H ${available}`} className="stroke-rule" strokeWidth={1} />
          </g>
        )
      })}

      {spec.keepFirst !== undefined ? (
        <g>
          <path
            d={`M ${available + 6} ${HEADER_HEIGHT - 1} h 5 v ${spec.keepFirst * ROW_HEIGHT - 4} h -5`}
            className="fill-none stroke-accent"
            strokeWidth={1.5}
          />
          <text
            x={available + 15}
            y={HEADER_HEIGHT + (spec.keepFirst * ROW_HEIGHT) / 2}
            className="fill-current text-[10px]"
          >
            {label}
          </text>
        </g>
      ) : null}
    </svg>
  )
}

// ------------------------------------------------------------------- buckets

const BUCKET_HEIGHT = 48

function Buckets({ spec }: { spec: Extract<DiagramSpec, { kind: 'buckets' }> }) {
  const max = Math.max(...spec.buckets.map((bucket) => bucket.count), 1)
  const height = spec.buckets.length * BUCKET_HEIGHT

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      width="100%"
      className="block h-auto w-full text-ink"
      role="img"
      aria-label={spec.buckets
        .map((bucket) => `${bucket.count} rows where ${bucket.label}, ${bucket.note}, ${bucket.kept ? 'kept' : 'dropped'}`)
        .join('. ')}
    >
      {spec.buckets.map((bucket, index) => {
        const y = index * BUCKET_HEIGHT
        const barWidth = Math.max(30, ((WIDTH - 66) * bucket.count) / max)
        return (
          <g key={bucket.label}>
            <text x={0} y={y + 12} className="fill-current font-mono text-[11px]">
              {bucket.label}
            </text>
            <rect
              x={0}
              y={y + 18}
              width={barWidth}
              height={16}
              className={bucket.kept ? 'fill-accent-soft stroke-accent' : 'fill-raised stroke-rule'}
              strokeWidth={1}
            />
            <text x={6} y={y + 30} className="fill-current font-mono text-[10px] font-semibold">
              {bucket.count} rows
            </text>
            <text x={barWidth + 8} y={y + 30} className="fill-muted text-[10px]">
              {bucket.kept ? 'kept' : 'dropped'}
            </text>
            <text x={0} y={y + 44} className="fill-muted text-[10px]">
              {bucket.note}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
