import type { SqlValue } from 'sql.js'

/**
 * Query shapes, kept apart from db.ts so that grading can be checked outside a
 * browser: db.ts imports the WebAssembly binary by URL, which only a bundler
 * can resolve.
 */

export type QueryResult = {
  columns: string[]
  rows: SqlValue[][]
}

export type QueryOutcome =
  | { ok: true; results: QueryResult[]; elapsedMs: number }
  | { ok: false; error: string }
