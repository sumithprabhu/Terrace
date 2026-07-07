const lobbyScreen = document.getElementById('lobby-screen')
const roomScreen = document.getElementById('room-screen')

const lobbyError = document.getElementById('lobby-error')
const myPeerIdEl = document.getElementById('my-peer-id')
const fixtureGroupsEl = document.getElementById('fixture-groups')

let myPeerId = null
let previousChatCount = 0
let lastState = null
let hasCelebrated = false

// ---------- "How it works" modal ----------

const howItWorksModal = document.getElementById('how-it-works-modal')

document.getElementById('how-it-works-btn').addEventListener('click', () => {
  howItWorksModal.classList.remove('hidden')
})

document.getElementById('how-it-works-close').addEventListener('click', () => {
  howItWorksModal.classList.add('hidden')
})

howItWorksModal.addEventListener('click', (e) => {
  if (e.target === howItWorksModal) howItWorksModal.classList.add('hidden')
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !howItWorksModal.classList.contains('hidden')) {
    howItWorksModal.classList.add('hidden')
  }
})

// ---------- Celebration: a short confetti burst the moment the leaderboard ----------
// ---------- first reveals a winner. Purely visual, no data model involved. ----------

const CONFETTI_COLORS = ['#3ddc84', '#f2c14e', '#3b82f6', '#ec4899', '#f97316', '#a855f7']

function triggerConfetti() {
  const container = document.createElement('div')
  container.className = 'confetti-container'
  document.body.appendChild(container)

  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div')
    piece.className = 'confetti-piece'
    piece.style.left = `${Math.random() * 100}%`
    piece.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]
    piece.style.animationDelay = `${Math.random() * 0.4}s`
    piece.style.animationDuration = `${2 + Math.random() * 1.2}s`
    piece.style.setProperty('--drift', `${(Math.random() - 0.5) * 200}px`)
    piece.style.setProperty('--rotate', `${360 + Math.random() * 360}deg`)
    container.appendChild(piece)
  }

  setTimeout(() => container.remove(), 3600)
}

function showError(msg) {
  lobbyError.textContent = msg
  lobbyError.classList.remove('hidden')
}

function clearError() {
  lobbyError.classList.add('hidden')
}

// ---------- Icons: real SVGs colored to match the theme, not emoji ----------
// (emoji render inconsistently across platforms/fonts; these use
// stroke="currentColor" so they pick up whatever color class wraps them)

const ICON_PATHS = {
  trophy: '<path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"/><path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"/><path d="M18 9h1.5a1 1 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/><path d="M6 9H4.5a1 1 0 0 1 0-5H6"/>',
  crown: '<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/>',
  smilePlus: '<path d="M22 11v1a10 10 0 1 1-9-10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/><path d="M16 5h6"/><path d="M19 2v6"/>',
  reply: '<path d="M20 18v-2a4 4 0 0 0-4-4H4"/><path d="m9 17-5-5 5-5"/>'
}

function iconHtml(name, extraClass = '') {
  return `<span class="icon icon-${name} ${extraClass}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">${ICON_PATHS[name]}</svg></span>`
}

// ---------- Avatars: a stable color and initials per peer, so people are ----------
// ---------- recognizable at a glance in a room with more than two peers  ----------

const AVATAR_PALETTE = ['#f97316', '#3b82f6', '#ec4899', '#14b8a6', '#a855f7', '#06b6d4', '#f43f5e', '#84cc16']

function colorForPeer(peerId) {
  let hash = 0
  for (let i = 0; i < peerId.length; i++) hash = (hash * 31 + peerId.charCodeAt(i)) >>> 0
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}

// ---------- Generated readable usernames ----------
// Nobody should ever see a raw peer id like "a7b78444…" as a "username."
// Every peer id deterministically generates a Reddit style readable name
// (e.g. "SwiftFalcon42"), built from a fixed word list plus a hash of the
// peer id, so every app computes the exact same name for the exact same
// peer with zero coordination -- same principle as everything else here.

const USERNAME_ADJECTIVES = [
  'Swift', 'Mighty', 'Rowdy', 'Silent', 'Golden', 'Fierce', 'Lucky', 'Brave',
  'Clever', 'Bold', 'Rapid', 'Sly', 'Jolly', 'Sharp', 'Cosmic', 'Electric',
  'Frosty', 'Blazing', 'Sneaky', 'Wild', 'Noble', 'Quick', 'Mystic', 'Turbo',
  'Fearless', 'Gritty', 'Nimble', 'Radiant', 'Savage', 'Zesty'
]

