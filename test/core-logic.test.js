// End-to-end test of the core P2P logic (no Electron/GUI). Peer A's Room
// runs directly in this process; peer B's Room is forked into a real child
// process (see core-logic-worker.js) and driven over Node's IPC channel.
// Two independent Hyperswarm/DHT nodes in the SAME OS process were found to
// reliably fail to discover each other in this environment -- two real
// processes (matching how the actual demo runs: two terminals, or two
// Electron windows) is both a workaround and arguably a more faithful test.
//
// Note on timing: NAT hole-punching over the public Hyperswarm DHT can take
// anywhere from ~1s to ~60s depending on network conditions (inherent to
// serverless P2P, not an app bug), so the connection wait is generous. The
// kickoff-lock test uses a room set far in the future so the P2P sync
// assertions aren't racing the clock; the lock-flip behavior itself is
// verified separately as a fast, deterministic pure-function unit test
// against lib/leaderboard.js (no networking, no sleeping required).
//
// Run: node test/core-logic.test.js

const assert = require('assert')
const os = require('os')
const path = require('path')
const fs = require('fs')
const { fork } = require('child_process')
const crypto = require('hypercore-crypto')

const Room = require('../lib/room')
const { topicFromMatchId } = require('../lib/topic')
const lb = require('../lib/leaderboard')
const fixtures = require('../lib/fixtures')

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitFor(condition, { timeout = 90000, interval = 100 } = {}) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await condition()) return true
    await wait(interval)
  }
  throw new Error('waitFor timed out')
}

function testLockLogicIsPure() {
  const kickoffTime = 1000

  assert.strictEqual(lb.isLocked(kickoffTime, 999), false, 'before kickoff => unlocked')
  assert.strictEqual(lb.isLocked(kickoffTime, 1000), false, 'exactly at kickoff => still unlocked (now > kickoff, not >=)')
  assert.strictEqual(lb.isLocked(kickoffTime, 1001), true, 'after kickoff => locked')
  console.log('✔ isLocked() pure-function lock-flip logic verified')
}

function testFixtureLifecycleIsPure() {
  const kickoffTime = 10 * 60 * 60 * 1000 // arbitrary reference point
  const fixture = { matchId: 'x', home: 'A', away: 'B', kickoffTime }

  assert.strictEqual(fixtures.getStatus(fixture, kickoffTime - 13 * 60 * 60 * 1000), 'not_open', 'more than 12h before kickoff')
  assert.strictEqual(fixtures.getStatus(fixture, kickoffTime - 1000), 'open', 'inside the 12h pre-kickoff window')
  assert.strictEqual(fixtures.getStatus(fixture, kickoffTime + 1000), 'live', 'just after kickoff')
  assert.strictEqual(fixtures.getStatus(fixture, kickoffTime + 7 * 60 * 60 * 1000), 'closed', 'more than 6h after kickoff')

  assert.strictEqual(fixtures.isJoinable(fixture, kickoffTime - 13 * 60 * 60 * 1000), false)
  assert.strictEqual(fixtures.isJoinable(fixture, kickoffTime - 1000), true)
  assert.strictEqual(fixtures.isJoinable(fixture, kickoffTime + 1000), true)
  assert.strictEqual(fixtures.isJoinable(fixture, kickoffTime + 7 * 60 * 60 * 1000), false)
  console.log('✔ fixture open/live/closed lifecycle logic verified (12h before -> 6h after kickoff)')
}

function testLeaderboardTiesAndRanking() {
  const entries = [
    { type: 'score_update', peerId: 'ref', home: 2, away: 1, phase: 'normal', ts: 500 },
    { type: 'prediction', peerId: 'p1', prediction: { home: 2, away: 1 }, ts: 100 }, // error 0
    { type: 'prediction', peerId: 'p2', prediction: { home: 1, away: 1 }, ts: 100 }, // error 1
    { type: 'prediction', peerId: 'p3', prediction: { home: 3, away: 0 }, ts: 90 }, // error 2
    { type: 'prediction', peerId: 'p1', prediction: { home: 0, away: 0 }, ts: 200 } // duplicate from p1, later ts -> ignored (earliest wins)
  ]
  const board = lb.computeLeaderboard(entries)
  assert.strictEqual(board.length, 3, 'duplicate prediction from same peer is deduped to their earliest')
  assert.strictEqual(board[0].peerId, 'p1')
  assert.strictEqual(board[0].isWinner, true)
  assert.strictEqual(board[1].peerId, 'p2')
  assert.strictEqual(board[2].peerId, 'p3')
  console.log('✔ leaderboard ranking + per-peer dedupe logic verified')
}

