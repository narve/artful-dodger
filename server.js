'use strict'

const express = require('express')
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const PORT = process.env.PORT || 3000
const SRC = process.env.SRC
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const LLM_MODEL = process.env.LLM_MODEL || 'moondream'
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '5000', 10)

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif'])

if (!SRC) {
  console.error('Error: SRC environment variable is required')
  process.exit(1)
}

if (!fs.existsSync(SRC)) {
  console.error(`Error: SRC directory does not exist: ${SRC}`)
  process.exit(1)
}

const isImage = f => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase())
const descPath = f => path.join(SRC, `${f}.description`)

function readDescription(filename) {
  try {
    const text = fs.readFileSync(descPath(filename), 'utf8').trim()
    return text || null
  } catch { return null }
}

function listImages() {
  return fs.readdirSync(SRC)
    .filter(isImage)
    .map(filename => {
      const description = readDescription(filename)
      const mtime = fs.statSync(path.join(SRC, filename)).mtimeMs
      return { filename, described: description !== null, description, mtime }
    })
}

// ── Express ───────────────────────────────────────────────────────────────────

const app = express()

app.use((_, res, next) => { res.setHeader('Access-Control-Allow-Origin', '*'); next() })
app.use(express.static(path.resolve(__dirname, 'client')))
app.use('/images/files', express.static(SRC))

app.get('/images', (_, res) => {
  const images = listImages()
    .filter(i => i.described)
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, 5)
    .map(({ filename, description }) => ({ filename, description }))
  res.json(images)
})


app.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}`)
  console.log(`[server] SRC: ${SRC}`)
  console.log(`[server] LLM: ${LLM_MODEL} @ ${OLLAMA_URL}`)
})

// ── Background worker ─────────────────────────────────────────────────────────

async function callOllama(filename) {
  const b64 = fs.readFileSync(path.join(SRC, filename)).toString('base64')
  console.log(`[llm] → calling ${LLM_MODEL} for ${filename}`)
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: LLM_MODEL,
      prompt: "Describe this image.",
      images: [b64],
      stream: false
    })
  })
  console.log(`[llm] HTTP status: ${res.status}`)
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`)
  const raw = await res.text()
  console.log(`[llm] raw response: ${raw}`)
  const json = JSON.parse(raw)
  console.log(`[llm] response field: ${JSON.stringify(json.response)}`)
  const response = json.response
  console.log(`[llm] ← ${filename}:\n---\n${response}\n---`)
  return response
}

let workerBusy = false

async function runWorker() {
  if (workerBusy) return
  workerBusy = true
  try {
    const all = listImages()
    const described = all.filter(i => i.described)
    const pending = all.filter(i => !i.described).sort((a, b) => b.mtime - a.mtime)
    console.log(`[worker] scan: ${all.length} image(s) — ${described.length} described, ${pending.length} pending`)
    pending.forEach(i => console.log(`[worker]   pending: ${i.filename}`))
    for (const img of pending) {
      try {
        const description = await callOllama(img.filename)
        if (!description || !description.trim()) {
          console.warn(`[worker] empty response for ${img.filename}, skipping save`)
        } else {
          fs.writeFileSync(descPath(img.filename), description.trim(), 'utf8')
          console.log(`[worker] saved description for ${img.filename}`)
        }
      } catch (err) {
        console.error(`[worker] error on ${img.filename}: ${err.message}`)
      }
    }
  } finally {
    workerBusy = false
  }
}

runWorker()
setInterval(runWorker, POLL_INTERVAL_MS)

// ── Webcam ────────────────────────────────────────────────────────────────────

if (process.env.WEBCAM_ENABLE === '1') {
  const webcam = spawn(process.execPath, [path.join(__dirname, 'webcam.js')], {
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe']
  })
  webcam.stdout.on('data', d => process.stdout.write(d))
  webcam.stderr.on('data', d => process.stderr.write(d))
  webcam.on('exit', code => console.log(`[webcam] process exited (code ${code})`))
}
