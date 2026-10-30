import http from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import type { BridgeMessage } from '../../src/context/bridgeMessages'
import { startLocalBridge, type LocalBridge } from '../localBridge'
import { readBridgeConfig, CAIRM_PLUS_EXTENSION_ORIGIN } from '../bridgeConfig'

const TOKEN = 'test-token-abcdefghijklmnop'
const EXTENSION = 'chrome-extension://abcdefghijklmnopabcdefghijklmnop'
let bridge: LocalBridge | null = null
afterEach(async () => {
  await bridge?.close()
  bridge = null
})

const start = async () => {
  const received: BridgeMessage[] = []
  bridge = await startLocalBridge({
    port: 0,
    token: TOKEN,
    allowedOrigins: [EXTENSION, ...readBridgeConfig('/nonexistent-agentor-test-bridge.json').allowedOrigins],
    appVersion: 'test',
    onMessage: (message) => received.push(message),
  })
  return { received, base: `http://127.0.0.1:${bridge.port}` }
}

const observed = {
  protocol: 1,
  type: 'case.observed',
  caseKey: { id: '{11111111-2222-4333-8444-555555555555}', number: 'RQT-000001' },
  observations: [
    { key: 'serialNumber', value: '3030303030', source: 'crm', fetchedAt: '2026-10-29T08:00:00.000Z' },
  ],
}

const post = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}`, ...headers },
    body: JSON.stringify(body),
  })

describe('local bridge', () => {
  it('accepts a valid message from the paired extension', async () => {
    const { received, base } = await start()
    const response = await post(`${base}/v1/case`, observed, { Origin: EXTENSION })
    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBe(EXTENSION)
    expect(received).toHaveLength(1)
    expect(received[0].caseKey.id).toBe('11111111-2222-4333-8444-555555555555')
  })

  it('accepts the distinct Cairm+ 0.52 extension identity with the pairing token', async () => {
    const { received, base } = await start()
    const health = await fetch(`${base}/v1/health`, { headers: { Authorization: `Bearer ${TOKEN}` } })
    expect(health.status).toBe(200)
    const response = await post(`${base}/v1/case`, observed, { Origin: CAIRM_PLUS_EXTENSION_ORIGIN })
    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBe(CAIRM_PLUS_EXTENSION_ORIGIN)
    expect(received).toHaveLength(1)
    expect((await post(`${base}/v1/case`, observed, { Origin: CAIRM_PLUS_EXTENSION_ORIGIN, Authorization: 'Bearer wrong' })).status).toBe(401)
  })

  it('rejects a missing or wrong token', async () => {
    const { received, base } = await start()
    expect((await post(`${base}/v1/case`, observed, { Authorization: 'Bearer nope' })).status).toBe(401)
    expect((await fetch(`${base}/v1/health`)).status).toBe(401)
    expect(received).toHaveLength(0)
  })

  it('rejects web pages and foreign hosts', async () => {
    const { received, base } = await start()
    expect((await post(`${base}/v1/case`, observed, { Origin: 'https://evil.example' })).status).toBe(403)
    // DNS rebinding: the request reaches 127.0.0.1 but names another host.
    const status = await new Promise<number>((resolve) => {
      const request = http.request(`${base}/v1/health`, {
        headers: { Host: 'attacker.example', Authorization: `Bearer ${TOKEN}` },
      }, (response) => resolve(response.statusCode ?? 0))
      request.end()
    })
    expect(status).toBe(421)
    expect(received).toHaveLength(0)
  })

  it('rejects malformed messages and oversized bodies', async () => {
    const { received, base } = await start()
    const bad = { ...observed, caseKey: { id: 'RQT-000001' } }
    expect((await post(`${base}/v1/case`, bad)).status).toBe(422)
    const userSource = {
      ...observed,
      observations: [{ ...observed.observations[0], source: 'user' }],
    }
    expect((await post(`${base}/v1/case`, userSource)).status).toBe(422)
    const huge = { ...observed, padding: 'x'.repeat(70 * 1024) }
    expect((await post(`${base}/v1/case`, huge)).status).toBe(413)
    expect(received).toHaveLength(0)
  })

  it('answers the health check with the token', async () => {
    const { base } = await start()
    const response = await fetch(`${base}/v1/health`, { headers: { Authorization: `Bearer ${TOKEN}` } })
    expect(await response.json()).toMatchObject({ ok: true, app: 'agentor', protocol: 1 })
  })
})
