const lobbyScreen = document.getElementById('lobby-screen')
const roomScreen = document.getElementById('room-screen')

const lobbyError = document.getElementById('lobby-error')
const myPeerIdEl = document.getElementById('my-peer-id')
const fixtureGroupsEl = document.getElementById('fixture-groups')

let myPeerId = null
let previousChatCount = 0
let lastState = null

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
  crown: '<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/>'
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

chatInput.addEventListener('input', autoGrow)

chatInput.addEventListener('keydown', (e) => {
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
  await window.terrace.sendChat(text)
})

// ---------- Rendering state pushed from the main process ----------

function formatCountdown(ms) {
  if (ms <= 0) return 'kicked off'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
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

const GROUP_WINDOW_MS = 5 * 60 * 1000
const PHASE_LABEL = { normal: 'Full Time', extra_time: 'Extra Time', penalties: 'Penalties' }

function renderChat(state) {
  const feed = document.getElementById('chat-feed')
  const wasAtBottom = feed.scrollTop + feed.clientHeight >= feed.scrollHeight - 40
  feed.innerHTML = ''

  document.getElementById('chat-peer-count').textContent = `${state.connections + 1} in the room`

  // Whoever is currently closest to the live crowd sourced score gets a
  // small marker next to their name in chat -- this updates live, well
  // before the match officially ends.
  const leadingPeerIds = new Set((state.leaderboard || []).filter((r) => r.isWinner).map((r) => r.peerId))

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
        avatar.textContent = msg.peerId.slice(0, 2).toUpperCase()
        currentGroup.appendChild(avatar)
      }

      currentColumn = document.createElement('div')
      currentColumn.className = 'chat-bubble-column'

      if (!isMine || isLeading) {
        const name = document.createElement('div')
        name.className = 'chat-sender-name'
        name.innerHTML = (isMine ? 'you' : msg.peerId.slice(0, 8)) + (isLeading ? iconHtml('crown', 'icon-gold') : '')
        currentColumn.appendChild(name)
      }

      currentGroup.appendChild(currentColumn)
      feed.appendChild(currentGroup)
    }

    const bubble = document.createElement('div')
    bubble.className = 'chat-bubble'
    if (index >= previousChatCount) bubble.classList.add('chat-bubble-new')
    bubble.textContent = msg.text
    currentColumn.appendChild(bubble)

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
    leaderboardPanel.classList.remove('hidden')
    const list = document.getElementById('leaderboard-list')
    list.innerHTML = ''
    for (const row of state.leaderboard) {
      const li = document.createElement('li')
      if (row.isWinner) li.className = 'winner'
      const label = row.peerId === state.peerId ? 'you' : row.peerId.slice(0, 8)
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
  myPeerIdEl.textContent = peerId.slice(0, 16) + '…'
})

renderFixtureList()
