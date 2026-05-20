'use strict'

const API = 'http://localhost:3000'
const POLL_INTERVAL = 10_000
const TYPEWRITER_MS = 15

const $ = id => document.getElementById(id)
const stripExt = f => f.replace(/\.[^.]+$/, '')

const statusEl      = $('status')
const countdownEl   = $('countdown')
const archiveEl     = $('archive-strip')
const mainImg       = $('main-img')
const idleScan      = $('idle-scan')
const imageLabel    = $('image-label')
const descFilename  = $('desc-filename')
const descTimestamp = $('desc-timestamp')
const descCountdown = $('desc-countdown')
const descContent   = $('desc-content')

let currentFilename = null
let typewriterTimer = null
let countdownTimer  = null
let secondsLeft     = POLL_INTERVAL / 1000

// ── Countdown ────────────────────────────────────────────────────────────────

function setCountdownText(s) {
  const t = s > 0 ? s + 's' : '...'
  countdownEl.textContent = t
  descCountdown.textContent = t
}

function startCountdown() {
  clearInterval(countdownTimer)
  secondsLeft = POLL_INTERVAL / 1000
  setCountdownText(secondsLeft)
  countdownTimer = setInterval(() => {
    secondsLeft--
    setCountdownText(secondsLeft)
    if (secondsLeft <= 0) clearInterval(countdownTimer)
  }, 1000)
}

function filenameToTimestamp(filename) {
  const m = filename.match(/(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})/)
  if (!m) return '--'
  const d = new Date(`${m[1]}T${m[2]}:${m[3]}:${m[4]}Z`)
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

// ── Typewriter ───────────────────────────────────────────────────────────────

function typewrite(text) {
  clearInterval(typewriterTimer)
  descContent.textContent = ''
  let i = 0
  typewriterTimer = setInterval(() => {
    if (i >= text.length) { clearInterval(typewriterTimer); return }
    descContent.textContent += text[i++]
  }, TYPEWRITER_MS)
}

// ── Archive strip ────────────────────────────────────────────────────────────

function setArchive(filenames) {
  const current = Array.from(archiveEl.children).map(el => el.alt)
  if (current.join('|') === filenames.join('|')) return
  archiveEl.innerHTML = ''
  // insert oldest-first so newest ends up leftmost
  for (let i = filenames.length - 1; i >= 0; i--) {
    const img = document.createElement('img')
    img.className = 'thumb'
    img.src = `${API}/images/files/${encodeURIComponent(filenames[i])}`
    img.alt = img.title = filenames[i]
    archiveEl.insertBefore(img, archiveEl.firstChild)
  }
}

// ── Show image ───────────────────────────────────────────────────────────────

function showImage(entry) {
  currentFilename = entry.filename
  idleScan.classList.remove('active')

  mainImg.classList.remove('visible')
  mainImg.src = `${API}/images/files/${encodeURIComponent(entry.filename)}`
  mainImg.onload = () => mainImg.classList.add('visible')

  imageLabel.textContent = stripExt(entry.filename)
  descFilename.textContent = stripExt(entry.filename)
  descTimestamp.textContent = filenameToTimestamp(entry.filename)
  typewrite(entry.description)
}

function showIdle() {
  statusEl.textContent = 'AWAITING SIGNAL'
  idleScan.classList.add('active')
  mainImg.classList.remove('visible')
  imageLabel.textContent = ''
  descFilename.textContent = '--'
  descContent.textContent = ''
}

// ── Poll ─────────────────────────────────────────────────────────────────────

async function poll() {
  statusEl.textContent = 'SCANNING'
  startCountdown()

  let images
  try {
    const res = await fetch(`${API}/images`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    images = await res.json()
    statusEl.textContent = 'ONLINE'
  } catch (err) {
    statusEl.textContent = 'NO SIGNAL'
    return
  }

  if (images.length === 0) { showIdle(); return }

  const [latest, ...older] = images

  setArchive(older.map(i => i.filename))

  if (latest.filename !== currentFilename) {
    showImage(latest)
  }
}

// ── Boot ─────────────────────────────────────────────────────────────────────

poll()
setInterval(poll, POLL_INTERVAL)