const USERNAME_NOUNS = [
  'Falcon', 'Striker', 'Panther', 'Eagle', 'Wolf', 'Tiger', 'Phoenix', 'Cobra',
  'Comet', 'Rocket', 'Ninja', 'Wizard', 'Titan', 'Ranger', 'Hawk', 'Lion',
  'Shark', 'Dragon', 'Viper', 'Storm', 'Blaze', 'Knight', 'Rebel', 'Maverick',
  'Voyager', 'Champion', 'Warrior', 'Legend', 'Bolt', 'Cyclone'
]

function hashSeeded(str, seed) {
  let hash = seed >>> 0
  for (let i = 0; i < str.length; i++) hash = (Math.imul(hash, 31) + str.charCodeAt(i)) >>> 0
  return hash
}

const usernameCache = new Map()

function usernameForPeer(peerId) {
  if (usernameCache.has(peerId)) return usernameCache.get(peerId)
  const adjective = USERNAME_ADJECTIVES[hashSeeded(peerId, 0) % USERNAME_ADJECTIVES.length]
  const noun = USERNAME_NOUNS[hashSeeded(peerId, 1) % USERNAME_NOUNS.length]
  const number = hashSeeded(peerId, 2) % 100
  const name = `${adjective}${noun}${number}`
  usernameCache.set(peerId, name)
  return name
}

// Every peer id that's shown up anywhere in the room's log (chat, predictions,
// score reports) -- the best available proxy for "peers currently in the
// room" without a separate presence mechanism, since almost everyone who's
// participated is still around during a live match.
function getKnownPeerIds(state) {
  const ids = new Set([state.peerId])
  for (const msg of state.chat) ids.add(msg.peerId)
  for (const row of state.leaderboard || []) ids.add(row.peerId)
  return ids
}

// ---------- Lobby: automatic fixture list (no create/join forms) ----------

const STATUS_LABEL = {
  not_open: (f) => `Opens in ${formatCountdown(f.kickoffTime - 12 * 60 * 60 * 1000 - Date.now())}`,
  open: () => 'Open',
  live: () => 'Live',
  closed: () => 'Closed'
}

