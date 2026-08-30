/**
 * A few model answers in file C are written in PostgreSQL, which the sandbox
 * cannot run: SQLite has no `INTERVAL` literal. Rather than edit the source
 * files or drop those exercises, the reference query is rewritten here for the
 * sandbox only, and the app shows both versions with the difference named.
 *
 * This is a dialect translation, not a different answer. Every adaptation is
 * listed with the reason, and the model answer the user reads is still the one
 * from file C.
 */

export type Adaptation = {
  sql: string
  adapted: boolean
  /** Shown next to the model answer when the sandbox had to rewrite it. */
  note: string | null
}

type Rewrite = { sql: string; note: string }

const REWRITES: Record<string, Rewrite> = {
  'Q1.6': {
    sql: `SELECT identity_id, name, last_used_at
FROM identities
WHERE last_used_at IS NULL
   OR last_used_at < date('now', '-90 days');`,
    note: "File C writes the cutoff as `CURRENT_DATE - INTERVAL '90 days'`, which is PostgreSQL. SQLite spells the same thing `date('now', '-90 days')`. The logic, including the `IS NULL` half, is unchanged.",
  },
}

export function sqliteReference(questionId: string, referenceSql: string): Adaptation {
  const rewrite = REWRITES[questionId]
  if (rewrite) return { sql: rewrite.sql, adapted: true, note: rewrite.note }
  return { sql: referenceSql, adapted: false, note: null }
}

export function adaptationNote(questionId: string): string | null {
  return REWRITES[questionId]?.note ?? null
}
