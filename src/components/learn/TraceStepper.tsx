import { useState } from 'react'
import type { Trace } from '../../types/lesson.ts'

/**
 * Predict, then Run, from PRIMM.
 *
 * There is no Python runtime in this app and there should not be one: a
 * megabyte of WebAssembly to print a list is not worth the download on a phone.
 * What matters pedagogically is not that the code runs, it is that the learner
 * can say what each line does to the state before it happens. So Run is a
 * stepped trace, authored line by line, and the learner walks it with a thumb.
 *
 * The prediction is answered first and cannot be changed afterwards. A learner
 * who reads the trace and then decides what they thought has learnt nothing:
 * the value comes from committing to an answer and being wrong.
 */
export function TraceStepper({
  trace,
  done,
  onDone,
}: {
  trace: Trace
  done: boolean
  onDone: () => void
}) {
  const [picked, setPicked] = useState<number | null>(null)
  const [frame, setFrame] = useState(-1)

  const answered = picked !== null
  const current = frame >= 0 ? trace.frames[frame] : undefined
  const atEnd = frame >= trace.frames.length - 1
  const output = trace.frames
    .slice(0, frame + 1)
    .map((entry) => entry.output)
    .filter((line): line is string => line !== undefined)

  const step = () => {
    const next = Math.min(trace.frames.length - 1, frame + 1)
    setFrame(next)
    if (next === trace.frames.length - 1) onDone()
  }

  return (
    <section className="mt-4">
      <p className="eyebrow">Predict, then run</p>

      <pre className="mt-2 overflow-x-auto border border-rule bg-raised p-3 font-mono text-code leading-relaxed">
        {trace.code.map((line, index) => {
          const active = current !== undefined && current.line === index + 1
          return (
            <span
              key={index}
              className={`block ${active ? 'bg-accent-soft text-ink' : ''}`}
              aria-current={active ? 'step' : undefined}
            >
              <span className="mr-3 select-none text-faint">{String(index + 1).padStart(2, ' ')}</span>
              {line === '' ? ' ' : line}
            </span>
          )
        })}
      </pre>

      <p className="mt-3 text-sm font-semibold">{trace.predict.question}</p>
      <ul className="mt-2 space-y-2">
        {trace.predict.options.map((option, index) => {
          const show = answered && (index === picked || option.correct)
          return (
            <li key={option.text}>
              <button
                type="button"
                disabled={answered}
                onClick={() => setPicked(index)}
                className={`w-full rounded-sm border p-3 text-left font-mono text-code leading-relaxed disabled:cursor-default ${
                  !show ? 'border-rule bg-sheet' : option.correct ? 'border-easy bg-sheet' : 'border-missed bg-sheet'
                }`}
              >
                {option.text}
                {show ? (
                  <span className={`mt-1 block font-sans text-xs font-semibold ${option.correct ? 'text-easy' : 'text-missed'}`}>
                    {option.correct ? 'this is what it prints' : 'not this'}
                  </span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>

      {answered ? (
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="eyebrow">Now walk it</p>
            <span className="data">
              {frame < 0 ? 'not started' : `line ${current?.line ?? 0}, step ${frame + 1} of ${trace.frames.length}`}
            </span>
          </div>

          <div className="mt-1.5 sheet p-3">
            {current ? (
              <>
                <table className="w-full font-mono text-[11px]">
                  <caption className="sr-only">Variables after line {current.line}</caption>
                  <tbody className="divide-y divide-rule">
                    {Object.entries(current.vars).length === 0 ? (
                      <tr>
                        <td className="py-1 text-faint">nothing bound yet</td>
                      </tr>
                    ) : (
                      Object.entries(current.vars).map(([name, value]) => (
                        <tr key={name}>
                          <th scope="row" className="w-1/3 py-1 text-left font-semibold">
                            {name}
                          </th>
                          <td className="py-1 break-all whitespace-pre-wrap text-muted">{value}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <p className="mt-2 border-t border-rule pt-2 text-sm leading-relaxed text-muted">{current.note}</p>
              </>
            ) : (
              <p className="text-sm text-muted">
                Tap step to run the first line. The table shows every variable that exists after that line has run.
              </p>
            )}

            {output.length > 0 ? (
              <div className="mt-2 border-t border-rule pt-2">
                <p className="eyebrow">Output</p>
                <pre className="mt-1 overflow-x-auto font-mono text-code whitespace-pre-wrap">{output.join('\n')}</pre>
              </div>
            ) : null}
          </div>

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setFrame(Math.max(-1, frame - 1))}
              disabled={frame < 0}
              className="min-h-12 flex-1 rounded-sm border border-rule text-sm text-muted disabled:opacity-40"
            >
              Back a line
            </button>
            <button
              type="button"
              onClick={step}
              disabled={atEnd}
              className="min-h-12 flex-[2] rounded-sm bg-accent text-sm font-semibold text-accent-ink disabled:opacity-40"
            >
              {frame < 0 ? 'Run the first line' : atEnd ? 'That is the last line' : 'Step'}
            </button>
          </div>

          {done || atEnd ? (
            <p className="mt-3 border-l-2 border-accent bg-sheet p-3 text-sm leading-relaxed">{trace.conclusion}</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-xs text-faint">
          Answer first. Being wrong here is the useful part: it is the moment your model of the code and the code stop
          agreeing, and that is what the trace is about to show you.
        </p>
      )}

      <p className="mt-3 text-xs leading-relaxed text-faint">{trace.caption}</p>
    </section>
  )
}