function formatKickoff(ts) {
  return new Date(ts).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function teamInitials(name) {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

// Real national teams get their flag; bracket slots that aren't decided yet
// (like "Winner of Match 97") fall back to a colored initials badge below.
// Covers all 48 teams at the 2026 World Cup, plus a few common alternate
// spellings the live feed or a broadcaster might use for the same team.
const FLAG_MAP = {
  Canada: '🇨🇦',
  Mexico: '🇲🇽',
  USA: '🇺🇸',
  'United States': '🇺🇸',
  Australia: '🇦🇺',
  Iraq: '🇮🇶',
  'IR Iran': '🇮🇷',
  Iran: '🇮🇷',
  Japan: '🇯🇵',
  Jordan: '🇯🇴',
  'Korea Republic': '🇰🇷',
  'South Korea': '🇰🇷',
  Qatar: '🇶🇦',
  'Saudi Arabia': '🇸🇦',
  Uzbekistan: '🇺🇿',
  Algeria: '🇩🇿',
  'Cabo Verde': '🇨🇻',
  'Cape Verde': '🇨🇻',
  'Congo DR': '🇨🇩',
  'DR Congo': '🇨🇩',
  "Côte d'Ivoire": '🇨🇮',
  "Ivory Coast": '🇨🇮',
  Egypt: '🇪🇬',
  Ghana: '🇬🇭',
  Morocco: '🇲🇦',
  Senegal: '🇸🇳',
  'South Africa': '🇿🇦',
  Tunisia: '🇹🇳',
  Curaçao: '🇨🇼',
  Haiti: '🇭🇹',
  Panama: '🇵🇦',
  Argentina: '🇦🇷',
  Brazil: '🇧🇷',
  Colombia: '🇨🇴',
  Ecuador: '🇪🇨',
  Paraguay: '🇵🇾',
  Uruguay: '🇺🇾',
  'New Zealand': '🇳🇿',
  Austria: '🇦🇹',
  Belgium: '🇧🇪',
  'Bosnia and Herzegovina': '🇧🇦',
  Croatia: '🇭🇷',
  Czechia: '🇨🇿',
  'Czech Republic': '🇨🇿',
  England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  France: '🇫🇷',
  Germany: '🇩🇪',
  Netherlands: '🇳🇱',
  Norway: '🇳🇴',
  Portugal: '🇵🇹',
  Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  Spain: '🇪🇸',
  Sweden: '🇸🇪',
  Switzerland: '🇨🇭',
  Türkiye: '🇹🇷',
  Turkey: '🇹🇷'
}

function buildTeamBadge(name) {
  const badge = document.createElement('div')
  const flag = FLAG_MAP[name]
  if (flag) {
    badge.className = 'team-badge flag'
    badge.textContent = flag
  } else {
    badge.className = 'team-badge initials'
    badge.style.background = colorForPeer(name)
    badge.textContent = teamInitials(name)
  }
  return badge
}

// Match themed chat background: a fixed repeating sequence of logo, home
// flag, logo, away flag, low opacity, so it always reads as "Terrace" with
// that match's flags swapped in. Rebuilt only when the match actually
// changes, not on every state push. Tile count is computed from the
// panel's actual size so the pattern covers the whole background instead
// of only the first couple of rows.
let bgPatternMatchId = null

function renderChatBackgroundPattern(fixture) {
  if (bgPatternMatchId === fixture.matchId) return

  const container = document.getElementById('chat-bg-pattern')

  // The room screen may still be hidden (mid transition) the very first
  // time this runs, in which case the container reports zero size -- don't
  // lock in bgPatternMatchId yet so the next render() retries once it's
  // actually visible and laid out.
  if (!container.clientWidth || !container.clientHeight) return
  bgPatternMatchId = fixture.matchId

  container.innerHTML = ''

  const tiles = ['logo']
  if (FLAG_MAP[fixture.home]) tiles.push(FLAG_MAP[fixture.home])
  tiles.push('logo')
  if (FLAG_MAP[fixture.away]) tiles.push(FLAG_MAP[fixture.away])

  const TILE_SIZE = 42 // ~22px tile + 20px gap, matches the CSS below
  const cols = Math.max(1, Math.ceil(container.clientWidth / TILE_SIZE))
  const rows = Math.max(1, Math.ceil(container.clientHeight / TILE_SIZE))
  const count = cols * (rows + 1) // one extra row of buffer

  for (let i = 0; i < count; i++) {
    const tile = tiles[i % tiles.length]
    if (tile === 'logo') {
      const img = document.createElement('img')
      img.src = './assets/logo.png'
      img.alt = ''
      container.appendChild(img)
    } else {
      const span = document.createElement('span')
      span.textContent = tile
      container.appendChild(span)
    }
  }
}

const GROUP_ORDER = [
  { status: 'live', title: 'Live now' },
  { status: 'open', title: 'Open for predictions' },
  { status: 'not_open', title: 'Opens soon' },
  { status: 'closed', title: 'Closed' }
]

function buildFixtureCard(fixture) {
  const li = document.createElement('li')
  li.className = `fixture-item status-${fixture.status}`
  li.dataset.matchId = fixture.matchId

  const teams = document.createElement('div')
  teams.className = 'fixture-teams-row'

  const homeBadge = buildTeamBadge(fixture.home)
  const awayBadge = buildTeamBadge(fixture.away)

  const info = document.createElement('div')
  info.className = 'fixture-info'
  info.innerHTML = `
    <div class="fixture-teams">${fixture.home} vs ${fixture.away}</div>
    <div class="fixture-kickoff">${formatKickoff(fixture.kickoffTime)}</div>
  `

  teams.appendChild(homeBadge)
  teams.appendChild(info)
  teams.appendChild(awayBadge)

  const right = document.createElement('div')
  right.className = 'fixture-right'

  const badge = document.createElement('span')
  badge.className = `badge fixture-status-badge status-${fixture.status}`
  if (fixture.status === 'live') {
    const dot = document.createElement('span')
    dot.className = 'live-dot'
    badge.appendChild(dot)
  }
  badge.appendChild(document.createTextNode(STATUS_LABEL[fixture.status](fixture)))
  right.appendChild(badge)

  const joinBtn = document.createElement('button')
  joinBtn.className = 'primary'
  joinBtn.textContent = 'Join'
  joinBtn.disabled = fixture.status !== 'open' && fixture.status !== 'live'
  joinBtn.addEventListener('click', () => join(fixture.matchId))
  right.appendChild(joinBtn)

  li.appendChild(teams)
  li.appendChild(right)
  return li
}

async function renderFixtureList() {
  const fixtures = await window.terrace.listFixtures()
  fixtureGroupsEl.innerHTML = ''

  for (const group of GROUP_ORDER) {
    const matches = fixtures.filter((f) => f.status === group.status)
    if (!matches.length) continue

    const section = document.createElement('section')
    section.className = 'fixture-group'

    const heading = document.createElement('h2')
    heading.className = 'fixture-group-title'
    heading.textContent = group.title
    section.appendChild(heading)

    const list = document.createElement('ul')
    list.className = 'fixture-list'
    for (const fixture of matches) list.appendChild(buildFixtureCard(fixture))
    section.appendChild(list)

    fixtureGroupsEl.appendChild(section)
  }
}

async function join(matchId) {
  clearError()
  try {
    await window.terrace.enterRoom(matchId)
    enterRoom()
  } catch (err) {
    showError(err.message)
  }
}

// ---------- Room screen ----------

function enterRoom() {
  previousChatCount = 0
  typingPeers.clear()
  renderTypingIndicator()
  hasCelebrated = false
  lobbyScreen.classList.add('hidden')
  roomScreen.classList.remove('hidden')
}

async function exitRoom() {
  roomScreen.classList.add('hidden')
  lobbyScreen.classList.remove('hidden')
  await renderFixtureList()
}

document.getElementById('leave-room').addEventListener('click', async () => {
  await window.terrace.leaveRoom()
  await exitRoom()
})

const predictionForm = document.getElementById('prediction-form')
predictionForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const home = Number(document.getElementById('pred-home').value)
  const away = Number(document.getElementById('pred-away').value)
  try {
    await window.terrace.submitPrediction({ home, away })
  } catch (err) {
    document.getElementById('prediction-status').textContent = err.message
  }
})

