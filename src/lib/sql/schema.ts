/**
 * The schema block in file B is written as documentation, not as runnable DDL:
 * it lists `cloud_accounts(...)` with no CREATE TABLE in front and no statement
 * terminators. This turns it into statements SQLite accepts, leaving the column
 * definitions, the types and the comments exactly as the source wrote them, so
 * what the user reads on screen is what the database actually has.
 *
 * Pure on purpose: no content import, so it can be exercised outside a browser.
 */
export function schemaStatements(schema: string): string[] {
  const lines = schema.split('\n')
  const statements: string[] = []
  let current: string[] | null = null

  for (const line of lines) {
    if (current === null) {
      if (/^\w+\s*\($/.test(line.trimEnd())) current = [`CREATE TABLE ${line.trimEnd()}`]
      continue
    }
    if (/^\)\s*$/.test(line)) {
      current.push(');')
      statements.push(current.join('\n'))
      current = null
      continue
    }
    current.push(line)
  }

  return statements
}
