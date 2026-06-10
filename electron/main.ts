import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  shell,
  Menu,
  type OpenDialogOptions,
  type Rectangle,
  type SaveDialogOptions,
} from 'electron'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import { autoUpdater } from 'electron-updater'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let procedureWin: BrowserWindow | null

const DATA_FILE = () => path.join(app.getPath('userData'), 'agentor-data.json')
const WINDOW_STATE_FILE = () => path.join(app.getPath('userData'), 'window-state.json')
const LEGACY_APP_DATA_DIR_NAMES = ['SpeedMail', 'TypeFast', 'MailOTron', 'Mailotron']
const LEGACY_DATA_FILE_NAMES = ['speedmail-data.json', 'typefast-data.json', 'mailotron-data.json']
const defaultData = {
  version: 2,
  categories: [],
  snippets: [],
  templates: [],
  taskTemplates: [],
  procedures: [],
  notes: '',
  emailDraft: '',
  taskDraft: '',
  history: [],
  settings: {
    language: 'fr',
    zoom: 1,
    textScale: 1,
    editorLineHeight: 1.6,
    historyOnCopy: true,
    historyLimit: 200,
    autoFocusEditor: true,
    defaultSnippetInsertMode: 'line',
    snippetCategoryDisplay: 'dropdown',
    customerPortalCodes: [],
    dashboardProducts: [],
    dashboardDecorations: [],
    dashboardReminders: '',
    taskSectionNames: ['Current Contact', 'Previous Actions / History', 'Next Steps', 'Internal Notes'],
    mailTemplateCategories: [],
    taskTemplateCategories: [],
  },
}

type SavedWindowState = {
  bounds: Rectangle
  isMaximized: boolean
}

type WindowState = {
  main?: SavedWindowState
  procedure?: SavedWindowState
}

function copyFirstExistingFile(targetPath: string, sourcePaths: string[]) {
  if (fs.existsSync(targetPath)) return null
  for (const sourcePath of sourcePaths) {
    if (!sourcePath || sourcePath === targetPath) continue
    if (!fs.existsSync(sourcePath)) continue
    try {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true })
      fs.copyFileSync(sourcePath, targetPath)
      return sourcePath
    } catch (error) {
      console.warn('[storage-migration] copy failed', sourcePath, '->', targetPath, error)
    }
  }
  return null
}

function migrateLegacyStorageIfNeeded() {
  const userDataDir = app.getPath('userData')
  const appDataDir = app.getPath('appData')
  const legacyDirs = LEGACY_APP_DATA_DIR_NAMES.map((name) => path.join(appDataDir, name)).filter(
    (dir) => dir !== userDataDir,
  )
  const dataCandidates = [
    ...LEGACY_DATA_FILE_NAMES.map((fileName) => path.join(userDataDir, fileName)),
    ...legacyDirs.flatMap((dir) =>
      LEGACY_DATA_FILE_NAMES.map((fileName) => path.join(dir, fileName)),
    ),
  ]
  const windowStateCandidates = legacyDirs.map((dir) => path.join(dir, 'window-state.json'))
  const copiedDataFrom = copyFirstExistingFile(DATA_FILE(), dataCandidates)
  const copiedWindowStateFrom = copyFirstExistingFile(WINDOW_STATE_FILE(), windowStateCandidates)

  if (copiedDataFrom) {
    console.log(`[storage-migration] data imported from ${copiedDataFrom}`)
  }
  if (copiedWindowStateFrom) {
    console.log(`[storage-migration] window state imported from ${copiedWindowStateFrom}`)
  }
}

function readWindowState(): WindowState {
  try {
    const raw = fs.readFileSync(WINDOW_STATE_FILE(), 'utf-8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return parsed as WindowState
    }
  } catch {
    return {}
  }
  return {}
}

function writeWindowState(state: WindowState) {
  try {
    fs.writeFileSync(WINDOW_STATE_FILE(), JSON.stringify(state, null, 2))
  } catch {
    return
  }
}

let windowState: WindowState = {}
function persistWindowState(key: 'main' | 'procedure', window: BrowserWindow | null) {
  if (!window) return
  const bounds = window.isMaximized() ? window.getNormalBounds() : window.getBounds()
  windowState = {
    ...windowState,
    [key]: {
      bounds,
      isMaximized: window.isMaximized(),
    },
  }
  writeWindowState(windowState)
}

