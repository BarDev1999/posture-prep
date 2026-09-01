import type { Diagram as DiagramSpec } from '../../types/lesson.ts'

/**
 * Lesson diagrams, drawn as inline SVG rather than shipped as images: they have
 * to follow the theme, stay sharp, and work with the network off.
 *
 * Four shapes cover the SQL block. A pipeline for a query moving stage by stage
 * with the row count changing, a grid for a table, three buckets for three
 * valued logic, and a pair of tables joined on a key. Each one is sized in a 340
 * unit viewBox, which is roughly the content width of a 380px phone, so the type
 * inside is real size there and scales up rather than down.
 *
 * Three more arrived with the security sections, and those are laid out as HTML
 * rather than SVG. A flow, a trust stack and a two column comparison are all
 * sequences of sentences, and a sentence in an SVG does not wrap: it runs off
 * the side of a phone. Nothing about them is geometric, so nothing is lost.
 */

const WIDTH = 340

export function Diagram({ spec }: { spec: DiagramSpec }) {
  return (
    <figure className="mt-4">
      <div className="sheet overflow-hidden p-3">
        {spec.kind === 'pipeline' ? <Pipeline spec={spec} /> : null}
        {spec.kind === 'rows' ? <Rows spec={spec} /> : null}
        {spec.kind === 'buckets' ? <Buckets spec={spec} /> : null}
        {spec.kind === 'link' ? <Link spec={spec} /> : null}
        {spec.kind === 'flow' ? <Flow spec={spec} /> : null}
        {spec.kind === 'stack' ? <Stack spec={spec} /> : null}
        {spec.kind === 'compare' ? <Compare spec={spec} /> : null}
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
        // A join makes the count grow and a filter makes it fall. Both are the
        // thing worth looking at, so the highlight follows any change.
        const changed = previous !== undefined && stage.rows !== previous.rows
        const barWidth = Math.max(28, (WIDTH * stage.rows) / max)
        return (
          <g key={stage.label}>
            <rect x={0} y={y} width={WIDTH} height={24} className="fill-raised" />
            <rect
              x={0}
              y={y}
              width={barWidth}
              height={24}
              className={changed ? 'fill-accent-soft' : 'fill-raised'}
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

// ---------------------------------------------------------------------- link

const LINK_HEADER = 20
const LINK_ROW = 19

/**
 * Two tables side by side with a line drawn from every key value on the left to
 * the rows that carry it on the right. This is the picture of a foreign key:
 * one row over here, many rows over there, joined by a value they share.
 */
function Link({ spec }: { spec: Extract<DiagramSpec, { kind: 'link' }> }) {
  // Each column is as wide as its longest cell, and the two panels share what
  // is left after the gap. Sizing a panel by its widest single cell instead of
  // by the sum of its columns is what makes the columns collide.
  const widths = (table: { columns: string[]; rows: string[][] }) =>
    table.columns.map(
      (column, index) => Math.max(column.length, ...table.rows.map((row) => (row[index] ?? '').length)) + 1,
    )

  const leftWidths = widths(spec.left)
  const rightWidths = widths(spec.right)
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)
  const totalChars = sum(leftWidths) + sum(rightWidths)

  const gap = 30
  const available = WIDTH - gap
  const fontSize = Math.max(7.5, Math.min(9.5, available / (totalChars * 0.62)))
  const unit = fontSize * 0.62

  const leftWidth = sum(leftWidths) * unit
  const rightWidth = sum(rightWidths) * unit
  const rightX = WIDTH - rightWidth

  const offsets = (columnWidths: number[], origin: number) => {
    let cursor = origin
    return columnWidths.map((width) => {
      const value = cursor
      cursor += width * unit
      return value
    })
  }
  const leftX = offsets(leftWidths, 0)
  const rightColumnX = offsets(rightWidths, rightX)

  const rows = Math.max(spec.left.rows.length, spec.right.rows.length)
  const height = LINK_HEADER + rows * LINK_ROW + 6
  const rowY = (index: number) => LINK_HEADER + index * LINK_ROW + 12

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      width="100%"
      className="block h-auto w-full text-ink"
      role="img"
      aria-label={`${spec.left.title} on the left and ${spec.right.title} on the right, joined on ${spec.left.columns[spec.leftKey] ?? 'a key'}`}
    >
      <text x={0} y={8} className="fill-muted font-mono text-[8px] tracking-wider uppercase">
        {spec.left.title}
      </text>
      <text x={rightX} y={8} className="fill-muted font-mono text-[8px] tracking-wider uppercase">
        {spec.right.title}
      </text>

      {/* The links first, so the opaque row backgrounds cover their ends. */}
      {spec.left.rows.map((leftRow, leftIndex) =>
        spec.right.rows.map((rightRow, rightIndex) => {
          if (leftRow[spec.leftKey] !== rightRow[spec.rightKey]) return null
          const y1 = rowY(leftIndex) - 3
          const y2 = rowY(rightIndex) - 3
          const x1 = leftWidth
          const x2 = rightX
          const mid = (x1 + x2) / 2
          return (
            <path
              key={`${leftIndex}-${rightIndex}`}
              d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
              className="fill-none stroke-accent"
              strokeWidth={1}
            />
          )
        }),
      )}

      {[
        { table: spec.left, x: leftX, key: spec.leftKey, width: leftWidth, origin: 0 },
        { table: spec.right, x: rightColumnX, key: spec.rightKey, width: rightWidth, origin: rightX },
      ].map((panel, panelIndex) => (
        <g key={panelIndex}>
          {panel.table.columns.map((column, index) => (
            <text
              key={column}
              x={(panel.x[index] ?? 0) + 2}
              y={LINK_HEADER - 2}
              className="fill-faint font-mono tracking-wide uppercase"
              fontSize={fontSize * 0.82}
            >
              {column}
            </text>
          ))}
          {panel.table.rows.map((row, rowIndex) => (
            <g key={row.join('|')}>
              <rect
                x={panel.origin}
                y={rowY(rowIndex) - 11}
                width={panel.width}
                height={LINK_ROW - 3}
                className="fill-raised stroke-rule"
                strokeWidth={1}
              />
              {row.map((cell, cellIndex) => (
                <text
                  key={cellIndex}
                  x={(panel.x[cellIndex] ?? 0) + 3}
                  y={rowY(rowIndex)}
                  fontSize={fontSize}
                  className={`font-mono ${cellIndex === panel.key ? 'fill-accent font-semibold' : 'fill-current'}`}
                >
                  {cell}
                </text>
              ))}
            </g>
          ))}
        </g>
      ))}
    </svg>
  )
}

// ---------------------------------------------------------------------- flow

/**
 * A request crossing a system, top to bottom. The dangerous hop is marked once:
 * signalling stops working the moment two things on one screen are marked.
 */
function Flow({ spec }: { spec: Extract<DiagramSpec, { kind: 'flow' }> }) {
  return (
    <ol className="space-y-0">
      {spec.nodes.map((node, index) => (
        <li key={node.label}>
          <div
            className={`border p-2 ${
              node.danger ? 'border-critical bg-sheet' : 'border-rule bg-raised'
            }`}
          >
            <p className="font-mono text-[11px] font-semibold">{node.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{node.note}</p>
          </div>
          {index < spec.nodes.length - 1 ? (
            <div aria-hidden="true" className="flex justify-center py-1 text-xs text-rule-strong">
              &darr;
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  )
}

// --------------------------------------------------------------------- stack

const TRUST_LABEL: Record<'trusted' | 'untrusted' | 'mixed', string> = {
  trusted: 'you wrote this',
  untrusted: 'someone else wrote this',
  mixed: 'both, in one string',
}

/**
 * Layers of one thing, labelled by how far each is trusted. Built for the
 * context window: the whole point of that lesson is that the layers look
 * different on this diagram and identical to the model.
 */
function Stack({ spec }: { spec: Extract<DiagramSpec, { kind: 'stack' }> }) {
  return (
    <ol className="space-y-1">
      {spec.layers.map((layer) => (
        <li
          key={layer.label}
          className={`border-l-2 bg-raised p-2 ${
            layer.trust === 'untrusted'
              ? 'border-l-critical'
              : layer.trust === 'mixed'
                ? 'border-l-high'
                : 'border-l-accent'
          }`}
        >
          <p className="flex flex-wrap items-baseline justify-between gap-x-2">
            <span className="font-mono text-[11px] font-semibold">{layer.label}</span>
            <span className="data">{TRUST_LABEL[layer.trust]}</span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{layer.note}</p>
        </li>
      ))}
    </ol>
  )
}

// ------------------------------------------------------------------- compare

/** Two columns, for the pairs that keep being confused with each other. */
function Compare({ spec }: { spec: Extract<DiagramSpec, { kind: 'compare' }> }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[spec.left, spec.right].map((side) => (
        <div key={side.title} className="border border-rule bg-raised p-2">
          <p className="font-mono text-[11px] font-semibold">{side.title}</p>
          <ul className="mt-1.5 space-y-1.5">
            {side.points.map((point) => (
              <li key={point} className="text-xs leading-relaxed text-muted">
                {point}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
