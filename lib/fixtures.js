// The match list comes from a live, free, no key needed public data feed
// (openfootball's public domain World Cup JSON, hosted on GitHub) so new
// matches and confirmed matchups appear automatically as the tournament
// progresses -- nobody has to edit this file or ship a new build. If that
// fetch fails (offline, feed down) the app falls back to the bundled list
// below, so it still works with no internet access to anything but peers.
//
// This fetch is a plain read only HTTPS GET for a static JSON file, not a
// networking layer for the app itself -- predictions, chat, and the
// leaderboard are still 100% Hyperswarm/Hypercore with zero server
// involved. Only "what matches exist and when" is sourced centrally, the
// same way a torrent client might read a public tracker list without that
// making the file transfer itself any less peer to peer.
//
// Every peer that fetches this feed gets the exact same `matchId` for the
// exact same match (openfootball's own match number), so there's still no
// way for two people to end up in two different rooms for one match, and
// no free-text entry anywhere in the flow.
const REMOTE_FEED_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'
const REMOTE_CACHE_MS = 5 * 60 * 1000 // re-fetch at most every 5 minutes
const REMOTE_TIMEOUT_MS = 5000

let remoteCache = { fixtures: null, fetchedAt: 0 }

function parseKickoff(dateStr, timeStr) {
  const match = /^(\d{2}:\d{2})\s+UTC([+-]\d+)$/.exec(timeStr || '')
  if (!match) return null
  const [, hhmm, offset] = match
  const sign = offset.startsWith('-') ? '-' : '+'
  const hours = String(Math.abs(parseInt(offset, 10))).padStart(2, '0')
  const ts = Date.parse(`${dateStr}T${hhmm}:00${sign}${hours}:00`)
  return Number.isNaN(ts) ? null : ts
}

function normalizeTeamName(name) {
  const winner = /^W(\d+)$/.exec(name || '')
  if (winner) return `Winner of Match ${winner[1]}`
  const loser = /^L(\d+)$/.exec(name || '')
  if (loser) return `Loser of Match ${loser[1]}`
  return name
}

function transformMatch(match) {
  const kickoffTime = parseKickoff(match.date, match.time)
  if (!kickoffTime || !match.team1 || !match.team2) return null
  return {
    matchId: `wc2026-m${match.num}`,
    home: normalizeTeamName(match.team1),
    away: normalizeTeamName(match.team2),
    kickoffTime
  }
}

async function fetchRemoteFixtures() {
  const now = Date.now()
  if (remoteCache.fixtures && now - remoteCache.fetchedAt < REMOTE_CACHE_MS) {
    return remoteCache.fixtures
  }
  try {
    const res = await fetch(REMOTE_FEED_URL, { signal: AbortSignal.timeout(REMOTE_TIMEOUT_MS) })
    if (!res.ok) throw new Error(`feed returned ${res.status}`)
    const data = await res.json()
    const fixtures = (data.matches || [])
      .map(transformMatch)
      .filter(Boolean)
      .filter((f) => getStatus(f, now) !== 'closed') // trim already finished matches
    remoteCache = { fixtures, fetchedAt: now }
    return fixtures
  } catch (err) {
    console.log('[terrace] live fixture feed unavailable, using bundled fallback list:', err.message)
    return null
  }
}

// Fallback list, used only if the live feed above can't be reached. Kickoff
// times are fixed, absolute timestamps (not computed relative to "now" at
// each launch) -- that's what lets every peer, regardless of when they
// happen to start the app, agree on exactly the same open/live/closed
// window and exactly the same prediction lock time.
function utc(year, month, day, hour, minute = 0) {
  return Date.UTC(year, month - 1, day, hour, minute)
}

