import { useMemo, useState } from 'react'
import {
  firstWrongIndent,
  firstWrongPosition,
  indentMatters,
  parsonsSatisfied,
  visibleBlocks,
} from '../../lib/learn.ts'
import { COMMENT_MARKER } from '../../types/lesson.ts'
import type { ParsonsBlock, ParsonsExercise } from '../../types/lesson.ts'
import type { Level } from '../../types/progress.ts'

/**
 * Step 6, the bridge between recognising a solution and producing one.
 *
 * Tap to select then tap to place, and no drag and drop. Dragging on a phone
 * fights the page scroll, needs a steady thumb, and this has to work standing
 * up at the gym. Every target here is at least 44px.
 *
 * Python blocks carry an indentation level and are graded on it. Indentation is
 * not decoration in Python: a line inside the loop and the same line after it
 * are two different programs, and a Parsons problem that ignored that would be
 * teaching the wrong lesson.
 *
 * Distractors are hidden at level 1. Plausible wrong lines make a true beginner
 * slower without making them better, and they only start paying at level 2.
 */

type Props = {
  exercise: ParsonsExercise
  level: Level
  solved: boolean
  onSolved: () => void
}

function hash(value: string): number {
  let result = 0
  for (let index = 0; index < value.length; index++) {
    result = (result * 31 + value.charCodeAt(index)) | 0
  }
  return Math.abs(result)
}

/**
 * A fixed jumble rather than a random one: the blocks must not rearrange
 * themselves under the learner's thumb on every render, and the puzzle should
 * look the same if they come back to it tomorrow.
 */
function jumble(blocks: ParsonsBlock[], seed: string): ParsonsBlock[] {
  return [...blocks].sort((a, b) => hash(seed + a.id) - hash(seed + b.id))
}

const MAX_INDENT = 3

