import { clipboard, contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'

function subscribe(channel: string, callback: (payload: unknown) => void) {
  const listener = (_event: IpcRendererEvent, payload: unknown) => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}

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
  onUpdateStatus: (callback: (status: unknown) => void) => subscribe('updates:status', callback),
  getCaseContext: () => ipcRenderer.invoke('case-context:get'),
  setCaseFieldManual: (caseId: string, key: string, value: string) =>
    ipcRenderer.invoke('case-context:set-manual', caseId, key, value),
  confirmCaseField: (caseId: string, key: string) =>
    ipcRenderer.invoke('case-context:confirm', caseId, key),
  clearCaseContext: () => ipcRenderer.invoke('case-context:clear'),
  onCaseContext: (callback: (context: unknown) => void) =>
    subscribe('case-context:changed', callback),
  getBridgeStatus: () => ipcRenderer.invoke('bridge:get-status'),
  getBridgeToken: () => ipcRenderer.invoke('bridge:get-token'),
  setBridgeEnabled: (enabled: boolean) => ipcRenderer.invoke('bridge:set-enabled', enabled),
  regenerateBridgeToken: () => ipcRenderer.invoke('bridge:regenerate-token'),
  onBridgeStatus: (callback: (status: unknown) => void) => subscribe('bridge:status', callback),
}

contextBridge.exposeInMainWorld('agentor', api)
