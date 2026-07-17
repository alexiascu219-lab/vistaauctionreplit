const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (patch) => ipcRenderer.invoke('config:set', patch),
  toggleEngine: (on) => ipcRenderer.invoke('engine:toggle', on),
  testPrint: (cart) => ipcRenderer.invoke('print:test', cart),
  listDesigns: () => ipcRenderer.invoke('designs:list'),
  pickFolder: () => ipcRenderer.invoke('dialog:pickFolder'),
  openPath: (p) => ipcRenderer.invoke('shell:open', p),
  fetchQueue: () => ipcRenderer.invoke('queue:fetch'),
  onLog: (cb) => ipcRenderer.on('engine:log', (_e, line) => cb(line)),
  onStatus: (cb) => ipcRenderer.on('engine:status', (_e, s) => cb(s)),
  onQueue: (cb) => ipcRenderer.on('queue:update', (_e, jobs) => cb(jobs)),
});