// Penalties have their own separate score from the match itself (the match
// score is frozen once a shootout starts), so switching to that phase locks
// the main score inputs at whatever the current score is and reveals a
// second pair of inputs just for the shootout, instead of confusingly
// reusing the same two number fields for both.
const scoreHomeInput = document.getElementById('score-home')
const scoreAwayInput = document.getElementById('score-away')
const scorePhaseSelect = document.getElementById('score-phase')
const penaltyRow = document.getElementById('penalty-row')

scorePhaseSelect.addEventListener('change', () => {
  const isPenalties = scorePhaseSelect.value === 'penalties'
  penaltyRow.classList.toggle('hidden', !isPenalties)
  document.getElementById('pens-home').required = isPenalties
  document.getElementById('pens-away').required = isPenalties

  scoreHomeInput.disabled = isPenalties
  scoreAwayInput.disabled = isPenalties
  if (isPenalties && lastState && lastState.currentScore) {
    scoreHomeInput.value = lastState.currentScore.home
    scoreAwayInput.value = lastState.currentScore.away
  }
})

document.getElementById('score-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const home = Number(scoreHomeInput.value)
  const away = Number(scoreAwayInput.value)
  const phase = scorePhaseSelect.value
  const payload = { home, away, phase }
  if (phase === 'penalties') {
    payload.penalties = {
      home: Number(document.getElementById('pens-home').value),
      away: Number(document.getElementById('pens-away').value)
    }
  }
  await window.terrace.reportScore(payload)
})

document.getElementById('end-match').addEventListener('click', async () => {
  await window.terrace.endMatch()
})

// ---------- Chat input: grows with content, Enter sends, Shift+Enter is a newline ----------

const chatInput = document.getElementById('chat-input')
const chatForm = document.getElementById('chat-form')

function autoGrow() {
  chatInput.style.height = 'auto'
  chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px'
}

// ---------- @mentions with autocomplete, scoped to peers seen in the room ----------

const mentionAutocomplete = document.getElementById('mention-autocomplete')

function getMentionQuery() {
  const match = /(^|\s)@(\w*)$/.exec(chatInput.value.slice(0, chatInput.selectionStart))
  return match ? match[2] : null
}

function updateMentionAutocomplete() {
  const query = getMentionQuery()
  if (query === null || !lastState) {
    mentionAutocomplete.classList.add('hidden')
    mentionAutocomplete.innerHTML = ''
    return
  }

  const candidates = [...getKnownPeerIds(lastState)]
    .filter((peerId) => peerId !== lastState.peerId)
    .map((peerId) => usernameForPeer(peerId))
    .filter((name) => name.toLowerCase().startsWith(query.toLowerCase()))
    .slice(0, 6)

  mentionAutocomplete.innerHTML = ''
  if (!candidates.length) {
    mentionAutocomplete.classList.add('hidden')
    return
  }

  for (const name of candidates) {
    const li = document.createElement('li')
    li.textContent = name
    li.dataset.username = name
    mentionAutocomplete.appendChild(li)
  }
  mentionAutocomplete.classList.remove('hidden')
}

