/**
 * Generates the app icons into public/.
 *
 * Written by hand rather than with an image library so the repository stays
 * dependency light and the icons regenerate anywhere Node runs. The mark is a
 * severity distribution: four bars, tallest to shortest, in the same ramp the
 * app uses for critical, high, medium and low.
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC_DIR = resolve(ROOT, 'public')

const GROUND = [0x0a, 0x0d, 0x12]
const BARS = [
  { color: [0x35, 0xc2, 0x94], width: 1.0 },
  { color: [0x6b, 0xa5, 0xef], width: 0.78 },
  { color: [0xe0, 0x8a, 0x3a], width: 0.56 },
  { color: [0xe3, 0x5d, 0x68], width: 0.34 },
]

// ------------------------------------------------------------ PNG encoding

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buffer) {
  let crc = -1
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ -1) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([length, body, crc])
}

function encodePng(width, height, rgb) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type: truecolour
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  // Each scanline is prefixed with filter type 0.
  const stride = width * 3
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// --------------------------------------------------------------- the mark

function drawIcon(size, inset) {
  const pixels = Buffer.alloc(size * size * 3)
  for (let i = 0; i < size * size; i++) {
    pixels[i * 3] = GROUND[0]
    pixels[i * 3 + 1] = GROUND[1]
    pixels[i * 3 + 2] = GROUND[2]
  }

  const fill = (x0, y0, x1, y1, color) => {
    const left = Math.max(0, Math.round(x0))
    const right = Math.min(size, Math.round(x1))
    const top = Math.max(0, Math.round(y0))
    const bottom = Math.min(size, Math.round(y1))
    for (let y = top; y < bottom; y++) {
      for (let x = left; x < right; x++) {
        const offset = (y * size + x) * 3
        pixels[offset] = color[0]
        pixels[offset + 1] = color[1]
        pixels[offset + 2] = color[2]
      }
    }
  }

  const area = size * (1 - inset * 2)
  const originX = size * inset
  const barHeight = area * 0.17
  const gap = area * 0.093
  const block = BARS.length * barHeight + (BARS.length - 1) * gap
  let y = (size - block) / 2

  for (const bar of BARS) {
    fill(originX, y, originX + area * bar.width, y + barHeight, bar.color)
    y += barHeight + gap
  }

  return encodePng(size, size, pixels)
}

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0a0d12"/>
  <rect x="96" y="140" width="320" height="54" fill="#35c294"/>
  <rect x="96" y="223" width="250" height="54" fill="#6ba5ef"/>
  <rect x="96" y="306" width="179" height="54" fill="#e08a3a"/>
  <rect x="96" y="389" width="109" height="54" fill="#e35d68"/>
</svg>
`

mkdirSync(PUBLIC_DIR, { recursive: true })
writeFileSync(resolve(PUBLIC_DIR, 'icon-192.png'), drawIcon(192, 0.19))
writeFileSync(resolve(PUBLIC_DIR, 'icon-512.png'), drawIcon(512, 0.19))
// Maskable icons are cropped to a circle by some launchers, so the mark sits
// inside the safe zone with far more padding.
writeFileSync(resolve(PUBLIC_DIR, 'icon-maskable-512.png'), drawIcon(512, 0.29))
writeFileSync(resolve(PUBLIC_DIR, 'apple-touch-icon.png'), drawIcon(180, 0.19))
writeFileSync(resolve(PUBLIC_DIR, 'favicon.svg'), FAVICON_SVG)

console.log('  Wrote icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png, favicon.svg to public/')
