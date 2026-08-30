import initSqlJs from 'sql.js'
import type { Database, SqlJsStatic } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import { schemaStatements } from './schema.ts'
import { content } from '../content.ts'
import { seedStatements } from './seed.ts'
import type { SeedCounts } from './seed.ts'
import { todayISO } from '../date.ts'
import type { QueryOutcome } from './types.ts'

/**
 * SQLite compiled to WebAssembly, running in the page. Nothing leaves the
 * browser and nothing is fetched at query time, so the sandbox works offline
 * once the wasm file is in the service worker cache.
 */

export type { QueryOutcome, QueryResult } from './types.ts'

let sqlPromise: Promise<SqlJsStatic> | null = null
let database: Database | null = null
let seedCounts: SeedCounts | null = null

function loadSqlJs(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({ locateFile: () => wasmUrl })
  }
  return sqlPromise
}

function build(sql: SqlJsStatic): Database {
  const db = new sql.Database()
  for (const statement of schemaStatements(content.sqlSchema)) db.run(statement)
  const seed = seedStatements(todayISO())
  for (const statement of seed.statements) db.run(statement)
  seedCounts = seed.counts
  return db
}

export async function getDatabase(): Promise<Database> {
  if (database) return database
  const sql = await loadSqlJs()
  database = build(sql)
  return database
}

/** Throws the seeded database away and builds a fresh one. */
export async function resetDatabase(): Promise<Database> {
  const sql = await loadSqlJs()
  database?.close()
  database = build(sql)
  return database
}

export function getSeedCounts(): SeedCounts | null {
  return seedCounts
}

/**
 * Runs a statement and returns either result sets or the SQLite error message,
 * unchanged. Reading the real error text is part of learning the language, so
 * nothing here rewrites or prettifies it.
 */
export async function runQuery(sql: string): Promise<QueryOutcome> {
  const trimmed = sql.trim()
  if (trimmed.length === 0) return { ok: false, error: 'No query to run.' }

  const db = await getDatabase()
  const started = performance.now()
  try {
    const results = db.exec(trimmed)
    return {
      ok: true,
      results: results.map((result) => ({ columns: result.columns, rows: result.values })),
      elapsedMs: performance.now() - started,
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/** True when the statement can change the database, which means the seed needs rebuilding. */
export function isMutating(sql: string): boolean {
  return /^\s*(insert|update|delete|drop|alter|create|replace|truncate|pragma|vacuum|attach)\b/i.test(sql)
}
