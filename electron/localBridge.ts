import http from 'node:http'
import { timingSafeEqual } from 'node:crypto'
import { parseBridgeMessage, type BridgeMessage } from '../src/context/bridgeMessages'

// Local bridge for Cairm+. Listens on the loopback interface only, answers only
// to requests carrying the pairing token, and rejects foreign Host headers so a
// web page cannot reach it through DNS rebinding.
export interface LocalBridgeOptions {
  port: number
  token: string
  allowedOrigins: string[]
  appVersion: string
  onMessage: (message: BridgeMessage) => void
}

export interface LocalBridge {
  close: () => Promise<void>
  port: number
}

const MAX_BODY_BYTES = 64 * 1024

const sameSecret = (expected: string, received: string) => {
  const a = Buffer.from(expected)
  const b = Buffer.from(received)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function startLocalBridge(options: LocalBridgeOptions): Promise<LocalBridge> {
  // Filled once the port is known (port 0 lets the system pick one in tests).
  const allowedHosts = new Set<string>()

  const server = http.createServer((request, response) => {
    const origin = request.headers.origin
    const send = (status: number, body: unknown) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      }
      if (origin && options.allowedOrigins.includes(origin)) {
        headers['Access-Control-Allow-Origin'] = origin
        headers['Vary'] = 'Origin'
      }
      response.writeHead(status, headers)
      response.end(JSON.stringify(body))
    }

    if (!allowedHosts.has(String(request.headers.host ?? ''))) return send(421, { ok: false, error: 'host' })
    if (origin && !options.allowedOrigins.includes(origin)) return send(403, { ok: false, error: 'origin' })

    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Origin': origin ?? '',
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '600',
        Vary: 'Origin',
      })
      return response.end()
    }

    const auth = String(request.headers.authorization ?? '')
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    if (!token || !sameSecret(options.token, token)) return send(401, { ok: false, error: 'token' })

    const url = new URL(request.url ?? '/', `http://${request.headers.host}`)
    if (request.method === 'GET' && url.pathname === '/v1/health') {
      return send(200, { ok: true, app: 'agentor', version: options.appVersion, protocol: 1 })
    }
    if (request.method !== 'POST' || url.pathname !== '/v1/case') return send(404, { ok: false, error: 'route' })
    if (!String(request.headers['content-type'] ?? '').startsWith('application/json')) {
      return send(415, { ok: false, error: 'content-type' })
    }

    const chunks: Buffer[] = []
    let size = 0
    let aborted = false
    request.on('data', (chunk: Buffer) => {
      if (aborted) return
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        aborted = true
        send(413, { ok: false, error: 'too-large' })
        request.destroy()
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => {
      if (aborted) return
      let raw: unknown
      try {
        raw = JSON.parse(Buffer.concat(chunks).toString('utf-8'))
      } catch {
        return send(400, { ok: false, error: 'invalid-json' })
      }
      const parsed = parseBridgeMessage(raw)
      if (!parsed.ok) return send(422, { ok: false, error: parsed.error })
      try {
        options.onMessage(parsed.message)
      } catch (error) {
        console.error('[bridge] message handler failed', error)
        return send(500, { ok: false, error: 'handler' })
      }
      return send(200, { ok: true, caseId: parsed.message.caseKey.id })
    })
  })

  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(options.port, '127.0.0.1', () => {
      server.off('error', reject)
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : options.port
      allowedHosts.add(`127.0.0.1:${port}`)
      allowedHosts.add(`localhost:${port}`)
      resolve({ port, close: () => new Promise<void>((done) => server.close(() => done())) })
    })
  })
}
