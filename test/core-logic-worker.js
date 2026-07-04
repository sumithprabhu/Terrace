// Child process for core-logic.test.js. Runs peer B's Room in its own OS
// process (two independent Hyperswarm/DHT nodes in the same Node process
// were found to reliably fail to discover each other in this environment --
// a real, reproducible characteristic, not a code bug -- so the automated
// test uses two real processes instead, same as the actual demo does with
// two terminals/two Electron windows). Talks to the parent via Node's
// built-in fork() IPC channel.

const crypto = require('hypercore-crypto')
const Room = require('../lib/room')

let room = null

process.on('message', async (msg) => {
  try {
    if (msg.cmd === 'join') {
      room = new Room({
        storageDir: msg.storageDir,
        keyPair: crypto.keyPair(),
        topic: Buffer.from(msg.topicHex, 'hex'),
        kickoffTime: msg.kickoffTime
      })
      room.on('entry', () => process.send({ event: 'entry' }))
      room.on('peers', () => process.send({ event: 'peers', count: room.connections }))
      await room.join()
      process.send({ id: msg.id, ok: true, peerId: room.peerId })
      return
    }

    if (msg.cmd === 'getState') {
      process.send({
        id: msg.id,
        ok: true,
        state: {
          peerId: room.peerId,
          connections: room.connections,
          chat: room.getChat(),
          currentScore: room.getCurrentScore(),
          matchEnded: room.isMatchEnded(),
          leaderboard: room.getLeaderboard(),
          locked: room.isLocked(),
          predictionCount: room.entries.filter((e) => e.type === 'prediction').length
        }
      })
      return
    }

    if (msg.cmd === 'submitPrediction') {
      await room.submitPrediction(msg.args)
      process.send({ id: msg.id, ok: true })
      return
    }

    if (msg.cmd === 'sendChat') {
      await room.sendChat(msg.args)
      process.send({ id: msg.id, ok: true })
      return
    }

    if (msg.cmd === 'reportScore') {
      await room.reportScore(msg.args)
      process.send({ id: msg.id, ok: true })
      return
    }

    if (msg.cmd === 'endMatch') {
      await room.endMatch()
      process.send({ id: msg.id, ok: true })
      return
    }

    if (msg.cmd === 'close') {
      await room.close()
      process.send({ id: msg.id, ok: true })
      process.exit(0)
    }
  } catch (err) {
    process.send({ id: msg.id, ok: false, error: err.message })
  }
})

process.send({ event: 'ready' })
