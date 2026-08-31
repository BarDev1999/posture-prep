import { useMemo, useState } from 'react'
import { firstWrongPosition, parsonsSatisfied, visibleBlocks } from '../../lib/learn.ts'
import type { ParsonsBlock, ParsonsExercise } from '../../types/lesson.ts'
import type { Level } from '../../types/progress.ts'

/**
 * Step 6, the bridge between recognising a solution and producing one.
 *
 * Stage A ships the tap to select then tap to place interaction only, because
 * that is the one that actually works one handed on a phone: pick a block, then
 * pick the gap it goes in. Drag and drop, and indentation for Python, arrive
 * with the full widget in stage B. Every target here is at least 44px.
 *
 * Distractors are hidden at level 1. Plausible wrong lines make a true beginner
 * slower without making them better, and they only start paying at level 2.
 */

type Props = {
  exercise: ParsonsExercise
  level: Level
  /** Comment marker for the subgoal labels. SQL uses two dashes. */
  comment?: string
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

export function ParsonsWidget({ exercise, level, comment = '--', solved, onSolved }: Props) {
  const pool = useMemo(() => jumble(visibleBlocks(exercise, level), exercise.task), [exercise, level])
  const [placed, setPlaced] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [checked, setChecked] = useState<number | null>(null)

  const byId = new Map(pool.map((block) => [block.id, block]))
  const remaining = pool.filter((block) => !placed.includes(block.id))

  const place = (index: number) => {
    if (!selected) return
    const next = [...placed]
    next.splice(index, 0, selected)
    setPlaced(next)
    setSelected(null)
    setChecked(null)
  }

  const remove = (blockId: string) => {
    setPlaced(placed.filter((id) => id !== blockId))
    setChecked(null)
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= placed.length) return
    const next = [...placed]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved as string)
    setPlaced(next)
    setChecked(null)
  }

  const check = () => {
    if (parsonsSatisfied(exercise, placed)) {
      setChecked(null)
      onSolved()
      return
    }
    setChecked(firstWrongPosition(exercise, placed) ?? 0)
  }

  return (
    <div className="mt-4">
      <p className="text-sm leading-relaxed">{exercise.task}</p>

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
            const wrong = checked !== null && checked === index
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
                    aria-label={`Remove block: ${block.label}`}
                  >
                    <span className="block font-mono text-[11px] text-faint">
                      {comment} {block.label}
                    </span>
                    <span className="block font-mono text-code whitespace-pre-wrap">{block.code}</span>
                  </button>
                  {!solved ? (
                    <span className="flex shrink-0 flex-col justify-center border-l border-rule">
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
          Check the order
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
