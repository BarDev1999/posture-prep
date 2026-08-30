import { addDays, isOnOrBefore } from './date.ts'
import type { FactProgress, Rating } from '../types/progress.ts'

/**
 * Leitner scheduling, five boxes.
 *
 * A card starts in box 1. "Got it" and "Easy" move it up one box, "Hard" leaves
 * it where it is, "Missed it" sends it back to box 1. A card is due when its
 * last review plus its box interval falls on or before today.
 *
 * Pure module on purpose: no storage, no React, so the scheduling rules can be
 * checked directly by scripts/verify-stage1.ts.
 */

export const MIN_BOX = 1
export const MAX_BOX = 5

/** Days to wait after a review, indexed by box 1 to 5. */
export const BOX_INTERVAL_DAYS = [1, 2, 4, 8, 16] as const

export function boxInterval(box: number): number {
  const clamped = clampBox(box)
  return BOX_INTERVAL_DAYS[clamped - 1] ?? 1
}

export function clampBox(box: number): number {
  if (!Number.isFinite(box)) return MIN_BOX
  return Math.min(MAX_BOX, Math.max(MIN_BOX, Math.round(box)))
}

export function newFactProgress(): FactProgress {
  return { box: MIN_BOX, lastReviewed: null, reviewCount: 0, lastRating: null }
}

export function nextBox(box: number, rating: Rating): number {
  const current = clampBox(box)
  switch (rating) {
    case 'missed':
      return MIN_BOX
    case 'hard':
      return current
    case 'got':
    case 'easy':
      return Math.min(MAX_BOX, current + 1)
  }
}

export function applyRating(progress: FactProgress, rating: Rating, today: string): FactProgress {
  return {
    box: nextBox(progress.box, rating),
    lastReviewed: today,
    reviewCount: progress.reviewCount + 1,
    lastRating: rating,
  }
}

/** The day this card comes back, or null when it has never been reviewed. */
export function dueDate(progress: FactProgress): string | null {
  if (!progress.lastReviewed) return null
  return addDays(progress.lastReviewed, boxInterval(progress.box))
}

export function isUnseen(progress: FactProgress): boolean {
  return progress.reviewCount === 0 || progress.lastReviewed === null
}

export function isDue(progress: FactProgress, today: string): boolean {
  const due = dueDate(progress)
  if (due === null) return false
  return isOnOrBefore(due, today)
}

/** Fraction of the way to box 5, used for the progress bars on the home screen. */
export function factMastery(progress: FactProgress): number {
  if (isUnseen(progress)) return 0
  return (clampBox(progress.box) - MIN_BOX) / (MAX_BOX - MIN_BOX)
}
