import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const configPath = path.join(projectRoot, 'electron-builder.json5')
const pkgPath = path.join(projectRoot, 'package.json')
const extensionDir = path.join(projectRoot, 'edge-extension')

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(raw)
}

function readBuildVersion(configText) {
  const match = configText.match(/buildVersion\s*:\s*['"]([^'"]+)['"]/)
  return match ? match[1] : ''
}

function readOutputDir(configText, buildVersion) {
  const match = configText.match(/output\s*:\s*['"]([^'"]+)['"]/)
  const template = match ? match[1] : 'release/${buildVersion}'
  const resolved = template.replace(/\$\{buildVersion\}/g, buildVersion)
  return path.resolve(projectRoot, resolved)
}

if (!fs.existsSync(extensionDir)) {
  console.error('edge-extension folder is missing:', extensionDir)
  process.exit(1)
}

const configText = fs.readFileSync(configPath, 'utf-8')
let buildVersion = readBuildVersion(configText)
if (!buildVersion) {
  const pkg = readJson(pkgPath)
  buildVersion = pkg.version || ''
}
if (!buildVersion) {
  console.error('buildVersion not found in electron-builder.json5 or package.json')
  process.exit(1)
}

const outputDir = readOutputDir(configText, buildVersion)
const destDir = path.join(outputDir, 'edge-extension')

fs.mkdirSync(outputDir, { recursive: true })
fs.rmSync(destDir, { recursive: true, force: true })
fs.cpSync(extensionDir, destDir, { recursive: true })

console.log('Copied Edge extension to', destDir)