export function ParsonsWidget({ exercise, level, solved, onSolved }: Props) {
  const pool = useMemo(() => jumble(visibleBlocks(exercise, level), exercise.task), [exercise, level])
  const [placed, setPlaced] = useState<string[]>([])
  const [indents, setIndents] = useState<Record<string, number>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [checked, setChecked] = useState<number | null>(null)
  const [indentWrong, setIndentWrong] = useState<number | null>(null)

  const comment = COMMENT_MARKER[exercise.language ?? 'sql']
  const indented = indentMatters(exercise)
  const byId = new Map(pool.map((block) => [block.id, block]))
  const remaining = pool.filter((block) => !placed.includes(block.id))

  const clearMarks = () => {
    setChecked(null)
    setIndentWrong(null)
  }

  const place = (index: number) => {
    if (!selected) return
    const next = [...placed]
    next.splice(index, 0, selected)
    setPlaced(next)
    // A new block starts at the indentation of the one above it, which is right
    // far more often than zero is and saves a tap on every body line.
    const above = next[index - 1]
    setIndents({ ...indents, [selected]: above ? (indents[above] ?? 0) : 0 })
    setSelected(null)
    clearMarks()
  }

  const remove = (blockId: string) => {
    setPlaced(placed.filter((id) => id !== blockId))
    clearMarks()
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= placed.length) return
    const next = [...placed]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved as string)
    setPlaced(next)
    clearMarks()
  }

  const shift = (blockId: string, by: number) => {
    const current = indents[blockId] ?? 0
    setIndents({ ...indents, [blockId]: Math.max(0, Math.min(MAX_INDENT, current + by)) })
    clearMarks()
  }

  const check = () => {
    if (parsonsSatisfied(exercise, placed, indents)) {
      clearMarks()
      onSolved()
      return
    }
    const order = firstWrongPosition(exercise, placed)
    if (order !== null) {
      setChecked(order)
      setIndentWrong(null)
      return
    }
    setChecked(null)
    setIndentWrong(firstWrongIndent(exercise, placed, indents))
  }

  return (
    <div className="mt-4">
      <p className="text-sm leading-relaxed">{exercise.task}</p>
      {indented ? (
        <p className="mt-2 text-xs leading-relaxed text-faint">
          Indentation counts. Use the arrows on the right of a placed block to move it in or out one level.
        </p>
      ) : null}

      <p className="eyebrow mt-4">Your answer</p>
      <div className="mt-1.5 sheet p-2">
        {placed.length === 0 ? (
          <p className="px-1 py-2 text-xs text-faint">
            {selected ? 'Now tap the gap where it goes.' : 'Pick a block below, then tap where it goes.'}
          </p>
        ) : null}

        <ol className="space-y-1">
          <Gap index={0} active={selected !== null} onPlace={place} />
          {placed.map((blockId, index) => {
            const block = byId.get(blockId)
            if (!block) return null
            const wrong = (checked !== null && checked === index) || (indentWrong !== null && indentWrong === index)
            const depth = indents[blockId] ?? 0
            return (
              <li key={blockId}>
                <div
                  className={`flex items-stretch gap-1 rounded-sm border ${
                    wrong ? 'border-high bg-sheet' : 'border-rule bg-raised'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => remove(blockId)}
                    disabled={solved}
                    className="min-h-11 flex-1 px-2 py-1.5 text-left disabled:cursor-default"
                    style={{ paddingLeft: `${0.5 + depth * 1.25}rem` }}
                    aria-label={`Remove block: ${block.label}`}
                  >
                    <span className="block font-mono text-[11px] text-faint">
                      {comment} {block.label}
                    </span>
                    <span className="block font-mono text-code whitespace-pre-wrap">{block.code}</span>
                  </button>
                  {!solved ? (
                    <span className="flex shrink-0 border-l border-rule">
                      {indented ? (
                        <span className="flex flex-col justify-center border-r border-rule">
                          <button
                            type="button"
                            onClick={() => shift(blockId, -1)}
                            disabled={depth === 0}
                            className="flex h-1/2 min-h-[22px] w-11 items-center justify-center text-muted disabled:opacity-30"
                            aria-label={`Move ${block.label} out one level`}
                          >
                            &larr;
                          </button>
                          <button
                            type="button"
                            onClick={() => shift(blockId, 1)}
                            disabled={depth >= MAX_INDENT}
                            className="flex h-1/2 min-h-[22px] w-11 items-center justify-center border-t border-rule text-muted disabled:opacity-30"
                            aria-label={`Move ${block.label} in one level`}
                          >
                            &rarr;
                          </button>
                        </span>
                      ) : null}
                      <span className="flex flex-col justify-center">
                        <button
                          type="button"
                          onClick={() => move(index, index - 1)}
                          disabled={index === 0}
                          className="flex h-1/2 min-h-[22px] w-11 items-center justify-center text-muted disabled:opacity-30"
                          aria-label={`Move ${block.label} up`}
                        >
                          &uarr;
                        </button>
                        <button
                          type="button"
                          onClick={() => move(index, index + 1)}
                          disabled={index === placed.length - 1}
                          className="flex h-1/2 min-h-[22px] w-11 items-center justify-center border-t border-rule text-muted disabled:opacity-30"
                          aria-label={`Move ${block.label} down`}
                        >
                          &darr;
                        </button>
                      </span>
                    </span>
                  ) : null}
                </div>
                <Gap index={index + 1} active={selected !== null} onPlace={place} />
              </li>
            )
          })}
        </ol>
      </div>

      {checked !== null ? (
        <p className="mt-2 border-l-2 border-high bg-sheet p-3 text-sm text-muted">
          {placed.length !== exercise.solution.length
            ? `That is ${placed.length} block${placed.length === 1 ? '' : 's'} and the answer needs ${exercise.solution.length}.`
            : `The first ${checked} block${checked === 1 ? '' : 's'} ${checked === 1 ? 'is' : 'are'} in the right place. Look at the one after that.`}
        </p>
      ) : null}

      {indentWrong !== null ? (
        <p className="mt-2 border-l-2 border-high bg-sheet p-3 text-sm text-muted">
          The order is right. The indentation is not: look at block {indentWrong + 1} and ask whether it runs once, or
          once per item.
        </p>
      ) : null}

      {remaining.length > 0 && !solved ? (
        <>
          <p className="eyebrow mt-4">Blocks</p>
          <ul className="mt-1.5 space-y-1">
            {remaining.map((block) => {
              const active = selected === block.id
              return (
                <li key={block.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(active ? null : block.id)}
                    aria-pressed={active}
                    className={`min-h-12 w-full rounded-sm border px-2 py-1.5 text-left ${
                      active ? 'border-accent bg-accent-soft' : 'border-rule bg-sheet'
                    }`}
                  >
                    <span className="block font-mono text-[11px] text-faint">
                      {comment} {block.label}
                    </span>
                    <span className="block font-mono text-code whitespace-pre-wrap">{block.code}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      ) : null}

      {solved ? (
        <p className="mt-4 border-l-2 border-accent bg-sheet p-3 text-sm leading-relaxed">{exercise.closing}</p>
      ) : (
        <button
          type="button"
          onClick={check}
          disabled={placed.length === 0}
          className="mt-4 min-h-12 w-full rounded-sm bg-accent text-sm font-semibold text-accent-ink disabled:opacity-50"
        >
          {indented ? 'Check the order and the indentation' : 'Check the order'}
        </button>
      )}
    </div>
  )
}

/** A gap between two placed blocks. Only a target while a block is selected. */
function Gap({ index, active, onPlace }: { index: number; active: boolean; onPlace: (index: number) => void }) {
  if (!active) return null
  return (
    <button
      type="button"
      onClick={() => onPlace(index)}
      className="my-1 flex min-h-11 w-full items-center justify-center rounded-sm border border-dashed border-accent text-xs text-accent"
    >
      Place here
    </button>
  )
}
