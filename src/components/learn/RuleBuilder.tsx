import { useMemo, useState } from 'react'
import { ruleRowCorrect } from '../../lib/learn.ts'
import { seededOrder } from '../../lib/shuffle.ts'
import { RULE_PART_QUESTIONS, RULE_PART_TITLES } from '../../types/lesson.ts'
import type { RuleRow } from '../../types/lesson.ts'

/**
 * Step 7 for the security sections: the seven part rule template from file A,
 * section 3, filled in for a scenario the learner has not seen before.
 *
 * Every row is a choice rather than a box. A rule row is a sentence, and
 * grading a typed sentence either rejects a correct answer worded differently
 * or accepts anything with the right keyword in it. Neither teaches. Choosing
 * between four plausible rows is what the job actually feels like anyway: the
 * hard part of writing a detection rule is not phrasing, it is deciding which
 * condition is precise enough to fire on the real thing and nothing else.
 */
export function RuleBuilder({
  rows,
  done,
  onResult,
}: {
  rows: RuleRow[]
  done: boolean
  onResult: (passed: boolean) => void
}) {
  const [choices, setChoices] = useState<Record<string, string>>({})
  const [graded, setGraded] = useState(false)

  // Authored with the right answer first, shown in an order that owes nothing
  // to how it was written. Seeded per row, so it is the same tomorrow.
  const optionsByPart = useMemo(() => {
    const out: Record<string, string[]> = {}
    for (const row of rows) out[row.part] = seededOrder(row.options, `${rows.length}:${row.part}:${row.answer}`)
    return out
  }, [rows])

  const answeredAll = rows.every((row) => choices[row.part] !== undefined)
  const wrongRows = rows.filter((row) => !ruleRowCorrect(row, choices[row.part]))

  const check = () => {
    setGraded(true)
    onResult(wrongRows.length === 0)
  }

  return (
    <ol className="mt-3 space-y-2">
      {rows.map((row, index) => {
        const chosen = choices[row.part]
        const right = ruleRowCorrect(row, chosen)
        const showResult = (graded || done) && chosen !== undefined
        return (
          <li key={row.part} className="sheet p-3">
            <p className="data">
              {index + 1}. {RULE_PART_TITLES[row.part]}
            </p>
            <p className="mt-0.5 text-sm font-semibold">{RULE_PART_QUESTIONS[row.part]}</p>

            <ul className="mt-2 space-y-1.5">
              {(optionsByPart[row.part] ?? row.options).map((option) => {
                const picked = chosen === option
                const marked = showResult && (picked || option === row.answer)
                return (
                  <li key={option}>
                    <button
                      type="button"
                      disabled={done}
                      aria-pressed={picked}
                      onClick={() => {
                        // Functional form on purpose: two selections inside one
                        // batch would otherwise both spread the same stale
                        // object and the first would be lost.
                        setChoices((current) => ({ ...current, [row.part]: option }))
                        setGraded(false)
                      }}
                      className={`w-full rounded-sm border p-2.5 text-left text-sm leading-relaxed disabled:cursor-default ${
                        marked
                          ? option === row.answer
                            ? 'border-easy bg-sheet'
                            : 'border-missed bg-sheet'
                          : picked
                            ? 'border-accent bg-accent-soft'
                            : 'border-rule bg-raised'
                      }`}
                    >
                      {option}
                    </button>
                  </li>
                )
              })}
            </ul>

            {showResult && right ? (
              <p className="mt-2 border-l-2 border-accent pl-3 text-sm leading-relaxed text-muted">{row.why}</p>
            ) : null}
          </li>
        )
      })}

      {!done ? (
        <li>
          <button
            type="button"
            onClick={check}
            disabled={!answeredAll}
            className="mt-1 min-h-12 w-full rounded-sm bg-accent text-sm font-semibold text-accent-ink disabled:opacity-50"
          >
            {answeredAll ? 'Check the rule' : `Fill every row, ${rows.length - Object.keys(choices).length} left`}
          </button>
          {graded && wrongRows.length > 0 ? (
            <p className="mt-2 border-l-2 border-high bg-sheet p-3 text-sm leading-relaxed text-muted">
              {wrongRows.length === 1
                ? `One row is wrong: ${RULE_PART_TITLES[wrongRows[0]!.part].toLowerCase()}.`
                : `${wrongRows.length} rows are wrong, starting with ${RULE_PART_TITLES[wrongRows[0]!.part].toLowerCase()}.`}{' '}
              A rule that is right in six rows and wrong in one is a rule that fires on the wrong thing.
            </p>
          ) : null}
        </li>
      ) : null}
    </ol>
  )
}
