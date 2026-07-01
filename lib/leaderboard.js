// Pure functions over a merged array of log entries. No I/O, no P2P --
// this is what lets the same logic run identically (and deterministically)
// on every peer's machine, and be unit-tested without any networking.

function dedupeEarliestByPeer(entries) {
  const byPeer = new Map()
  for (const e of entries) {
    const existing = byPeer.get(e.peerId)
    if (!existing || e.ts < existing.ts) byPeer.set(e.peerId, e)
  }
  return [...byPeer.values()]
}

function dedupeLatestByPeer(entries) {
  const byPeer = new Map()
  for (const e of entries) {
    const existing = byPeer.get(e.peerId)
    if (!existing || e.ts > existing.ts) byPeer.set(e.peerId, e)
  }
  return [...byPeer.values()]
}

function getPredictions(entries) {
  return dedupeEarliestByPeer(entries.filter((e) => e.type === 'prediction'))
}

function getChat(entries) {
  return entries.filter((e) => e.type === 'chat').sort((a, b) => a.ts - b.ts)
}

function predictionError(prediction, score) {
  return Math.abs(prediction.home - score.home) + Math.abs(prediction.away - score.away)
}

// Penalties have their own score, separate from the match score (which is
// frozen once a shootout starts), so a penalty score is part of what people
// need to agree on too -- two reports with the same home/away/phase but a
// different penalty score are still a disagreement, not the same vote.
function scoreKey(report) {
  const pens = report.penalties ? `:${report.penalties.home}:${report.penalties.away}` : ''
  return `${report.home}:${report.away}:${report.phase}${pens}`
}

function toCurrentScore(report, reporterCount, totalReporters) {
  return {
    home: report.home,
    away: report.away,
    phase: report.phase,
    penalties: report.penalties || null,
    ts: report.ts,
    reporterCount,
    totalReporters
  }
}

// The "current score" is crowd sourced, not posted once by one person: any
// peer can report it, at any point during the match, and it can keep
// changing as the game does. Consensus rule:
//   - 1 reporter  -> that's the current score, nothing to agree on yet
//   - 2 reporters (disagreeing) -> whichever was posted most recently wins
//   - 3+ reporters -> whichever exact score+phase has the most reporters
//                     behind it wins (ties broken by most recent)
// Only each peer's LATEST report counts -- if you correct yourself, your
// earlier report no longer has a vote.
function getCurrentScore(entries) {
  const latestPerPeer = dedupeLatestByPeer(entries.filter((e) => e.type === 'score_update'))
  if (!latestPerPeer.length) return null
  if (latestPerPeer.length === 1) {
    return toCurrentScore(latestPerPeer[0], 1, 1)
  }
  if (latestPerPeer.length === 2) {
    const latest = latestPerPeer.reduce((a, b) => (b.ts > a.ts ? b : a))
    return toCurrentScore(latest, 1, 2)
  }

  const groups = new Map()
  for (const report of latestPerPeer) {
    const key = scoreKey(report)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(report)
  }

  let winningGroup = null
  for (const group of groups.values()) {
    if (!winningGroup) {
      winningGroup = group
      continue
    }
    const groupNewestTs = Math.max(...group.map((r) => r.ts))
    const winningNewestTs = Math.max(...winningGroup.map((r) => r.ts))
    if (group.length > winningGroup.length || (group.length === winningGroup.length && groupNewestTs > winningNewestTs)) {
      winningGroup = group
    }
  }

  const representative = winningGroup.reduce((a, b) => (b.ts > a.ts ? b : a))
  return toCurrentScore(representative, winningGroup.length, latestPerPeer.length)
}

function isMatchEnded(entries) {
  return entries.some((e) => e.type === 'match_ended')
}

// Returns null if nobody has reported a current score yet, otherwise a
// ranked leaderboard array: [{ peerId, prediction, error, rank, isWinner
// }, ...] sorted best (lowest error) first. This is live the whole match,
// not just after "End Match" -- computed fresh from whatever the current
// consensus score is, whether or not the match has been marked ended.
function computeLeaderboard(entries) {
  const score = getCurrentScore(entries)
  if (!score) return null

  const predictions = getPredictions(entries)
  const scored = predictions.map((p) => ({
    peerId: p.peerId,
    prediction: p.prediction,
    ts: p.ts,
    error: predictionError(p.prediction, score)
  }))

  scored.sort((a, b) => a.error - b.error || a.ts - b.ts)

  const bestError = scored.length ? scored[0].error : null
  return scored.map((s, i) => ({
    ...s,
    rank: i + 1,
    isWinner: s.error === bestError
  }))
}

// kickoffTime comes from the fixture (see fixtures.js), known instantly to
// every peer with zero network dependency -- not from a log entry that has
// to replicate first. This is entirely separate from the current score
// mechanic above: predictions lock at kickoff regardless of what happens
// during the match.
function isLocked(kickoffTime, now = Date.now()) {
  return now > kickoffTime
}

module.exports = {
  getPredictions,
  getChat,
  getCurrentScore,
  isMatchEnded,
  computeLeaderboard,
  isLocked,
  predictionError
}
