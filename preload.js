const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('terrace', {
  getIdentity: () => ipcRenderer.invoke('identity:get'),
  listFixtures: () => ipcRenderer.invoke('fixtures:list'),
  enterRoom: (matchId) => ipcRenderer.invoke('room:enter', { matchId }),
  submitPrediction: (opts) => ipcRenderer.invoke('room:submitPrediction', opts),
  sendChat: (text) => ipcRenderer.invoke('room:sendChat', text),
  reportScore: (opts) => ipcRenderer.invoke('room:reportScore', opts),
  endMatch: () => ipcRenderer.invoke('room:endMatch'),
  getState: () => ipcRenderer.invoke('room:getState'),
  leaveRoom: () => ipcRenderer.invoke('room:leave'),
  onState: (callback) => {
    const handler = (_event, state) => callback(state)
    ipcRenderer.on('room:state', handler)
    return () => ipcRenderer.removeListener('room:state', handler)
  }
})
