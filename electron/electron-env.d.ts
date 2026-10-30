/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    APP_ROOT: string
    VITE_PUBLIC: string
  }
}


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
    onDataChanged?: (callback: (data: unknown) => void) => () => void
    detachDashboard?: (kind: string) => Promise<boolean>
    attachDashboard?: (kind: string) => Promise<boolean>
    listDetachedDashboards?: () => Promise<string[]>
    onDetachedDashboards?: (callback: (kinds: unknown) => void) => () => void
    onAttachRequest?: (callback: (kind: unknown) => void) => () => void
    sendToMain?: (action: unknown) => Promise<boolean>
    onMainAction?: (callback: (action: unknown) => void) => () => void
    getCaseContext?: () => Promise<unknown>
    setCaseFieldManual?: (caseId: string, key: string, value: string) => Promise<boolean>
    confirmCaseField?: (caseId: string, key: string) => Promise<boolean>
    clearCaseContext?: () => Promise<boolean>
    onCaseContext?: (callback: (context: unknown) => void) => () => void
    getBridgeStatus?: () => Promise<unknown>
    getBridgeToken?: () => Promise<string>
    setBridgeEnabled?: (enabled: boolean) => Promise<unknown>
    regenerateBridgeToken?: () => Promise<string>
    onBridgeStatus?: (callback: (status: unknown) => void) => () => void
  }
}
