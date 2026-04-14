import { clipboard, contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'

const api = {
  loadData: () => ipcRenderer.invoke('storage:load'),
  saveData: (data: unknown) => ipcRenderer.invoke('storage:save', data),
  exportJson: (data: unknown) => ipcRenderer.invoke('storage:export-json', data),
  exportHistory: (text: string) => ipcRenderer.invoke('storage:export-history', text),
  importJson: () => ipcRenderer.invoke('storage:import-json'),
  copyText: (text: string, html?: string) => {
    if (html) {
      clipboard.write({ text, html })
    } else {
      clipboard.writeText(text)
    }
    return true
  },
  openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),
  openProcedure: () => ipcRenderer.invoke('procedure:open'),
  getUpdateStatus: () => ipcRenderer.invoke('updates:get-status'),
  checkForUpdatesNow: () => ipcRenderer.invoke('updates:check-now'),
  installDownloadedUpdate: () => ipcRenderer.invoke('updates:install-downloaded'),
  onUpdateStatus: (callback: (status: unknown) => void) => {
    const listener = (_event: IpcRendererEvent, payload: unknown) => callback(payload)
    ipcRenderer.on('updates:status', listener)
    return () => ipcRenderer.removeListener('updates:status', listener)
  },
}

contextBridge.exposeInMainWorld('agentor', api)
