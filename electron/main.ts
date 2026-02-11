import { app, BrowserWindow, dialog, ipcMain, shell, Menu, type Rectangle } from 'electron'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let procedureWin: BrowserWindow | null

const DATA_FILE = () => path.join(app.getPath('userData'), 'typefast-data.json')
const WINDOW_STATE_FILE = () => path.join(app.getPath('userData'), 'window-state.json')
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

function readWindowState(): WindowState {
  try {
    const raw = fs.readFileSync(WINDOW_STATE_FILE(), 'utf-8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return parsed as WindowState
    }
  } catch {
    // Ignore and fall back to defaults.
  }
  return {}
}

function writeWindowState(state: WindowState) {
  try {
    fs.writeFileSync(WINDOW_STATE_FILE(), JSON.stringify(state, null, 2))
  } catch {
    // Ignore persistence errors.
  }
}

let windowState = readWindowState()
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
    // Ignore and fall back to defaults.
  }
  return defaultData
}

function writeData(data: unknown) {
  fs.writeFileSync(DATA_FILE(), JSON.stringify(data ?? defaultData, null, 2))
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
    icon: path.join(process.env.VITE_PUBLIC, 'typefast', 'app-icon.png'),
    title: 'Typefast',
    backgroundColor: '#15151a',
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
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
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
    title: 'Tableau de bord',
    backgroundColor: '#15151a',
    icon: path.join(process.env.VITE_PUBLIC, 'typefast', 'app-icon.png'),
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
  procedureWin.on('close', () => persistWindowState('procedure', procedureWin))
  procedureWin.on('closed', () => {
    procedureWin = null
  })

  return true
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)

app.whenReady().then(() => {
  app.setAppUserModelId('com.typefast.app')
  Menu.setApplicationMenu(null)
})

ipcMain.handle('storage:load', () => readData())
ipcMain.handle('storage:save', (_event, data) => {
  writeData(data)
  return true
})
ipcMain.handle('storage:export-json', async (_event, data) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win!, {
    title: 'Exporter les données TypeFast',
    defaultPath: 'typefast-export.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  })
  if (canceled || !filePath) return { canceled: true }
  fs.writeFileSync(filePath, JSON.stringify(data ?? defaultData, null, 2))
  return { canceled: false }
})
ipcMain.handle('storage:export-history', async (_event, text) => {
  const parent = win ?? BrowserWindow.getFocusedWindow()
  const dialogOptions = {
    title: 'Exporter l’historique TypeFast',
    defaultPath: 'typefast-historique.txt',
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
  const { canceled, filePaths } = await dialog.showOpenDialog(win!, {
    title: 'Importer des données TypeFast',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  })
  if (canceled || !filePaths?.[0]) return { canceled: true }
  const raw = fs.readFileSync(filePaths[0], 'utf-8')
  const data = JSON.parse(raw)
  return { canceled: false, data }
})
ipcMain.handle('shell:open-external', async (_event, url) => {
  if (!url || typeof url !== 'string') return false
  await shell.openExternal(url)
  return true
})
ipcMain.handle('procedure:open', () => openProcedureWindow())
