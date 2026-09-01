/**
 * Deterministic ordering for anything the learner picks from.
 *
 * Every list of options in this module was authored with the right answer
 * written first, because that is how a person writes a question. Rendering them
 * in that order teaches position rather than content, and shuffling them
 * randomly is worse: the options move under the learner's thumb on every
 * render, and a question looks different when they come back to it tomorrow.
 *
 * So the order is a pure function of a seed and the number of items. Same
 * exercise, same order, forever, and no relationship to how it was written.
 */

/**
 * FNV-1a with a final avalanche, rather than the usual multiply and add.
 *
 * The seeds here differ in their last character only, since they are the same
 * string with an index appended, and a plain multiply and add hash orders those
 * almost perfectly ascending: the shuffle then leaves the first option first,
 * which is exactly the bias it exists to remove. The verifier checks the
 * resulting distribution, so this is not a theoretical concern.
 */
function hash(value: string): number {
  let result = 2166136261 >>> 0
  for (let index = 0; index < value.length; index++) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 16777619) >>> 0
  }
  result ^= result >>> 16
  result = Math.imul(result, 2246822507) >>> 0
  result ^= result >>> 13
  result = Math.imul(result, 3266489909) >>> 0
  result ^= result >>> 16
  return result >>> 0
}

/**
 * The permutation depends on the seed and the position only, never on the
 * content, so two lists of the same length under the same seed are reordered
 * the same way. That is what keeps an option and its metadata together when the
 * caller shuffles indexes rather than objects.
 */
export function seededOrder<T>(items: T[], seed: string): T[] {
  return items
    .map((item, index) => ({ item, key: hash(`${seed}#${index}`), index }))
    .sort((a, b) => a.key - b.key || a.index - b.index)
    .map((entry) => entry.item)
}

/** The same ordering as a list of original indexes, for options with state. */
export function seededIndexes(length: number, seed: string): number[] {
  return seededOrder(
    Array.from({ length }, (_, index) => index),
    seed,
  )
}
