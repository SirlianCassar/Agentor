import type { AppData } from './types'
import { defaultData } from './defaults'
import { createExportData, normalizeData } from './utils'

export type UpdatePhase =
  | 'idle'
  | 'disabled'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'not-available'
  | 'error'

export type UpdateStatus = {
  phase: UpdatePhase
  message: string
  version?: string
  progress?: number
  checkedAt?: string
}

const browserStorageKey = 'agentor:fallback-data'
const disabledUpdateStatus: UpdateStatus = {
  phase: 'disabled',
  message: '',
}

function getBridge() {
  return window.agentor
}

export async function loadData(): Promise<AppData> {
  const bridge = getBridge()
  if (!bridge?.loadData) {
    const raw = window.localStorage.getItem(browserStorageKey)
    if (!raw) return normalizeData({}, defaultData)
    try {
      return normalizeData(JSON.parse(raw) as Partial<AppData>, defaultData)
    } catch {
      return normalizeData({}, defaultData)
    }
  }

  const raw = (await bridge.loadData()) as Partial<AppData>
  return normalizeData(raw, defaultData)
}

export async function saveData(data: AppData) {
  const bridge = getBridge()
  if (!bridge?.saveData) {
    window.localStorage.setItem(
      browserStorageKey,
      JSON.stringify(createExportData(data, defaultData)),
    )
    return true
  }

  return bridge.saveData(data)
}

export async function exportJson(data: AppData) {
  const bridge = getBridge()
  if (!bridge?.exportJson) return { canceled: true }
  return bridge.exportJson(createExportData(data, defaultData))
}

export async function exportHistory(text: string) {
  const bridge = getBridge()
  if (!bridge?.exportHistory) return { canceled: true }
  return bridge.exportHistory(text)
}

export async function importJson() {
  const bridge = getBridge()
  if (!bridge?.importJson) return { canceled: true }
  return bridge.importJson()
}

export async function copyText(text: string, html?: string) {
  if (window.agentor?.copyText) {
    try {
      return window.agentor.copyText(text, html)
    } catch {
      void window.agentor
    }
  }

  if (html && navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
    try {
      const item = new ClipboardItem({
        'text/plain': new Blob([text], { type: 'text/plain' }),
        'text/html': new Blob([html], { type: 'text/html' }),
      })
      await navigator.clipboard.write([item])
      return true
    } catch {
      void navigator.clipboard
    }
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      void navigator.clipboard
    }
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', 'true')
    textarea.style.position = 'fixed'
    textarea.style.top = '-9999px'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const result = document.execCommand('copy')
    document.body.removeChild(textarea)
    return result
  } catch {
    return false
  }
}

export function openExternal(url: string) {
  const bridge = getBridge()
  if (!bridge?.openExternal) {
    window.open(url, '_blank', 'noopener,noreferrer')
    return Promise.resolve(true)
  }

  return bridge.openExternal(url)
}

export function openProcedure() {
  const bridge = getBridge()
  if (bridge?.openProcedure) {
    return bridge.openProcedure()
  }
  const popup = window.open(`${window.location.pathname}#procedure`, '_blank', 'width=980,height=720')
  if (!popup) return false
  return true
}

export function getUpdateStatus(): Promise<UpdateStatus> {
  const bridge = getBridge()
  if (!bridge?.getUpdateStatus) return Promise.resolve(disabledUpdateStatus)
  return bridge.getUpdateStatus() as Promise<UpdateStatus>
}

export function checkForUpdatesNow(): Promise<{ ok: boolean; reason: string }> {
  const bridge = getBridge()
  if (!bridge?.checkForUpdatesNow) return Promise.resolve({ ok: false, reason: 'disabled' })
  return bridge.checkForUpdatesNow()
}

export function installDownloadedUpdate(): Promise<{ ok: boolean; reason: string }> {
  const bridge = getBridge()
  if (!bridge?.installDownloadedUpdate) {
    return Promise.resolve({ ok: false, reason: 'disabled' })
  }
  return bridge.installDownloadedUpdate()
}

export function onUpdateStatus(callback: (status: UpdateStatus) => void) {
  const bridge = getBridge()
  if (!bridge?.onUpdateStatus) return () => {}
  return bridge.onUpdateStatus((status) => callback(status as UpdateStatus))
}
