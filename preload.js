const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('terrace', {
  getIdentity: () => ipcRenderer.invoke('identity:get'),
  listFixtures: () => ipcRenderer.invoke('fixtures:list'),
  enterRoom: (matchId) => ipcRenderer.invoke('room:enter', { matchId }),
  submitPrediction: (opts) => ipcRenderer.invoke('room:submitPrediction', opts),
  sendChat: (text, replyToTs) => ipcRenderer.invoke('room:sendChat', { text, replyToTs }),
  react: (opts) => ipcRenderer.invoke('room:react', opts),
  reportScore: (opts) => ipcRenderer.invoke('room:reportScore', opts),
  endMatch: () => ipcRenderer.invoke('room:endMatch'),
  setTyping: (isTyping) => ipcRenderer.invoke('room:setTyping', isTyping),
  getState: () => ipcRenderer.invoke('room:getState'),
  leaveRoom: () => ipcRenderer.invoke('room:leave'),
  onState: (callback) => {
    const handler = (_event, state) => callback(state)
    ipcRenderer.on('room:state', handler)
    return () => ipcRenderer.removeListener('room:state', handler)
  },
  onTyping: (callback) => {
    const handler = (_event, msg) => callback(msg)
    ipcRenderer.on('room:typing', handler)
    return () => ipcRenderer.removeListener('room:typing', handler)
  }
})
