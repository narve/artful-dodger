'use strict'

const API = 'http://localhost:3000'
const POLL_INTERVAL = 10_000
const TYPEWRITER_MS = 15
const ARCHIVE_MAX = 5

const $ = id => document.getElementById(id)
const stripExt = f => f.replace(/\.[^.]+$/, '')

const statusEl    = $('status')
const countdownEl = $('countdown')
const archiveEl   = $('archive-strip')
const mainImg     = $('main-img')
const idleScan    = $('idle-scan')
const imageLabel  = $('image-label')
const descFilename = $('desc-filename')
const descContent = $('desc-content')

let currentFilename = null
let typewriterTimer = null
let countdownTimer  = null
let secondsLeft     = POLL_INTERVAL / 1000

// ── Countdown ────────────────────────────────────────────────────────────────

function startCountdown() {
  clearInterval(countdownTimer)
  secondsLeft = POLL_INTERVAL / 1000
  countdownEl.textContent = secondsLeft + 's'
  countdownTimer = setInterval(() => {
    secondsLeft--
    countdownEl.textContent = secondsLeft > 0 ? secondsLeft + 's' : '...'
    if (secondsLeft <= 0) clearInterval(countdownTimer)
  }, 1000)
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

function pushToArchive(filename) {
  const img = document.createElement('img')
  img.className = 'thumb entering'
  img.src = `${API}/images/files/${encodeURIComponent(filename)}`
  img.alt = filename
  img.title = filename

  // insert at the front (newest closest to main panel)
  archiveEl.insertBefore(img, archiveEl.firstChild)

  // trim to max
  while (archiveEl.children.length > ARCHIVE_MAX) {
    archiveEl.removeChild(archiveEl.lastChild)
  }
}

// ── Show image ───────────────────────────────────────────────────────────────

function showImage(entry) {
  if (currentFilename) pushToArchive(currentFilename)

  currentFilename = entry.filename
  idleScan.classList.remove('active')

  mainImg.classList.remove('visible')
  mainImg.src = `${API}/images/files/${encodeURIComponent(entry.filename)}`
  mainImg.onload = () => mainImg.classList.add('visible')

  imageLabel.textContent = stripExt(entry.filename)
  descFilename.textContent = stripExt(entry.filename)
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

  // server returns newest-first, already filtered to described
  if (images.length === 0) { showIdle(); return }

  const [latest, ...older] = images

  if (!currentFilename) {
    // seed archive oldest-first so newest ends up leftmost
    for (let i = older.length - 1; i >= 0; i--) pushToArchive(older[i].filename)
    showImage(latest)
  } else if (latest.filename !== currentFilename) {
    showImage(latest)
  }
}

// ── Boot ─────────────────────────────────────────────────────────────────────

poll()
setInterval(poll, POLL_INTERVAL)
