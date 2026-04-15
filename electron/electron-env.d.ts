/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    APP_ROOT: string
    VITE_PUBLIC: string
  }
}

declare const __AUTO_UPDATE_GH_TOKEN__: string

interface Window {
  agentor: {
    getUpdateStatus: () => Promise<{
      phase: string
      message: string
      version?: string
      progress?: number
      checkedAt?: string
    }>
    checkForUpdatesNow: () => Promise<{ ok: boolean; reason: string }>
    installDownloadedUpdate: () => Promise<{ ok: boolean; reason: string }>
    onUpdateStatus: (
      callback: (status: {
        phase: string
        message: string
        version?: string
        progress?: number
        checkedAt?: string
      }) => void,
    ) => () => void
    loadData: () => Promise<unknown>
    saveData: (data: unknown) => Promise<boolean>
    exportJson: (data: unknown) => Promise<{ canceled: boolean }>
    exportHistory: (text: string) => Promise<{ canceled: boolean }>
    importJson: () => Promise<{ canceled: boolean; data?: unknown; error?: string }>
    copyText: (text: string, html?: string) => boolean
    openExternal: (url: string) => Promise<boolean>
    openProcedure: () => Promise<boolean>
  }
}
