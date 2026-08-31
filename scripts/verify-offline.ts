/**
 * Audits the built output for the things that silently break a progressive web
 * app under a GitHub Pages subpath.
 *
 * This checks the shape of the build, not the runtime. Actually loading the app
 * with the network disabled has to be done in a real browser: run
 * `npm run build && npm run preview`, open the preview, then use the browser's
 * offline toggle and reload.
 *
 * Run with: npm run verify:offline (after a build)
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = resolve(ROOT, 'dist')
const BASE = process.env.VITE_BASE ?? '/posture-prep/'

let passed = 0
const failures: string[] = []

function check(name: string, condition: boolean, detail = ''): void {
  if (condition) {
    passed += 1
    console.log(`  ok   ${name}`)
  } else {
    failures.push(`${name}${detail ? ` -- ${detail}` : ''}`)
    console.log(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`)
  }
}

if (!existsSync(DIST)) {
  console.error('\n  No dist/ directory. Run npm run build first.\n')
  process.exit(1)
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

const files = walk(DIST).map((file) => relative(DIST, file).split('\\').join('/'))

console.log('\nBuild output')
check('index.html was produced', files.includes('index.html'))
check('a service worker was produced', files.includes('sw.js'))
check('the web app manifest was produced', files.includes('manifest.webmanifest'))

const sw = readFileSync(resolve(DIST, 'sw.js'), 'utf8')
const precached = new Set([...sw.matchAll(/\{url:"([^"]+)"/g)].map((match) => match[1] ?? ''))

console.log('\nPrecache coverage')
// Anything the app needs to boot with no network must be in the precache list.
const mustCache = files.filter((file) => /\.(js|css|html|wasm|png|svg|webmanifest)$/.test(file) && file !== 'sw.js')
const missing = mustCache.filter((file) => !precached.has(file) && !file.startsWith('workbox-'))
check(
  'every asset needed to boot is precached',
  missing.length === 0,
  missing.length > 0 ? missing.join(', ') : `${precached.size} entries`,
)
check('the WebAssembly build of SQLite is precached', [...precached].some((url) => url.endsWith('.wasm')))
check('the icons are precached', [...precached].some((url) => url.endsWith('icon-192.png')))
check(
  'precache entries are relative, so they resolve under any base',
  [...precached].every((url) => !url.startsWith('/')),
  [...precached].filter((url) => url.startsWith('/')).join(', '),
)

console.log('\nSubpath correctness')
const manifest = JSON.parse(readFileSync(resolve(DIST, 'manifest.webmanifest'), 'utf8')) as Record<string, unknown>
check('the manifest scope carries the base', manifest.scope === BASE, String(manifest.scope))
check('the manifest start_url carries the base', manifest.start_url === BASE, String(manifest.start_url))
check('the manifest id carries the base', manifest.id === BASE, String(manifest.id))
check('the navigation fallback carries the base', sw.includes(`${BASE}index.html`))
check('the manifest declares a maskable icon', JSON.stringify(manifest.icons).includes('maskable'))
check('the manifest asks for standalone display', manifest.display === 'standalone')

const html = readFileSync(resolve(DIST, 'index.html'), 'utf8')
const hrefs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1] ?? '')
const offBase = hrefs.filter((href) => href.startsWith('/') && !href.startsWith(BASE))
check('every asset in index.html sits under the base', offBase.length === 0, offBase.join(', '))
check('the apple touch icon is declared, for the iOS home screen', html.includes('apple-touch-icon'))
check('the theme colour is declared for both schemes', (html.match(/name="theme-color"/g) ?? []).length >= 2)

console.log('\nNo runtime network dependency')
const bundles = files.filter((file) => file.endsWith('.js') && file.startsWith('assets/'))
const code = bundles.map((file) => readFileSync(resolve(DIST, file), 'utf8')).join('\n')
/**
 * Absolute URLs on their own mean nothing here: the study content is full of
 * them, from the metadata service address to the source links in file A. What
 * would actually break offline is a network call to another origin, so this
 * looks for the call sites rather than for the strings.
 */
const networkCalls = [
  /fetch\(\s*["'`]https?:/i,
  /\.open\(\s*["'][A-Z]+["']\s*,\s*["'`]https?:/,
  /new\s+WebSocket\(\s*["'`]wss?:/i,
  /new\s+EventSource\(\s*["'`]https?:/i,
  /importScripts\(\s*["'`]https?:/i,
  /\.src\s*=\s*["'`]https?:/i,
]
const found = networkCalls.filter((pattern) => pattern.test(code)).map((pattern) => pattern.source)
check('the bundle calls no other origin at runtime', found.length === 0, found.join(' | '))
check(
  'the study content keeps its own URLs as text, not as requests',
  code.includes('169.254.169.254'),
  'the metadata service address is content, and must survive verbatim',
)
check(
  'the study content is compiled into the bundle rather than fetched',
  code.includes('contentVersion') && !files.includes('assets/content.json'),
)

console.log(`\n  ${passed} checks passed, ${failures.length} failed`)
console.log('  Note: this audits the build, not the runtime. Loading the app with the')
console.log('  network disabled still has to be confirmed once in a real browser.\n')

if (failures.length > 0) {
  for (const failure of failures) console.error(`  FAILED: ${failure}`)
  process.exit(1)
}
