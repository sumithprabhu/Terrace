const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const crypto = require('crypto')

const Room = require('./lib/room')
const { loadIdentity } = require('./lib/identity')
const { topicFromMatchId } = require('./lib/topic')
const { getFixtures, getFixture, getStatus, isJoinable } = require('./lib/fixtures')

// Allow multiple instances of this app to run side by side on one machine
// (e.g. for a 2-peer demo) without colliding on Electron's userData profile
// lock or on Hypercore storage/identity files. Each instance gets its own
// isolated profile dir, keyed by --instance=<name> or $TERRACE_INSTANCE,
// falling back to a fresh random id so a single normal run needs no flags.
const instanceArg = process.argv.find((a) => a.startsWith('--instance='))
const instanceId = (instanceArg && instanceArg.split('=')[1]) || process.env.TERRACE_INSTANCE || crypto.randomBytes(3).toString('hex')
app.setPath('userData', path.join(app.getPath('userData'), `terrace-${instanceId}`))

let win = null
let room = null
let currentFixture = null

function sendState() {
  if (!win || !room) return
  win.webContents.send('room:state', buildState())
}

function buildState() {
  if (!room || !currentFixture) return null
  return {
    peerId: room.peerId,
    connections: room.connections,
    fixture: currentFixture,
    chat: room.getChat(),
    currentScore: room.getCurrentScore(),
    matchEnded: room.isMatchEnded(),
    leaderboard: room.getLeaderboard(),
    locked: room.isLocked(),
    hasSubmitted: room.hasSubmittedPrediction(),
    predictionCount: room.entries.filter((e) => e.type === 'prediction').length
  }
}

async function teardownRoom() {
  if (room) {
    await room.close().catch(() => {})
    room = null
    currentFixture = null
  }
}

ipcMain.handle('identity:get', async () => {
  const identityFile = path.join(app.getPath('userData'), 'identity.json')
  const keyPair = loadIdentity(identityFile)
  return { peerId: keyPair.publicKey.toString('hex') }
})

ipcMain.handle('fixtures:list', async () => {
  const now = Date.now()
  const fixtures = await getFixtures()
  return fixtures.map((f) => ({ ...f, status: getStatus(f, now) }))
})

// There is no "create room" -- a room exists automatically the moment a
// fixture does. Entering just means: look up the fixture (from the live
// feed, or the bundled fallback list) by its stable matchId, confirm we're
// inside its join window, and join the Hyperswarm topic derived from that
// matchId.
ipcMain.handle('room:enter', async (_event, { matchId }) => {
  const fixture = await getFixture(matchId)
  if (!fixture) throw new Error('Unknown match')
  if (!isJoinable(fixture)) throw new Error(`This match is ${getStatus(fixture)} and isn't joinable right now`)

  await teardownRoom()

  const identityFile = path.join(app.getPath('userData'), 'identity.json')
  const keyPair = loadIdentity(identityFile)
  const topic = topicFromMatchId(matchId)
  const storageDir = path.join(app.getPath('userData'), 'rooms', matchId)

  room = new Room({ storageDir, keyPair, topic, kickoffTime: fixture.kickoffTime })
  currentFixture = fixture
  room.on('entry', () => sendState())
  room.on('peers', () => sendState())

  await room.join()
  sendState()
  return { fixture }
})

ipcMain.handle('room:submitPrediction', async (_event, { home, away }) => {
  if (!room) throw new Error('Not in a room')
  if (room.isLocked()) throw new Error('Predictions are locked')
  if (room.hasSubmittedPrediction()) throw new Error('Prediction already submitted')
  await room.submitPrediction({ home, away })
  return true
})

ipcMain.handle('room:sendChat', async (_event, text) => {
  if (!room) throw new Error('Not in a room')
  await room.sendChat(text)
  return true
})

ipcMain.handle('room:reportScore', async (_event, { home, away, phase, penalties }) => {
  if (!room) throw new Error('Not in a room')
  await room.reportScore({ home, away, phase, penalties })
  return true
})

ipcMain.handle('room:endMatch', async () => {
  if (!room) throw new Error('Not in a room')
  await room.endMatch()
  return true
})

ipcMain.handle('room:getState', async () => buildState())

ipcMain.handle('room:leave', async () => {
  await teardownRoom()
})

function createWindow() {
  win = new BrowserWindow({
    width: 980,
    height: 720,
    title: `Terrace — instance ${instanceId}`,
    icon: path.join(__dirname, 'renderer', 'assets', 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'))
}

app.whenReady().then(() => {
  console.log(`[terrace] starting instance "${instanceId}", userData=${app.getPath('userData')}`)

  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(path.join(__dirname, 'renderer', 'assets', 'logo.png'))
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', async () => {
  await teardownRoom()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', async () => {
  await teardownRoom()
})
