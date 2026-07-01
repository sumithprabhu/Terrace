const { EventEmitter } = require('events')
const path = require('path')
const Hypercore = require('hypercore')
const Hyperswarm = require('hyperswarm')
const b4a = require('b4a')

const lb = require('./leaderboard')

// A Room is one match's shared append-only log, spread across N Hypercores
// (one per peer -- Hypercore is single-writer). There is no server merging
// these logs: every peer replicates every other peer's core directly over
// Hyperswarm and merges the entries locally by timestamp. The current score
// is crowd sourced (see lib/leaderboard.js's consensus rule) and every peer
// computes the same leaderboard independently from whatever that consensus
// currently is.
//
// The room's topic and kickoffTime come from a bundled fixture (see
// fixtures.js), not from a bootstrap log entry someone has to write first --
// so there's no "creator" and nothing to race: the room already exists the
// moment the match does, and joining it is just replicating the same topic
// everyone else derives from the same fixture data.
//
// Peer identity trick: each peer's persistent Ed25519 keypair (see
// identity.js) is used BOTH as its Hyperswarm DHT identity AND -- in
// Hypercore's "compat" mode, where a core's public key IS the raw signer
// keypair's public key rather than a derived manifest hash -- as its
// Hypercore writer keypair. That means the public key a peer sees on
// `swarm.on('connection', (socket, info) => ...)` IS that peer's Hypercore
// public key, so no extra handshake/gossip protocol is needed to discover
// which cores to replicate: `new Hypercore(storage, info.publicKey, { compat: true })`
// opens exactly that peer's core, read-only.
class Room extends EventEmitter {
  constructor({ storageDir, keyPair, topic, kickoffTime }) {
    super()
    this.storageDir = storageDir
    this.keyPair = keyPair
    this.peerId = b4a.toString(keyPair.publicKey, 'hex')
    this.topic = topic
    this.kickoffTime = kickoffTime

    this.swarm = null
    this.localCore = null
    this.entries = []
    this.connections = 0

    this._watchedCores = new Set()
  }

  async join() {
    this.localCore = new Hypercore(path.join(this.storageDir, 'local'), {
      keyPair: this.keyPair,
      compat: true
    })
    await this.localCore.ready()
    this._watchCore(this.localCore)

    this.swarm = new Hyperswarm({ keyPair: this.keyPair })

    this.swarm.on('connection', (socket, info) => {
      this.connections++
      this.emit('peers', this.connections)
      const remotePeerId = b4a.toString(info.publicKey, 'hex')
      console.log(`[terrace] peer connected: ${remotePeerId.slice(0, 8)}… (total: ${this.connections})`)

      // Multiplex both our local core and the remote peer's core onto ONE
      // replication stream over this connection.
      const stream = this.localCore.replicate(info.client)
      stream.pipe(socket).pipe(stream)

      const remoteCore = new Hypercore(path.join(this.storageDir, `peer-${remotePeerId}`), info.publicKey, {
        compat: true
      })
      remoteCore.replicate(stream)
      this._watchCore(remoteCore)

      socket.on('close', () => {
        this.connections = Math.max(0, this.connections - 1)
        this.emit('peers', this.connections)
        console.log(`[terrace] peer disconnected (total: ${this.connections})`)
      })
      socket.on('error', (err) => console.log('[terrace] connection error:', err.message))
    })

    // Deliberately not awaiting discovery.flushed() here: DHT announce/lookup
    // over the public internet can take anywhere from ~1s to well over a
    // minute depending on NAT conditions. join() only needs the local core
    // ready and the swarm listening -- the UI transitions to the room screen
    // immediately and the peer count / connections update live in the
    // background as Hyperswarm finds peers.
    this.swarm.join(this.topic, { server: true, client: true })

    return this
  }

  _watchCore(core) {
    const keyHex = b4a.toString(core.key, 'hex')
    if (this._watchedCores.has(keyHex)) return
    this._watchedCores.add(keyHex)

    core.ready().then(() => {
      const stream = core.createReadStream({ start: 0, live: true })
      stream.on('data', (block) => {
        try {
          const entry = JSON.parse(b4a.toString(block, 'utf8'))
          this.entries.push(entry)
          this.emit('entry', entry)
        } catch (err) {
          console.log('[terrace] bad entry, skipping:', err.message)
        }
      })
      stream.on('error', (err) => console.log('[terrace] read stream error:', err.message))
    })
  }

  async _append(partialEntry) {
    const entry = { ...partialEntry, peerId: this.peerId, ts: Date.now() }
    await this.localCore.append(b4a.from(JSON.stringify(entry)))
    return entry
  }

  submitPrediction({ home, away }) {
    return this._append({ type: 'prediction', prediction: { home, away } })
  }

  sendChat(text) {
    return this._append({ type: 'chat', text })
  }

  // The current score is crowd sourced and can change throughout the match
  // (see lib/leaderboard.js for the consensus rule) -- this just adds one
  // more report to the log, it never overwrites anyone else's.
  reportScore({ home, away, phase, penalties }) {
    return this._append({ type: 'score_update', home, away, phase, penalties: penalties || null })
  }

  endMatch() {
    return this._append({ type: 'match_ended' })
  }

  getChat() {
    return lb.getChat(this.entries)
  }

  getCurrentScore() {
    return lb.getCurrentScore(this.entries)
  }

  isMatchEnded() {
    return lb.isMatchEnded(this.entries)
  }

  getLeaderboard() {
    return lb.computeLeaderboard(this.entries)
  }

  isLocked(now = Date.now()) {
    return lb.isLocked(this.kickoffTime, now)
  }

  hasSubmittedPrediction(peerId = this.peerId) {
    return this.entries.some((e) => e.type === 'prediction' && e.peerId === peerId)
  }

  async close() {
    if (this.swarm) await this.swarm.destroy().catch(() => {})
    if (this.localCore) await this.localCore.close().catch(() => {})
  }
}

module.exports = Room
