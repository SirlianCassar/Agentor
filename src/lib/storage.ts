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

export async function loadData(): Promise<AppData> {
  const raw = (await window.speedmail.loadData()) as Partial<AppData>
  return normalizeData(raw, defaultData)
}

export async function saveData(data: AppData) {
  return window.speedmail.saveData(data)
}

export async function exportJson(data: AppData) {
  return window.speedmail.exportJson(createExportData(data, defaultData))
}

export async function exportHistory(text: string) {
  return window.speedmail.exportHistory(text)
}

export async function importJson() {
  return window.speedmail.importJson()
}

export async function copyText(text: string, html?: string) {
  if (window.speedmail?.copyText) {
    try {
      return window.speedmail.copyText(text, html)
    } catch {
      void window.speedmail
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
  return window.speedmail.openExternal(url)
}

export function openProcedure() {
  if (window.speedmail?.openProcedure) {
    return window.speedmail.openProcedure()
  }
  const popup = window.open(`${window.location.pathname}#procedure`, '_blank', 'width=980,height=720')
  if (!popup) return false
  return true
}

export function getUpdateStatus(): Promise<UpdateStatus> {
  return window.speedmail.getUpdateStatus() as Promise<UpdateStatus>
}

export function checkForUpdatesNow(): Promise<{ ok: boolean; reason: string }> {
  return window.speedmail.checkForUpdatesNow()
}

export function installDownloadedUpdate(): Promise<{ ok: boolean; reason: string }> {
  return window.speedmail.installDownloadedUpdate()
}

export function onUpdateStatus(callback: (status: UpdateStatus) => void) {
  return window.speedmail.onUpdateStatus((status) => callback(status as UpdateStatus))
}