const FIXTURES = [
  {
    matchId: 'wc2026-r16-spain-portugal',
    home: 'Spain',
    away: 'Portugal',
    kickoffTime: utc(2026, 7, 6, 19, 0) // Mon Jul 6, 3:00 PM ET, AT&T Stadium, Arlington
  },
  {
    matchId: 'wc2026-r16-belgium-usa',
    home: 'Belgium',
    away: 'USA',
    kickoffTime: utc(2026, 7, 7, 0, 0) // Mon Jul 6, 8:00 PM ET, Lumen Field, Seattle
  },
  {
    matchId: 'wc2026-r16-egypt-argentina',
    home: 'Egypt',
    away: 'Argentina',
    kickoffTime: utc(2026, 7, 7, 16, 0) // Tue Jul 7, 12:00 PM ET, Mercedes Benz Stadium, Atlanta
  },
  {
    matchId: 'wc2026-r16-switzerland-colombia',
    home: 'Switzerland',
    away: 'Colombia',
    kickoffTime: utc(2026, 7, 7, 20, 0) // Tue Jul 7, 4:00 PM ET, BC Place, Vancouver
  },
  {
    matchId: 'wc2026-qf1-france-morocco',
    home: 'France',
    away: 'Morocco',
    kickoffTime: utc(2026, 7, 9, 20, 0) // Thu Jul 9, 4:00 PM ET, Gillette Stadium, Foxborough
  },
  {
    matchId: 'wc2026-qf2',
    home: 'Spain or Portugal',
    away: 'Belgium or USA',
    kickoffTime: utc(2026, 7, 10, 19, 0) // Fri Jul 10, 3:00 PM ET, SoFi Stadium, Inglewood
  },
  {
    matchId: 'wc2026-qf3-norway-england',
    home: 'Norway',
    away: 'England',
    kickoffTime: utc(2026, 7, 11, 21, 0) // Sat Jul 11, 5:00 PM ET, Hard Rock Stadium, Miami Gardens
  },
  {
    matchId: 'wc2026-qf4',
    home: 'Egypt or Argentina',
    away: 'Switzerland or Colombia',
    kickoffTime: utc(2026, 7, 12, 1, 0) // Sat Jul 11, 9:00 PM ET, Arrowhead Stadium, Kansas City
  },
  {
    matchId: 'wc2026-sf1',
    home: 'QF1 Winner',
    away: 'QF2 Winner',
    kickoffTime: utc(2026, 7, 14, 19, 0) // Tue Jul 14, 3:00 PM ET
  },
  {
    matchId: 'wc2026-sf2',
    home: 'QF3 Winner',
    away: 'QF4 Winner',
    kickoffTime: utc(2026, 7, 15, 19, 0) // Wed Jul 15, 3:00 PM ET
  },
  {
    matchId: 'wc2026-third-place',
    home: 'SF1 Loser',
    away: 'SF2 Loser',
    kickoffTime: utc(2026, 7, 18, 21, 0) // Sat Jul 18, 5:00 PM ET
  },
  {
    matchId: 'wc2026-final',
    home: 'SF1 Winner',
    away: 'SF2 Winner',
    kickoffTime: utc(2026, 7, 19, 19, 0) // Sun Jul 19, 3:00 PM ET, MetLife Stadium, East Rutherford
  }
]

const OPEN_BEFORE_MS = 12 * 60 * 60 * 1000
const CLOSE_AFTER_MS = 6 * 60 * 60 * 1000

// Test-only seam: the automated GUI e2e test needs a fixture with a
// controllable near-future kickoff to exercise the open -> locked transition
// without waiting hours for a real bundled fixture to turn over. Unset in
// normal use, so this has zero effect on the real static list.
async function getFixtures() {
  // Bypass the live feed entirely in test mode: deterministic, fast, and
  // doesn't make automated tests depend on a third party being reachable.
  if (process.env.TERRACE_TEST_FIXTURE) {
    try {
      return [JSON.parse(process.env.TERRACE_TEST_FIXTURE), ...FIXTURES]
    } catch (err) {
      // fall through to the real list
    }
  }
  const remote = await fetchRemoteFixtures()
  return remote && remote.length ? remote : FIXTURES
}

async function getFixture(matchId) {
  const fixtures = await getFixtures()
  return fixtures.find((f) => f.matchId === matchId) || null
}

// 'not_open' -> too far in the future, room isn't joinable yet
// 'open'     -> pre-kickoff window, predictions allowed
// 'live'     -> kickoff has passed, predictions locked, chat/result active
// 'closed'   -> more than CLOSE_AFTER_MS past kickoff, room is archived
function getStatus(fixture, now = Date.now()) {
  if (now < fixture.kickoffTime - OPEN_BEFORE_MS) return 'not_open'
  if (now < fixture.kickoffTime) return 'open'
  if (now < fixture.kickoffTime + CLOSE_AFTER_MS) return 'live'
  return 'closed'
}

function isJoinable(fixture, now = Date.now()) {
  const status = getStatus(fixture, now)
  return status === 'open' || status === 'live'
}

module.exports = { getFixtures, getFixture, getStatus, isJoinable, OPEN_BEFORE_MS, CLOSE_AFTER_MS }