function shouldUseSeed(data: unknown) {
  void data
  return false
}

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE(), 'utf-8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return shouldUseSeed(parsed) ? defaultData : parsed
    }
  } catch {
    return defaultData
  }
  return defaultData
}

function writeData(data: unknown) {
  fs.writeFileSync(DATA_FILE(), JSON.stringify(data ?? defaultData, null, 2))
}

const AUTO_UPDATE_LOG_PREFIX = '[auto-update]'
const AUTO_UPDATE_SUPPORTED_PLATFORMS = new Set(['win32', 'darwin'])
const AUTO_UPDATE_STATUS_CHANNEL = 'updates:status'
const AUTO_UPDATE_TIMEOUT_MS = 120_000
const AUTO_UPDATE_OWNER = 'SirlianCassar'
const AUTO_UPDATE_REPO = 'Agentor'
const AUTO_UPDATE_GH_TOKEN =
  process.env.GH_TOKEN ||
  process.env.GITHUB_TOKEN ||
  process.env.AUTO_UPDATE_GH_TOKEN ||
  __AUTO_UPDATE_GH_TOKEN__

type UpdatePhase =
  | 'idle'
  | 'disabled'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'not-available'
  | 'error'

type UpdateStatusPayload = {
  phase: UpdatePhase
  message: string
  version?: string
  progress?: number
  checkedAt?: string
}

let updateStatus: UpdateStatusPayload = {
  phase: 'idle',
  message: 'En attente de vérification des mises à jour.',
}
let autoUpdaterConfigured = false
let updateCheckInProgress = false
let restartScheduled = false
let updateCheckTimeout: ReturnType<typeof setTimeout> | null = null

function isStartupAutoUpdateEnabled() {
  return app.isPackaged && !VITE_DEV_SERVER_URL && AUTO_UPDATE_SUPPORTED_PLATFORMS.has(process.platform)
}

function getUpdateErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  return 'Erreur inconnue'
}

function pushUpdateStatus(status: UpdateStatusPayload) {
  updateStatus = status
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send(AUTO_UPDATE_STATUS_CHANNEL, updateStatus)
    }
  }
}

function clearUpdateTimeout() {
  if (!updateCheckTimeout) return
  clearTimeout(updateCheckTimeout)
  updateCheckTimeout = null
}

function armUpdateTimeout() {
  clearUpdateTimeout()
  updateCheckTimeout = setTimeout(() => {
    if (!updateCheckInProgress) return
    updateCheckInProgress = false
    pushUpdateStatus({
      phase: 'error',
      message: 'La recherche de mise à jour a expiré.',
      checkedAt: new Date().toISOString(),
    })
    console.warn(`${AUTO_UPDATE_LOG_PREFIX} check timeout`)
  }, AUTO_UPDATE_TIMEOUT_MS)
}

