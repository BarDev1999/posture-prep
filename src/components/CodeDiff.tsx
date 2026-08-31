import { diffLines } from '../lib/diff.ts'

/**
 * The buggy code from the question against the model code from the answer,
 * line by line. Colour is paired with a leading marker so the diff still reads
 * without it.
 */
export function CodeDiff({ before, after }: { before: string; after: string }) {
  const lines = diffLines(before, after)

  return (
    <div className="table-scroll bg-raised">
      <pre className="min-w-full p-2 font-mono text-xs leading-relaxed">
        {lines.map((line, index) => {
          const marker = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '
          const tone =
            line.type === 'added'
              ? 'text-easy'
              : line.type === 'removed'
                ? 'text-critical line-through decoration-critical/40'
                : 'text-muted'
          return (
            <div key={index} className={tone}>
              <span className="mr-2 inline-block w-3 select-none">{marker}</span>
              {line.text === '' ? ' ' : line.text}
            </div>
          )
        })}
      </pre>
    </div>
  )
}
