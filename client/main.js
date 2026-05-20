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

  const described = images.filter(i => i.described)
  if (described.length === 0) { showIdle(); return }

  // find the last filename alphabetically that we haven't shown yet
  const unseen = described.filter(i => {
    if (!currentFilename) return true
    return i.filename > currentFilename
  })

  if (unseen.length > 0) {
    showImage(unseen[unseen.length - 1])
  } else if (!currentFilename) {
    // first load — show the latest described image
    showImage(described[described.length - 1])
  }
}

// ── Boot ─────────────────────────────────────────────────────────────────────

poll()
setInterval(poll, POLL_INTERVAL)