function configureAutoUpdater() {
  if (autoUpdaterConfigured) return
  autoUpdaterConfigured = true

  if (!isStartupAutoUpdateEnabled()) {
    pushUpdateStatus({
      phase: 'disabled',
      message: 'Mises à jour automatiques disponibles uniquement sur l’application installée.',
    })
    return
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = false

  const feedOptions = {
    provider: 'github',
    owner: AUTO_UPDATE_OWNER,
    repo: AUTO_UPDATE_REPO,
    ...(AUTO_UPDATE_GH_TOKEN ? { private: true, token: AUTO_UPDATE_GH_TOKEN } : {}),
  } as Parameters<typeof autoUpdater.setFeedURL>[0]

  autoUpdater.setFeedURL(feedOptions)

  console.log(`${AUTO_UPDATE_LOG_PREFIX} GitHub feed configured: ${AUTO_UPDATE_OWNER}/${AUTO_UPDATE_REPO}`)

  autoUpdater.on('checking-for-update', () => {
    updateCheckInProgress = true
    pushUpdateStatus({
      phase: 'checking',
      message: 'Recherche des mises à jour…',
    })
    console.log(`${AUTO_UPDATE_LOG_PREFIX} checking for updates`)
  })

  autoUpdater.on('update-available', (info: { version?: string }) => {
    pushUpdateStatus({
      phase: 'available',
      message: `Mise à jour disponible${info.version ? ` (${info.version})` : ''}. Téléchargement…`,
      version: info.version,
    })
    console.log(`${AUTO_UPDATE_LOG_PREFIX} update available${info.version ? `: ${info.version}` : ''}`)
  })

  autoUpdater.on('download-progress', (progress: { percent: number }) => {
    const rounded = Math.max(0, Math.min(100, Math.round(progress.percent ?? 0)))
    pushUpdateStatus({
      phase: 'downloading',
      message: `Téléchargement de la mise à jour… ${rounded}%`,
      progress: rounded,
      version: updateStatus.version,
    })
  })

  autoUpdater.on('update-not-available', () => {
    updateCheckInProgress = false
    clearUpdateTimeout()
    pushUpdateStatus({
      phase: 'not-available',
      message: 'Aucune mise à jour disponible.',
      checkedAt: new Date().toISOString(),
    })
    console.log(`${AUTO_UPDATE_LOG_PREFIX} no update available`)
  })

  autoUpdater.on('update-downloaded', (info: { version?: string }) => {
    updateCheckInProgress = false
    clearUpdateTimeout()
    pushUpdateStatus({
      phase: 'downloaded',
      message: 'Mise à jour prête. Ouvre Paramètres > Mise à jour pour l’installer.',
      version: info.version,
    })
    console.log(`${AUTO_UPDATE_LOG_PREFIX} update downloaded${info.version ? `: ${info.version}` : ''}`)
  })

  autoUpdater.on('error', (error: Error) => {
    updateCheckInProgress = false
    clearUpdateTimeout()
    const message = getUpdateErrorMessage(error)
    pushUpdateStatus({
      phase: 'error',
      message: `Mise à jour impossible: ${message}`,
      checkedAt: new Date().toISOString(),
    })
    console.error(`${AUTO_UPDATE_LOG_PREFIX} update failed`, error)
  })
}

async function checkForUpdates(reason: 'startup' | 'manual') {
  if (!isStartupAutoUpdateEnabled()) {
    pushUpdateStatus({
      phase: 'disabled',
      message: 'Mises à jour automatiques disponibles uniquement sur l’application installée.',
    })
    return { ok: false, reason: 'disabled' as const }
  }

  if (restartScheduled) {
    return { ok: false, reason: 'restart-pending' as const }
  }

  if (updateCheckInProgress) {
    return { ok: false, reason: 'already-checking' as const }
  }

  updateCheckInProgress = true
  pushUpdateStatus({
    phase: 'checking',
    message: reason === 'startup' ? 'Recherche des mises à jour au lancement…' : 'Recherche des mises à jour…',
  })
  armUpdateTimeout()
  try {
    await autoUpdater.checkForUpdates()
    if (updateStatus.phase === 'checking') {
      updateCheckInProgress = false
      clearUpdateTimeout()
      pushUpdateStatus({
        phase: 'not-available',
        message: 'Aucune mise à jour disponible.',
        checkedAt: new Date().toISOString(),
      })
    }
    return { ok: true, reason }
  } catch (error) {
    updateCheckInProgress = false
    clearUpdateTimeout()
    const message = getUpdateErrorMessage(error)
    pushUpdateStatus({
      phase: 'error',
      message: `Mise à jour impossible: ${message}`,
      checkedAt: new Date().toISOString(),
    })
    console.error(`${AUTO_UPDATE_LOG_PREFIX} check failed`, error)
    return { ok: false, reason: 'error' as const }
  }
}

function installDownloadedUpdate() {
  if (!isStartupAutoUpdateEnabled()) {
    return { ok: false, reason: 'disabled' as const }
  }

  if (restartScheduled) {
    return { ok: false, reason: 'restart-pending' as const }
  }

  if (updateStatus.phase !== 'downloaded') {
    return { ok: false, reason: 'not-downloaded' as const }
  }

  restartScheduled = true
  pushUpdateStatus({
    phase: 'downloaded',
    message: 'Redémarrage pour installer la mise à jour…',
    version: updateStatus.version,
  })

  setTimeout(() => {
    autoUpdater.quitAndInstall(false, true)
  }, 300)

  return { ok: true, reason: 'installing' as const }
}

function createWindow() {
  const saved = windowState.main
  const bounds = saved?.bounds
  win = new BrowserWindow({
    ...(bounds
      ? {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        }
      : { width: 1400, height: 900 }),
    icon: path.join(process.env.VITE_PUBLIC, 'agentor', 'icon.png'),
    title: 'Agentor',
    backgroundColor: '#1c1d1f',
    minWidth: 1100,
    minHeight: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })
  win.setMenuBarVisibility(false)
  win.setAutoHideMenuBar(true)
  if (saved?.isMaximized) {
    win.maximize()
  }
  win.on('close', () => persistWindowState('main', win))
  win.on('closed', () => {
    win = null
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send(AUTO_UPDATE_STATUS_CHANNEL, updateStatus)
  })
}

function openProcedureWindow() {
  if (procedureWin && !procedureWin.isDestroyed()) {
    procedureWin.focus()
    return true
  }

  const saved = windowState.procedure
  const bounds = saved?.bounds
  procedureWin = new BrowserWindow({
    ...(bounds
      ? {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        }
      : { width: 980, height: 720 }),
    minWidth: 860,
    minHeight: 620,
    title: 'Agentor Dashboard',
    backgroundColor: '#1c1d1f',
    icon: path.join(process.env.VITE_PUBLIC, 'agentor', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })
  procedureWin.setMenuBarVisibility(false)
  procedureWin.setAutoHideMenuBar(true)
  if (saved?.isMaximized) {
    procedureWin.maximize()
  }

  if (VITE_DEV_SERVER_URL) {
    procedureWin.loadURL(`${VITE_DEV_SERVER_URL}#procedure`)
  } else {
    procedureWin.loadFile(path.join(RENDERER_DIST, 'index.html'), { hash: 'procedure' })
  }
  procedureWin.webContents.on('did-finish-load', () => {
    procedureWin?.webContents.send(AUTO_UPDATE_STATUS_CHANNEL, updateStatus)
  })
  procedureWin.on('close', () => persistWindowState('procedure', procedureWin))
  procedureWin.on('closed', () => {
    procedureWin = null
  })

  return true
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(async () => {
  app.setAppUserModelId('com.agentor.app')
  migrateLegacyStorageIfNeeded()
  windowState = readWindowState()
  Menu.setApplicationMenu(null)
  createWindow()
  configureAutoUpdater()
  await checkForUpdates('startup')
})

ipcMain.handle('storage:load', () => readData())
ipcMain.handle('storage:save', (_event, data) => {
  writeData(data)
  return true
})
ipcMain.handle('storage:export-json', async (_event, data) => {
  const parent = win ?? BrowserWindow.getFocusedWindow()
  const dialogOptions: SaveDialogOptions = {
    title: 'Exporter les données Agentor',
    defaultPath: 'agentor-export.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  }
  const { canceled, filePath } = parent
    ? await dialog.showSaveDialog(parent, dialogOptions)
    : await dialog.showSaveDialog(dialogOptions)
  if (canceled || !filePath) return { canceled: true }
  fs.writeFileSync(filePath, JSON.stringify(data ?? defaultData, null, 2))
  return { canceled: false }
})
ipcMain.handle('storage:export-history', async (_event, text) => {
  const parent = win ?? BrowserWindow.getFocusedWindow()
  const dialogOptions: SaveDialogOptions = {
    title: 'Exporter l’historique Agentor',
    defaultPath: 'agentor-historique.txt',
    filters: [{ name: 'Texte', extensions: ['txt'] }],
  }
  const { canceled, filePath } = parent
    ? await dialog.showSaveDialog(parent, dialogOptions)
    : await dialog.showSaveDialog(dialogOptions)
  if (canceled || !filePath) return { canceled: true }
  fs.writeFileSync(filePath, String(text ?? ''), 'utf-8')
  return { canceled: false }
})
ipcMain.handle('storage:import-json', async () => {
  const parent = win ?? BrowserWindow.getFocusedWindow()
  const dialogOptions: OpenDialogOptions = {
    title: 'Importer des données Agentor',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  }
  const { canceled, filePaths } = parent
    ? await dialog.showOpenDialog(parent, dialogOptions)
    : await dialog.showOpenDialog(dialogOptions)
  if (canceled || !filePaths?.[0]) return { canceled: true }
  try {
    const raw = fs.readFileSync(filePaths[0], 'utf-8')
    const data = JSON.parse(raw)
    return { canceled: false, data }
  } catch (error) {
    console.warn('[storage-import] failed', error)
    return { canceled: false, error: 'invalid-json' }
  }
})
ipcMain.handle('shell:open-external', async (_event, url) => {
  if (!url || typeof url !== 'string') return false
  await shell.openExternal(url)
  return true
})
ipcMain.handle('procedure:open', () => openProcedureWindow())
ipcMain.handle('updates:get-status', () => updateStatus)
ipcMain.handle('updates:check-now', async () => {
  configureAutoUpdater()
  return checkForUpdates('manual')
})
ipcMain.handle('updates:install-downloaded', () => installDownloadedUpdate())