function testCurrentScoreConsensusIsPure() {
  assert.strictEqual(lb.getCurrentScore([]), null, 'no reports yet => no current score')

  // 1 reporter: trivially "current", nothing to agree on
  const oneReporter = [{ type: 'score_update', peerId: 'a', home: 1, away: 0, phase: 'normal', ts: 100 }]
  assert.deepStrictEqual(
    { home: lb.getCurrentScore(oneReporter).home, away: lb.getCurrentScore(oneReporter).away },
    { home: 1, away: 0 }
  )

  // 2 reporters disagreeing: latest one (by ts) wins
  const twoDisagree = [
    { type: 'score_update', peerId: 'a', home: 1, away: 0, phase: 'normal', ts: 100 },
    { type: 'score_update', peerId: 'b', home: 2, away: 0, phase: 'normal', ts: 200 }
  ]
  const twoResult = lb.getCurrentScore(twoDisagree)
  assert.strictEqual(twoResult.home, 2, 'latest of exactly 2 disagreeing reports wins')
  assert.strictEqual(twoResult.away, 0)

  // 3+ reporters: majority wins even over a more recent lone dissenter
  const threeMajority = [
    { type: 'score_update', peerId: 'a', home: 2, away: 1, phase: 'normal', ts: 100 },
    { type: 'score_update', peerId: 'b', home: 2, away: 1, phase: 'normal', ts: 110 },
    { type: 'score_update', peerId: 'c', home: 3, away: 1, phase: 'normal', ts: 500 } // newest, but a minority of 1
  ]
  const majorityResult = lb.getCurrentScore(threeMajority)
  assert.strictEqual(majorityResult.home, 2, 'majority (2 of 3) beats a single more recent dissenting report')
  assert.strictEqual(majorityResult.away, 1)
  assert.strictEqual(majorityResult.reporterCount, 2)
  assert.strictEqual(majorityResult.totalReporters, 3)

  // each peer only gets one vote: their latest report, not every report they've ever sent
  const selfCorrection = [
    { type: 'score_update', peerId: 'a', home: 1, away: 0, phase: 'normal', ts: 100 },
    { type: 'score_update', peerId: 'a', home: 1, away: 1, phase: 'normal', ts: 200 }, // a corrects themselves
    { type: 'score_update', peerId: 'b', home: 1, away: 1, phase: 'normal', ts: 150 }
  ]
  const correctedResult = lb.getCurrentScore(selfCorrection)
  assert.strictEqual(correctedResult.home, 1)
  assert.strictEqual(correctedResult.away, 1)
  assert.strictEqual(correctedResult.totalReporters, 2, 'peer a only counts once, using their latest report')

  assert.strictEqual(lb.isMatchEnded([]), false)
  assert.strictEqual(lb.isMatchEnded([{ type: 'match_ended', peerId: 'a', ts: 1 }]), true)

  console.log('✔ crowd sourced current-score consensus logic verified (latest-of-2, majority-of-3+, one vote per peer)')
}

// Thin RPC wrapper around a forked child running core-logic-worker.js.
class PeerHandle {
  constructor(child) {
    this.child = child
    this.nextId = 1
    this.pending = new Map()
    this.peers = 0
    child.on('message', (msg) => {
      if (msg.event === 'peers') this.peers = msg.count
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        if (msg.ok) resolve(msg)
        else reject(new Error(msg.error))
      }
    })
  }

  call(cmd, extra = {}) {
    const id = this.nextId++
    this.child.send({ id, cmd, ...extra })
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }))
  }

  join(storageDir, topicHex, kickoffTime) {
    return this.call('join', { storageDir, topicHex, kickoffTime }).then((r) => r.peerId)
  }

  getState() {
    return this.call('getState').then((r) => r.state)
  }

  submitPrediction(args) {
    return this.call('submitPrediction', { args })
  }

  sendChat(args) {
    return this.call('sendChat', { args })
  }

  reportScore(args) {
    return this.call('reportScore', { args })
  }

  endMatch() {
    return this.call('endMatch')
  }

  close() {
    return this.call('close').catch(() => {})
  }
}

