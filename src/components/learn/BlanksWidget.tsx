import { useState } from 'react'
import { pythonBlankAccepted, templateSegments } from '../../lib/learn.ts'
import type { ProduceExercise } from '../../types/lesson.ts'

type PythonProduce = Extract<ProduceExercise, { kind: 'python' }>

/**
 * Step 7 for the Python lessons: the program with its load bearing expressions
 * removed, and a box for each one.
 *
 * The brief calls for a Parsons problem plus fill in the blanks here, because
 * there is no Python runtime to grade real free production against. The blanks
 * are never punctuation or a variable name; each one is the decision the lesson
 * was about, which is why the hint can describe what the expression must do
 * without giving away how to write it.
 *
 * The blanks are listed under the code rather than typed inline. An input the
 * width of a word, inside a scrolling code block, is unusable with a thumb.
 */
export function BlanksWidget({
  exercise,
  done,
  onResult,
}: {
  exercise: PythonProduce
  done: boolean
  onResult: (passed: boolean) => void
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [wrong, setWrong] = useState<number[] | null>(null)

  const segments = templateSegments(exercise.template)

  const check = () => {
    const failed = exercise.blanks
      .map((_, index) => index)
      .filter((index) => !pythonBlankAccepted(exercise, index, answers[index] ?? ''))
    setWrong(failed)
    onResult(failed.length === 0)
  }

  return (
    <div className="mt-3">
      <pre className="overflow-x-auto border border-rule bg-raised p-3 font-mono text-code leading-relaxed">
        {segments.map((segment, index) =>
          segment.blank === null ? (
            <span key={index}>{segment.text}</span>
          ) : (
            <span
              key={index}
              className={`inline-block rounded-sm px-1 ${
                done || (wrong !== null && !wrong.includes(segment.blank - 1))
                  ? 'bg-accent-soft'
                  : 'bg-sheet text-faint'
              }`}
            >
              {done || (wrong !== null && !wrong.includes(segment.blank - 1))
                ? (answers[segment.blank - 1] ?? exercise.blanks[segment.blank - 1]?.answer ?? '')
                : `blank ${segment.blank}`}
            </span>
          ),
        )}
      </pre>

      <ol className="mt-3 space-y-2">
        {exercise.blanks.map((blank, index) => {
          const failed = wrong !== null && wrong.includes(index)
          const passed = wrong !== null && !wrong.includes(index)
          return (
            <li key={index} className="sheet p-3">
              <label className="block">
                <span className="data">blank {index + 1}</span>
                <span className="mt-0.5 block text-sm leading-relaxed">{blank.hint}</span>
                <input
                  type="text"
                  value={answers[index] ?? ''}
                  disabled={done}
                  onChange={(event) => setAnswers((current) => ({ ...current, [index]: event.target.value }))}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  autoComplete="off"
                  className={`mt-2 min-h-11 w-full rounded-sm border bg-raised px-2 font-mono text-code ${
                    failed ? 'border-high' : passed ? 'border-accent' : 'border-rule'
                  }`}
                />
              </label>
              {failed ? <p className="mt-1 text-xs text-muted">Not that. Read the line it sits on again.</p> : null}
            </li>
          )
        })}
      </ol>

      {!done ? (
        <button
          type="button"
          onClick={check}
          disabled={exercise.blanks.some((_, index) => (answers[index] ?? '').trim().length === 0)}
          className="mt-3 min-h-12 w-full rounded-sm bg-accent text-sm font-semibold text-accent-ink disabled:opacity-50"
        >
          Check it
        </button>
      ) : null}
    </div>
  )
}
