import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  shell,
  Menu,
  safeStorage,
  type OpenDialogOptions,
  type Rectangle,
  type SaveDialogOptions,
} from 'electron'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import { autoUpdater } from 'electron-updater'
import { readJsonObject, writeFileAtomic, writeRetiredDataExport } from './dataFile'
import { CaseContextStore } from './caseContextStore'
import { startLocalBridge, type LocalBridge } from './localBridge'
import {
  createPairingToken,
  loadPairingToken,
  readBridgeConfig,
  writeBridgeConfig,
  type BridgeConfig,
} from './bridgeConfig'
import { isContextFieldKey } from '../src/context/caseContext'
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
type SavedWindowState = {
  bounds: Rectangle
  isMaximized: boolean
}

type WindowState = {
  main?: SavedWindowState
  procedure?: SavedWindowState
  // Dashboards detached from the main window, by kind, and those open at quit.
  dashboards?: Record<string, SavedWindowState>
  detached?: string[]
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
  return (readJsonObject(WINDOW_STATE_FILE()) as WindowState | null) ?? {}
}

function writeWindowState(state: WindowState) {
  try {
    writeFileAtomic(WINDOW_STATE_FILE(), JSON.stringify(state, null, 2))
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

// The renderer owns the defaults: an empty object is normalized there. A file
// that exists but cannot be parsed is kept aside before the next save
// replaces it, so a damaged profile is never silently lost.
function readData() {
  const filePath = DATA_FILE()
  const parsed = readJsonObject(filePath)
  if (parsed) {
    exportRetiredData(parsed)
    return parsed
  }
  if (fs.existsSync(filePath)) {
    const backupPath = filePath.replace(/\.json$/, `.unreadable-${Date.now()}.json`)
    try {
      fs.copyFileSync(filePath, backupPath)
      console.warn('[storage] unreadable data file kept as', backupPath)
    } catch (error) {
      console.warn('[storage] could not keep unreadable data file', error)
    }
  }
  return {}
}

const RETIRED_DATA_FILE = () => path.join(app.getPath('userData'), 'agentor-donnees-retirees.json')

// One copy of the data no screen uses any more, before it can be dropped.
function exportRetiredData(data: Record<string, unknown>) {
  try {
    if (writeRetiredDataExport(RETIRED_DATA_FILE(), data) === 'written') {
      console.log('[storage] unused data copied to', RETIRED_DATA_FILE())
    }
  } catch (error) {
    console.warn('[storage] could not copy unused data', error)
  }
}

function writeData(data: unknown) {
  writeFileAtomic(DATA_FILE(), JSON.stringify(data ?? {}, null, 2))
}

const AUTO_UPDATE_LOG_PREFIX = '[auto-update]'
const AUTO_UPDATE_SUPPORTED_PLATFORMS = new Set(['win32'])
const AUTO_UPDATE_STATUS_CHANNEL = 'updates:status'
const AUTO_UPDATE_TIMEOUT_MS = 120_000
const AUTO_UPDATE_OWNER = 'SirlianCassar'
const AUTO_UPDATE_REPO = 'Agentor'
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
  win.on('close', () => {
    persistWindowState('main', win)
    // Closing the main window ends the session: detached dashboards close
    // too and are remembered for the next launch.
    quitting = true
    for (const dashboardWin of dashboardWindows.values()) {
      if (!dashboardWin.isDestroyed()) dashboardWin.close()
    }
  })
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

// ── Dashboards detached from the main window ──────────────────────────────
const DETACHABLE_DASHBOARDS = new Set(['reminders', 'news', 'calculator', 'portal', 'parts', 'decorations'])
// Tools that open in their own popup window, like the dashboards.
const POPUP_TOOLS = new Set(['troubleshootgun', 'call'])
const DETACHABLE_WINDOWS = new Set([...DETACHABLE_DASHBOARDS, ...POPUP_TOOLS])
const MAIN_ACTIONS = new Set(['template-import', 'task-insert', 'call-save'])
const MAIN_ACTION_MAX_LENGTH = 200_000
const dashboardWindows = new Map<string, BrowserWindow>()
let quitting = false

function announceDetachedDashboards() {
  const kinds = [...dashboardWindows.keys()]
  broadcast('dashboard:detached', kinds)
  if (!quitting) {
    windowState = { ...windowState, detached: kinds }
    writeWindowState(windowState)
  }
}

function openDashboardWindow(kind: string) {
  const existing = dashboardWindows.get(kind)
  if (existing && !existing.isDestroyed()) {
    if (existing.isMinimized()) existing.restore()
    existing.focus()
    return true
  }
  const saved = windowState.dashboards?.[kind]
  const bounds = saved?.bounds
  const dashboardWin = new BrowserWindow({
    ...(bounds
      ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
      : POPUP_TOOLS.has(kind)
        ? { width: kind === 'call' ? 760 : 520, height: 620 }
        : { width: 460, height: 560 }),
    minWidth: 280,
    minHeight: 200,
    title: 'Agentor',
    backgroundColor: '#1c1d1f',
    icon: path.join(process.env.VITE_PUBLIC, 'agentor', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })
  dashboardWin.setMenuBarVisibility(false)
  dashboardWin.setAutoHideMenuBar(true)
  if (saved?.isMaximized) dashboardWin.maximize()
  const hash = `dashboard=${kind}`
  if (VITE_DEV_SERVER_URL) {
    dashboardWin.loadURL(`${VITE_DEV_SERVER_URL}#${hash}`)
  } else {
    dashboardWin.loadFile(path.join(RENDERER_DIST, 'index.html'), { hash })
  }
  dashboardWin.webContents.on('did-finish-load', () => {
    dashboardWin.webContents.send(AUTO_UPDATE_STATUS_CHANNEL, updateStatus)
  })
  dashboardWin.on('close', () => {
    const state = {
      bounds: dashboardWin.isMaximized() ? dashboardWin.getNormalBounds() : dashboardWin.getBounds(),
      isMaximized: dashboardWin.isMaximized(),
    }
    windowState = { ...windowState, dashboards: { ...windowState.dashboards, [kind]: state } }
    writeWindowState(windowState)
  })
  dashboardWin.on('closed', () => {
    dashboardWindows.delete(kind)
    announceDetachedDashboards()
  })
  dashboardWindows.set(kind, dashboardWin)
  announceDetachedDashboards()
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

// ── Active case context and Cairm+ bridge ─────────────────────────────────
const CASE_CONTEXT_FILE = () => path.join(app.getPath('userData'), 'case-context.json')
const BRIDGE_CONFIG_FILE = () => path.join(app.getPath('userData'), 'bridge.json')
const BRIDGE_TOKEN_FILE = () => path.join(app.getPath('userData'), 'bridge-token.bin')
const CASE_CONTEXT_CHANNEL = 'case-context:changed'
const BRIDGE_STATUS_CHANNEL = 'bridge:status'

type BridgeStatus = BridgeConfig & {
  state: 'off' | 'listening' | 'error'
  error?: string
  tokenPersisted: boolean
}

let caseContextStore: CaseContextStore | null = null
let localBridge: LocalBridge | null = null
let bridgeToken = ''
let bridgeTokenPersisted = false
let bridgeStatus: BridgeStatus | null = null

function broadcast(channel: string, payload: unknown) {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send(channel, payload)
  }
}

function setBridgeStatus(status: BridgeStatus) {
  bridgeStatus = status
  broadcast(BRIDGE_STATUS_CHANNEL, status)
}

async function applyBridgeConfig(config: BridgeConfig) {
  if (localBridge) {
    await localBridge.close()
    localBridge = null
  }
  if (!config.enabled || !caseContextStore) {
    setBridgeStatus({ ...config, state: 'off', tokenPersisted: bridgeTokenPersisted })
    return
  }
  const store = caseContextStore
  try {
    localBridge = await startLocalBridge({
      port: config.port,
      token: bridgeToken,
      allowedOrigins: config.allowedOrigins,
      appVersion: app.getVersion(),
      onMessage: (message) => store.handleBridgeMessage(message),
    })
    setBridgeStatus({ ...config, state: 'listening', tokenPersisted: bridgeTokenPersisted })
  } catch (error) {
    setBridgeStatus({
      ...config,
      state: 'error',
      error: getUpdateErrorMessage(error),
      tokenPersisted: bridgeTokenPersisted,
    })
  }
}

const readCaseImportSetting = (data: unknown) =>
  (data as { settings?: { caseImport?: unknown } } | null)?.settings?.caseImport

function initCaseContext() {
  caseContextStore = new CaseContextStore(CASE_CONTEXT_FILE())
  caseContextStore.setImports(readCaseImportSetting(readJsonObject(DATA_FILE())))
  caseContextStore.subscribe((context) => broadcast(CASE_CONTEXT_CHANNEL, context))
  const pairing = loadPairingToken(BRIDGE_TOKEN_FILE(), safeStorage)
  bridgeToken = pairing.token
  bridgeTokenPersisted = pairing.persisted
  void applyBridgeConfig(readBridgeConfig(BRIDGE_CONFIG_FILE()))
}

app.whenReady().then(async () => {
  app.setAppUserModelId('com.agentor.app')
  migrateLegacyStorageIfNeeded()
  windowState = readWindowState()
  Menu.setApplicationMenu(null)
  initCaseContext()
  createWindow()
  // Dashboards that were detached when the app was last closed come back.
  for (const kind of windowState.detached ?? []) {
    // A call is never restarted on its own.
    if (DETACHABLE_WINDOWS.has(kind) && kind !== 'call') openDashboardWindow(kind)
  }
  configureAutoUpdater()
  await checkForUpdates('startup')
})

app.on('before-quit', () => {
  quitting = true
  void localBridge?.close()
})

ipcMain.handle('case-context:get', () => caseContextStore?.get() ?? null)
ipcMain.handle('case-context:set-manual', (_event, caseId: unknown, key: unknown, value: unknown) => {
  if (typeof caseId !== 'string' || !isContextFieldKey(key) || typeof value !== 'string') return false
  return caseContextStore?.setManual(caseId, key, value.slice(0, 2000)) ?? false
})
ipcMain.handle('case-context:confirm', (_event, caseId: unknown, key: unknown) => {
  if (typeof caseId !== 'string' || !isContextFieldKey(key)) return false
  return caseContextStore?.confirm(caseId, key) ?? false
})
ipcMain.handle('case-context:clear', () => {
  caseContextStore?.clear()
  return true
})
ipcMain.handle('bridge:get-status', () => bridgeStatus)
// The token is only handed to the renderer on an explicit pairing request.
ipcMain.handle('bridge:get-token', () => bridgeToken)
ipcMain.handle('bridge:set-enabled', async (_event, enabled: unknown) => {
  const config = { ...readBridgeConfig(BRIDGE_CONFIG_FILE()), enabled: enabled === true }
  writeBridgeConfig(BRIDGE_CONFIG_FILE(), config)
  await applyBridgeConfig(config)
  return bridgeStatus
})
ipcMain.handle('bridge:regenerate-token', async () => {
  const pairing = createPairingToken(BRIDGE_TOKEN_FILE(), safeStorage)
  bridgeToken = pairing.token
  bridgeTokenPersisted = pairing.persisted
  await applyBridgeConfig(readBridgeConfig(BRIDGE_CONFIG_FILE()))
  return bridgeToken
})

ipcMain.handle('storage:load', () => readData())
// Every window edits the same data: after a save, the other windows receive it
// so a detached dashboard and the main window never overwrite each other.
ipcMain.handle('storage:save', (event, data) => {
  writeData(data)
  caseContextStore?.setImports(readCaseImportSetting(data))
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed() && window.webContents.id !== event.sender.id) {
      window.webContents.send('storage:changed', data)
    }
  }
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
  writeFileAtomic(filePath, JSON.stringify(data ?? {}, null, 2))
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
  writeFileAtomic(filePath, String(text ?? ''))
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
ipcMain.handle('dashboard:detach', (_event, kind: unknown) =>
  typeof kind === 'string' && DETACHABLE_WINDOWS.has(kind) ? openDashboardWindow(kind) : false,
)
// Only the main window holds the drafts: a popup's action is passed to it.
ipcMain.handle('main:action', (event, action: unknown) => {
  if (!win || win.isDestroyed() || event.sender.id === win.webContents.id) return false
  if (!action || typeof action !== 'object' || !MAIN_ACTIONS.has(String((action as { type?: unknown }).type))) return false
  if (JSON.stringify(action).length > MAIN_ACTION_MAX_LENGTH) return false
  win.webContents.send('main:action', action)
  return true
})
ipcMain.handle('dashboard:list-detached', () => [...dashboardWindows.keys()])
ipcMain.handle('dashboard:attach', (_event, kind: unknown) => {
  if (typeof kind !== 'string') return false
  const target = dashboardWindows.get(kind)
  if (!target || target.isDestroyed()) return false
  target.close()
  win?.webContents.send('dashboard:attach-request', kind)
  win?.focus()
  return true
})
ipcMain.handle('updates:get-status', () => updateStatus)
ipcMain.handle('updates:check-now', async () => {
  configureAutoUpdater()
  return checkForUpdates('manual')
})
ipcMain.handle('updates:install-downloaded', () => installDownloadedUpdate())
