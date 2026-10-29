import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import { readJsonObject, writeFileAtomic } from './dataFile'

// Cairm (and Cairm+, which keeps the same manifest key) has a fixed extension
// id derived from that key. Other origins can be added in bridge.json.
export const CAIRM_EXTENSION_ORIGIN = 'chrome-extension://eamkmompphpkboifejhldgdpojeglpel'
export const DEFAULT_BRIDGE_PORT = 32100

export interface BridgeConfig {
  enabled: boolean
  port: number
  allowedOrigins: string[]
}

export interface SecretBox {
  isEncryptionAvailable: () => boolean
  encryptString: (value: string) => Buffer
  decryptString: (value: Buffer) => string
}

export function readBridgeConfig(filePath: string): BridgeConfig {
  const raw = readJsonObject(filePath) ?? {}
  const port = Number(raw.port)
  const origins = Array.isArray(raw.allowedOrigins)
    ? raw.allowedOrigins.filter(
        (origin): origin is string => typeof origin === 'string' && origin.startsWith('chrome-extension://'),
      )
    : []
  return {
    // Off until the user turns it on: nothing listens on the machine by default.
    enabled: raw.enabled === true,
    port: Number.isInteger(port) && port >= 1024 && port <= 65535 ? port : DEFAULT_BRIDGE_PORT,
    allowedOrigins: [...new Set([CAIRM_EXTENSION_ORIGIN, ...origins])],
  }
}

export function writeBridgeConfig(filePath: string, config: BridgeConfig) {
  writeFileAtomic(filePath, JSON.stringify(config, null, 2))
}

// The pairing token is stored encrypted by the operating system (DPAPI on
// Windows). Without encryption it is kept in memory only and changes at each
// launch, never written in clear text.
export function loadPairingToken(filePath: string, box: SecretBox) {
  if (box.isEncryptionAvailable()) {
    try {
      const token = box.decryptString(fs.readFileSync(filePath))
      if (token.length >= 32) return { token, persisted: true }
    } catch {
      // Missing or unreadable: a new token is created below.
    }
  }
  return createPairingToken(filePath, box)
}

export function createPairingToken(filePath: string, box: SecretBox) {
  const token = randomBytes(24).toString('base64url')
  if (!box.isEncryptionAvailable()) return { token, persisted: false }
  try {
    fs.writeFileSync(filePath, box.encryptString(token))
    return { token, persisted: true }
  } catch {
    return { token, persisted: false }
  }
}
