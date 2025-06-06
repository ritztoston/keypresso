const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startShift: () => ipcRenderer.invoke('start-shift'),
  stopShift: () => ipcRenderer.invoke('stop-shift'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  getStartOnBoot: () => ipcRenderer.invoke('get-start-on-boot'),
  setStartOnBoot: (enabled) => ipcRenderer.invoke('set-start-on-boot', enabled),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  getStartMinimized: () => ipcRenderer.invoke('get-start-minimized'),
  setStartMinimized: (enabled) => ipcRenderer.invoke('set-start-minimized', enabled),
  onShiftStateUpdated: (callback) => ipcRenderer.on('shift-state-updated', (event, isRunning) => callback(isRunning)),
  onShiftStatusUpdate: (callback) => ipcRenderer.on('shift-status-update', (event, isActive) => callback(isActive)),
});
