/**
 * Bridge module: loads the CJS src/ business logic into the Nuxt server context.
 *
 * The Nuxt dev server runs with process.cwd() = <repo>/app/
 * so '../src' resolves to the correct src/ directory.
 *
 * All src/ modules require Node.js built-ins and npm packages (axios, csv-parse, dotenv).
 * make sure app/.env contains LASSO_API_KEY and DIVISION_ID so that src/config.js can load.
 */
import { createRequire } from 'module'
import { resolve } from 'path'

const _require = createRequire(import.meta.url)

// In dev: __dirname / import.meta.url points to app/server/utils/
// process.cwd() == app/ → resolve to ../src
const srcRoot = resolve(process.cwd(), '../src')

let _parser: any
let _index: any

function getParser() {
  if (!_parser) _parser = _require(`${srcRoot}/csv/parser`)
  return _parser
}

function getIndex() {
  if (!_index) _index = _require(`${srcRoot}/index`)
  return _index
}

export function parseCSVContent(content: string): Array<{ show: Record<string, string>; calls: any[] }> {
  return getParser().parseCSVContent(content)
}

export async function resolveImportLookups(show: Record<string, string>): Promise<any> {
  return getIndex().resolveImportLookups(show)
}

export async function importShow(
  show: Record<string, string>,
  calls: any[],
  lookups: any,
  logFn: (action: string, entity: string, name: string) => void
): Promise<void> {
  return getIndex().importShow(show, calls, lookups, logFn)
}