function applyMention(username) {
  const cursor = chatInput.selectionStart
  const before = chatInput.value.slice(0, cursor)
  const after = chatInput.value.slice(cursor)
  const newBefore = before.replace(/(^|\s)@(\w*)$/, `$1@${username} `)
  chatInput.value = newBefore + after
  chatInput.focus()
  const newCursor = newBefore.length
  chatInput.setSelectionRange(newCursor, newCursor)
  mentionAutocomplete.classList.add('hidden')
  autoGrow()
}

mentionAutocomplete.addEventListener('click', (e) => {
  const li = e.target.closest('li')
  if (li) applyMention(li.dataset.username)
})

// ---------- Typing indicators (ephemeral, never touch the log) ----------

let typingTimeout = null

function notifyTyping() {
  window.terrace.setTyping(true)
  clearTimeout(typingTimeout)
  typingTimeout = setTimeout(() => window.terrace.setTyping(false), 2000)
}

function stopTypingNow() {
  clearTimeout(typingTimeout)
  window.terrace.setTyping(false)
}

const typingPeers = new Map() // peerId -> expiry timestamp

function renderTypingIndicator() {
  const now = Date.now()
  for (const [peerId, expiry] of typingPeers) {
    if (expiry < now) typingPeers.delete(peerId)
  }

  const el = document.getElementById('typing-indicator')
  if (!typingPeers.size) {
    el.classList.add('hidden')
    return
  }

  const names = [...typingPeers.keys()].map(usernameForPeer)
  let text
  if (names.length === 1) text = `${names[0]} is typing…`
  else if (names.length === 2) text = `${names[0]} and ${names[1]} are typing…`
  else text = 'Several people are typing…'
  el.textContent = text
  el.classList.remove('hidden')
}

// Local safety net: if a peer's "stopped typing" signal never arrives
// (dropped connection, crash), their indicator still clears itself after a
// few seconds since each entry carries its own expiry.
setInterval(renderTypingIndicator, 1000)

window.terrace.onTyping((msg) => {
  if (msg.typing) typingPeers.set(msg.peerId, Date.now() + 3000)
  else typingPeers.delete(msg.peerId)
  renderTypingIndicator()
})

chatInput.addEventListener('input', () => {
  autoGrow()
  updateMentionAutocomplete()
  notifyTyping()
})

chatInput.addEventListener('keydown', (e) => {
  const suggestionVisible = !mentionAutocomplete.classList.contains('hidden')

  if (suggestionVisible && e.key === 'Escape') {
    e.preventDefault()
    mentionAutocomplete.classList.add('hidden')
    return
  }

  if (suggestionVisible && (e.key === 'Enter' || e.key === 'Tab')) {
    e.preventDefault()
    const first = mentionAutocomplete.querySelector('li')
    if (first) applyMention(first.dataset.username)
    return
  }

  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    chatForm.requestSubmit()
  }
})

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const text = chatInput.value.trim()
  if (!text) return
  chatInput.value = ''
  autoGrow()
  stopTypingNow()
  const replyToTs = replyingToTs
  cancelReply()
  await window.terrace.sendChat(text, replyToTs)
})

// ---------- Rendering state pushed from the main process ----------