async function testP2PSync() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'terrace-test-'))
  // Far-future kickoff so the P2P assertions below never race a real clock.
  // Both peers derive the topic from the same matchId (as fixtures.js
  // would), and both are handed the same kickoffTime directly -- there is
  // no "creator" writing a bootstrap entry for the other side to wait on.
  const matchId = 'test-arsenal-chelsea'
  const kickoffTime = Date.now() + 10 * 60 * 1000
  const topic = topicFromMatchId(matchId)

  const peerA = new Room({ storageDir: path.join(tmpRoot, 'peerA'), keyPair: crypto.keyPair(), topic, kickoffTime })
  const peerB = new PeerHandle(fork(path.join(__dirname, 'core-logic-worker.js')))

  console.log('Joining swarm as peer A:', peerA.peerId.slice(0, 8))
  await peerA.join()

  console.log('Joining swarm as peer B (separate child process)...')
  const peerBId = await peerB.join(path.join(tmpRoot, 'peerB'), topic.toString('hex'), kickoffTime)
  console.log('Peer B peerId:', peerBId.slice(0, 8))

  console.log('Waiting for peers to discover each other via Hyperswarm (can take up to ~90s over real NAT)...')
  await waitFor(() => peerA.connections > 0 && peerB.peers > 0)
  console.log('✔ Peers connected. A sees', peerA.connections, 'peer(s), B sees', peerB.peers, 'peer(s)')

  assert.strictEqual(peerA.isLocked(), false)
  assert.strictEqual((await peerB.getState()).locked, false)
  console.log('✔ both peers agree on the (unlocked) prediction state from the shared kickoffTime, with no bootstrap entry needed')

  // --- predictions ---
  await peerA.submitPrediction({ home: 2, away: 1 }) // error will be 0 (exact)
  await peerB.submitPrediction({ home: 1, away: 1 }) // error will be 1

  await waitFor(() => peerA.entries.filter((e) => e.type === 'prediction').length >= 2)
  await waitFor(async () => (await peerB.getState()).predictionCount >= 2)
  console.log('✔ predictions replicated both ways')

  // --- chat, interleaved ---
  await peerA.sendChat('good luck everyone')
  await peerB.sendChat('come on chelsea')
  await waitFor(() => peerA.getChat().length >= 2)
  await waitFor(async () => (await peerB.getState()).chat.length >= 2)
  assert.strictEqual(peerA.getChat().length, (await peerB.getState()).chat.length)
  console.log('✔ chat messages replicated both ways, feeds match:', peerA.getChat().length, 'messages')

  // --- current score is crowd sourced: peer A misreports it, peer B corrects
  // it. Exactly 2 reporters disagreeing => the latest (peer B's) should win.
  await peerA.reportScore({ home: 2, away: 0, phase: 'normal' })
  await waitFor(async () => !!(await peerB.getState()).currentScore)
  await peerB.reportScore({ home: 2, away: 1, phase: 'normal' })
  await waitFor(() => peerA.getCurrentScore() && peerA.getCurrentScore().away === 1)
  await waitFor(async () => (await peerB.getState()).currentScore.away === 1)
  assert.strictEqual(peerA.getCurrentScore().home, 2, 'the latest of 2 disagreeing reports wins the consensus')
  assert.strictEqual(peerA.getCurrentScore().away, 1)
  console.log('✔ current score consensus resolved the same way on both peers (latest of 2 disagreeing reports)')

  // --- either peer can end the match; the leaderboard uses whatever the
  // current consensus score is at that moment ---
  await peerA.endMatch()
  await waitFor(() => peerA.isMatchEnded())
  await waitFor(async () => (await peerB.getState()).matchEnded)
  await waitFor(() => !!peerA.getLeaderboard())
  await waitFor(async () => !!(await peerB.getState()).leaderboard)

  const boardA = peerA.getLeaderboard()
  const boardB = (await peerB.getState()).leaderboard

  assert.deepStrictEqual(
    boardA.map((r) => ({ peerId: r.peerId, error: r.error, rank: r.rank })),
    boardB.map((r) => ({ peerId: r.peerId, error: r.error, rank: r.rank })),
    'both peers must compute an identical leaderboard from the same merged log'
  )

  assert.strictEqual(boardA[0].peerId, peerA.peerId, 'peer A predicted the exact score and should rank #1')
  assert.strictEqual(boardA[0].error, 0)
  assert.strictEqual(boardA[0].isWinner, true)
  assert.strictEqual(boardA[1].peerId, peerBId)
  assert.strictEqual(boardA[1].error, 1)
  assert.strictEqual(boardA[1].isWinner, false)

  console.log('✔ leaderboard computed independently and identically on both real P2P peers (2 separate OS processes):')
  for (const row of boardA) {
    console.log(`   #${row.rank} ${row.peerId.slice(0, 8)}… guessed ${row.prediction.home}-${row.prediction.away} (error ${row.error})${row.isWinner ? '  <-- WINNER' : ''}`)
  }

  await peerB.close()
  await peerA.close()
  fs.rmSync(tmpRoot, { recursive: true, force: true })
}

async function main() {
  testLockLogicIsPure()
  testLeaderboardTiesAndRanking()
  testFixtureLifecycleIsPure()
  testCurrentScoreConsensusIsPure()
  await testP2PSync()
  console.log('\nALL TESTS PASSED')
  process.exit(0)
}

main().catch((err) => {
  console.error('\nTEST FAILED:', err)
  process.exit(1)
})
