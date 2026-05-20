'use strict'

const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const INTERVAL_MS = parseInt(process.env.WEBCAM_INTERVAL_MS || '5000', 10)
const OUT_DIR     = process.env.SRC || path.resolve(__dirname, 'images')
const DEVICE      = process.env.WEBCAM_DEVICE || null

function findFirstCamera() {
  try {
    return fs.readdirSync('/dev')
      .filter(f => /^video\d+$/.test(f))
      .sort()
      .map(f => `/dev/${f}`)[0] || null
  } catch { return null }
}

const device = DEVICE || findFirstCamera()

if (!device) {
  console.error('[webcam] no camera found — set WEBCAM_DEVICE or plug one in')
  process.exit(1)
}

if (!fs.existsSync(OUT_DIR)) {
  console.error(`[webcam] output directory does not exist: ${OUT_DIR}`)
  process.exit(1)
}

console.log(`[webcam] device:   ${device}`)
console.log(`[webcam] output:   ${OUT_DIR}`)
console.log(`[webcam] interval: ${INTERVAL_MS / 1000}s`)

function capture() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
  const filename = `webcam_${ts}.jpg`
  const outPath  = path.join(OUT_DIR, filename)
  try {
    execFileSync('ffmpeg', [
      '-f', 'v4l2', '-i', device,
      '-vframes', '1',
      '-loglevel', 'quiet',
      '-y', outPath
    ], { stdio: 'pipe' })
    console.log(`[webcam] captured ${filename}`)
  } catch (err) {
    const msg = err.stderr ? err.stderr.toString().trim() : err.message
    console.error(`[webcam] capture error: ${msg}`)
  }
}

capture()
setInterval(capture, INTERVAL_MS)