function formatCountdown(ms) {
  if (ms <= 0) return 'kicked off'
  const totalSec = Math.floor(ms / 1000)
  const d = Math.floor(totalSec / 86400)
  const h = Math.floor((totalSec % 86400) / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${s}s`
}

function formatDayLabel(ts) {
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

// A message is just a normal chat entry whose text happens to be an image
// or GIF URL -- no external API involved, the renderer just detects the
// pattern and shows an inline preview under the text.
const IMAGE_URL_PATTERN = /^https?:\/\/\S+\.(gif|png|jpe?g|webp)(\?\S*)?$/i

function isImageUrl(text) {
  return IMAGE_URL_PATTERN.test(text.trim())
}

// ---------- @mention rendering ----------
// msg.text is arbitrary user input, so it's escaped first (via a detached
// element's textContent -> innerHTML round trip) before any markup for
// recognized @mentions is injected -- never trust chat text as HTML.

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function renderMessageHtml(text, knownUsernames) {
  const escaped = escapeHtml(text)
  if (!knownUsernames.size) return escaped
  return escaped.replace(/@(\w+)/g, (full, name) => {
    for (const known of knownUsernames) {
      if (known.toLowerCase() === name.toLowerCase()) return `<span class="chat-mention">@${known}</span>`
    }
    return full
  })
}

function mentionsUsername(text, username) {
  return new RegExp(`@${username}\\b`, 'i').test(text)
}

const GROUP_WINDOW_MS = 5 * 60 * 1000
const PHASE_LABEL = { normal: 'Normal Time', extra_time: 'Extra Time', penalties: 'Penalties' }

// ---------- Emoji reactions ----------
// Real emoji here are fine (this is user generated chat content, not app
// chrome) -- only the "add a reaction" trigger uses the icon system, for
// consistency with the rest of the UI.

function buildReactionRow(msg, state) {
  const reactions = (state.reactions && state.reactions[msg.ts]) || []
  const row = document.createElement('div')
  row.className = 'reaction-row'
  row.dataset.targetTs = msg.ts

  const byEmoji = new Map()
  for (const r of reactions) {
    if (!byEmoji.has(r.emoji)) byEmoji.set(r.emoji, [])
    byEmoji.get(r.emoji).push(r.peerId)
  }

  for (const [emoji, peerIds] of byEmoji) {
    const pill = document.createElement('button')
    pill.type = 'button'
    pill.className = 'reaction-pill' + (peerIds.includes(state.peerId) ? ' mine' : '')
    pill.dataset.emoji = emoji
    pill.textContent = `${emoji} ${peerIds.length}`
    row.appendChild(pill)
  }

  const addBtn = document.createElement('button')
  addBtn.type = 'button'
  addBtn.className = 'reaction-add'
  addBtn.setAttribute('aria-label', 'Add reaction')
  addBtn.innerHTML = iconHtml('smilePlus')
  row.appendChild(addBtn)

  const replyBtn = document.createElement('button')
  replyBtn.type = 'button'
  replyBtn.className = 'reaction-reply'
  replyBtn.setAttribute('aria-label', 'Reply')
  replyBtn.innerHTML = iconHtml('reply')
  row.appendChild(replyBtn)

  return row
}

let activeReactionTargetTs = null
const reactionPicker = document.getElementById('reaction-picker')

// ---------- Reply / quote ----------

let replyingToTs = null
const replyBanner = document.getElementById('reply-banner')
const replyBannerName = document.getElementById('reply-banner-name')
const replyBannerPreview = document.getElementById('reply-banner-preview')

function truncate(text, max = 60) {
  return text.length > max ? text.slice(0, max) + '…' : text
}

function startReply(targetTs) {
  if (!lastState) return
  const original = lastState.chat.find((m) => m.ts === targetTs)
  if (!original) return
  replyingToTs = targetTs
  replyBannerName.textContent = original.peerId === lastState.peerId ? 'you' : usernameForPeer(original.peerId)
  replyBannerPreview.textContent = truncate(original.text, 60)
  replyBanner.classList.remove('hidden')
  chatInput.focus()
}

function cancelReply() {
  replyingToTs = null
  replyBanner.classList.add('hidden')
}

document.getElementById('reply-banner-cancel').addEventListener('click', cancelReply)

document.getElementById('chat-feed').addEventListener('click', async (e) => {
  const pill = e.target.closest('.reaction-pill')
  if (pill) {
    const targetTs = Number(pill.closest('.reaction-row').dataset.targetTs)
    const mine = pill.classList.contains('mine')
    await window.terrace.react({ targetTs, emoji: mine ? null : pill.dataset.emoji })
    return
  }

  const addBtn = e.target.closest('.reaction-add')
  if (addBtn) {
    activeReactionTargetTs = Number(addBtn.closest('.reaction-row').dataset.targetTs)
    const rect = addBtn.getBoundingClientRect()
    reactionPicker.style.top = `${rect.bottom + 4}px`
    reactionPicker.style.left = `${Math.max(8, rect.left - 90)}px`
    reactionPicker.classList.remove('hidden')
    return
  }

  const replyBtn = e.target.closest('.reaction-reply')
  if (replyBtn) {
    startReply(Number(replyBtn.closest('.reaction-row').dataset.targetTs))
  }
})

reactionPicker.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-emoji]')
  if (!btn || activeReactionTargetTs === null) return
  await window.terrace.react({ targetTs: activeReactionTargetTs, emoji: btn.dataset.emoji })
  reactionPicker.classList.add('hidden')
  activeReactionTargetTs = null
})

document.addEventListener('click', (e) => {
  if (reactionPicker.classList.contains('hidden')) return
  if (reactionPicker.contains(e.target) || e.target.closest('.reaction-add')) return
  reactionPicker.classList.add('hidden')
  activeReactionTargetTs = null
})

function renderChat(state) {
  const feed = document.getElementById('chat-feed')
  const wasAtBottom = feed.scrollTop + feed.clientHeight >= feed.scrollHeight - 40
  feed.innerHTML = ''

  document.getElementById('chat-peer-count').textContent = `${state.connections + 1} in the room`

  // Whoever is currently closest to the live crowd sourced score gets a
  // small marker next to their name in chat -- this updates live, well
  // before the match officially ends.
  const leadingPeerIds = new Set((state.leaderboard || []).filter((r) => r.isWinner).map((r) => r.peerId))
  const chatByTs = new Map(state.chat.map((m) => [m.ts, m]))
  const knownUsernames = new Set([...getKnownPeerIds(state)].map(usernameForPeer))
  const myUsername = usernameForPeer(state.peerId)

  if (!state.chat.length) {
    const empty = document.createElement('div')
    empty.className = 'chat-empty'
    empty.textContent = 'No messages yet. Say hello to the room.'
    feed.appendChild(empty)
    previousChatCount = 0
    return
  }

  let lastDay = null
  let lastPeerId = null
  let lastTs = 0
  let currentGroup = null
  let currentColumn = null

  state.chat.forEach((msg, index) => {
    const day = formatDayLabel(msg.ts)
    if (day !== lastDay) {
      const divider = document.createElement('div')
      divider.className = 'chat-day-divider'
      divider.innerHTML = `<span>${day}</span>`
      feed.appendChild(divider)
      lastDay = day
      lastPeerId = null
    }

    const isMine = msg.peerId === state.peerId
    const startsNewGroup = msg.peerId !== lastPeerId || msg.ts - lastTs > GROUP_WINDOW_MS

    if (startsNewGroup) {
      const isLeading = leadingPeerIds.has(msg.peerId)

      currentGroup = document.createElement('div')
      currentGroup.className = 'chat-group' + (isMine ? ' mine' : '') + (isLeading ? ' leading' : '')

      if (!isMine) {
        const avatar = document.createElement('div')
        avatar.className = 'chat-avatar'
        avatar.style.background = colorForPeer(msg.peerId)
        avatar.textContent = usernameForPeer(msg.peerId).slice(0, 2).toUpperCase()
        currentGroup.appendChild(avatar)
      }

      currentColumn = document.createElement('div')
      currentColumn.className = 'chat-bubble-column'

      if (!isMine || isLeading) {
        const name = document.createElement('div')
        name.className = 'chat-sender-name'
        name.innerHTML = (isMine ? 'you' : usernameForPeer(msg.peerId)) + (isLeading ? iconHtml('crown', 'icon-gold') : '')
        currentColumn.appendChild(name)
      }

      currentGroup.appendChild(currentColumn)
      feed.appendChild(currentGroup)
    }

    if (msg.replyToTs) {
      const original = chatByTs.get(msg.replyToTs)
      const quote = document.createElement('div')
      quote.className = 'chat-quote'
      const quoteName = original ? (original.peerId === state.peerId ? 'you' : usernameForPeer(original.peerId)) : 'a message'
      const quoteText = escapeHtml(original ? truncate(original.text, 50) : 'that is no longer available')
      quote.innerHTML = `<span class="chat-quote-name">${escapeHtml(quoteName)}</span> ${quoteText}`
      currentColumn.appendChild(quote)
    }

    const bubble = document.createElement('div')
    bubble.className = 'chat-bubble'
    if (!isMine && mentionsUsername(msg.text, myUsername)) bubble.classList.add('mentions-me')
    if (index >= previousChatCount) bubble.classList.add('chat-bubble-new')
    bubble.innerHTML = renderMessageHtml(msg.text, knownUsernames)
    currentColumn.appendChild(bubble)

    if (isImageUrl(msg.text)) {
      const img = document.createElement('img')
      img.className = 'chat-image-preview'
      img.src = msg.text.trim()
      img.loading = 'lazy'
      img.alt = 'Shared image'
      img.addEventListener('error', () => img.remove(), { once: true })
      currentColumn.appendChild(img)
    }

    currentColumn.appendChild(buildReactionRow(msg, state))

    lastPeerId = msg.peerId
    lastTs = msg.ts
  })

  if (currentColumn) {
    const time = document.createElement('div')
    time.className = 'chat-time'
    time.textContent = formatTime(lastTs)
    currentColumn.appendChild(time)
  }

  previousChatCount = state.chat.length

  if (wasAtBottom) feed.scrollTop = feed.scrollHeight
}

function render(state) {
  if (!state || !state.fixture) return

  renderChatBackgroundPattern(state.fixture)

  document.getElementById('match-teams').textContent = `${state.fixture.home} vs ${state.fixture.away}`
  document.getElementById('peer-count-text').textContent = `${state.connections} peer${state.connections === 1 ? '' : 's'} connected`

  const statusEl = document.getElementById('match-status')
  const now = Date.now()
  if (state.locked) {
    statusEl.textContent = 'PREDICTIONS LOCKED'
    statusEl.className = 'badge badge-locked'
  } else {
    statusEl.textContent = `KICKS OFF IN ${formatCountdown(state.fixture.kickoffTime - now).toUpperCase()}`
    statusEl.className = 'badge badge-countdown'
  }

  // Prediction panel
  const predForm = document.getElementById('prediction-form')
  const predStatus = document.getElementById('prediction-status')
  const submitBtn = predForm.querySelector('button')
  if (state.hasSubmitted) {
    for (const input of predForm.querySelectorAll('input')) input.disabled = true
    submitBtn.disabled = true
    predStatus.textContent = 'Prediction submitted and locked in.'
  } else if (state.locked) {
    for (const input of predForm.querySelectorAll('input')) input.disabled = true
    submitBtn.disabled = true
    predStatus.textContent = 'Predictions are locked. Kickoff has passed.'
  } else {
    for (const input of predForm.querySelectorAll('input')) input.disabled = false
    submitBtn.disabled = false
    if (!predStatus.textContent.startsWith('Prediction submitted')) {
      predStatus.textContent = `${state.predictionCount} prediction(s) submitted so far.`
    }
  }

  renderChat(state)

  // Current score: crowd sourced, live, can keep changing all match. Nobody
  // having updated it yet just means the match hasn't started, so default
  // to 0:0 rather than an empty/placeholder state.
  lastState = state
  const scoreValueEl = document.getElementById('score-value')
  const scoreSupportEl = document.getElementById('score-support')
  if (state.currentScore) {
    const s = state.currentScore
    const penaltyText = s.penalties ? `, pens ${s.penalties.home}:${s.penalties.away}` : ''
    scoreValueEl.textContent = `${s.home}:${s.away} (${PHASE_LABEL[s.phase] || s.phase}${penaltyText})`
    scoreSupportEl.textContent = s.totalReporters === 1
      ? 'Updated by 1 person so far.'
      : `${s.reporterCount} of ${s.totalReporters} people currently agree on this.`
  } else {
    scoreValueEl.textContent = '0:0'
    scoreSupportEl.textContent = 'Nobody has updated the score yet.'
  }
  document.getElementById('end-match').textContent = state.matchEnded ? 'Match Ended (update below to correct it)' : 'End Match'

  // Leaderboard: shown once anyone has clicked End Match, but the score
  // (and therefore the ranking) can still keep changing if it's disputed.
  const leaderboardPanel = document.getElementById('leaderboard-panel')
  if (state.matchEnded && state.leaderboard) {
    if (!hasCelebrated) {
      hasCelebrated = true
      triggerConfetti()
    }
    leaderboardPanel.classList.remove('hidden')
    const list = document.getElementById('leaderboard-list')
    list.innerHTML = ''
    for (const row of state.leaderboard) {
      const li = document.createElement('li')
      if (row.isWinner) li.className = 'winner'
      const label = row.peerId === state.peerId ? 'you' : usernameForPeer(row.peerId)
      li.innerHTML = `<span class="rank">#${row.rank}</span><span>${label} guessed ${row.prediction.home}:${row.prediction.away}</span><span>error ${row.error}${row.isWinner ? iconHtml('trophy', 'icon-gold') : ''}</span>`
      list.appendChild(li)
    }
  } else {
    leaderboardPanel.classList.add('hidden')
  }
}

window.terrace.onState((state) => render(state))

// Live-tick the countdown/fixture statuses even with no new log entries.
setInterval(async () => {
  if (roomScreen.classList.contains('hidden')) {
    await renderFixtureList()
    return
  }
  const state = await window.terrace.getState()
  render(state)
}, 1000)

// ---------- Init ----------

window.terrace.getIdentity().then(({ peerId }) => {
  myPeerId = peerId
  myPeerIdEl.textContent = usernameForPeer(peerId)
  myPeerIdEl.parentElement.title = `Peer id: ${peerId}`
})

renderFixtureList()
