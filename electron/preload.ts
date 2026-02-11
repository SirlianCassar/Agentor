import { clipboard, contextBridge, ipcRenderer } from 'electron'

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
}

contextBridge.exposeInMainWorld('typefast', api)
