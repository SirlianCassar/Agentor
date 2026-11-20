import http from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import type { BridgeMessage } from '../../src/context/bridgeMessages'
import { startLocalBridge, type LocalBridge } from '../localBridge'
import { JobQueue } from '../jobQueue'
import { readBridgeConfig, AGENTOR_BRIDGE_EXTENSION_ORIGIN } from '../bridgeConfig'

const TOKEN = 'test-token-abcdefghijklmnop'
const EXTENSION = 'chrome-extension://abcdefghijklmnopabcdefghijklmnop'
let bridge: LocalBridge | null = null
afterEach(async () => {
  await bridge?.close()
  bridge = null
})

const start = async () => {
  const received: BridgeMessage[] = []
  const queue = new JobQueue()
  bridge = await startLocalBridge({
    port: 0,
    token: TOKEN,
    allowedOrigins: [EXTENSION, ...readBridgeConfig('/nonexistent-agentor-test-bridge.json').allowedOrigins],
    appVersion: 'test',
    onMessage: (message) => received.push(message),
    takeJobs: () => queue.take(),
    pendingJobs: () => queue.pendingCount(),
    settleJob: (id, raw) => queue.settle(id, raw),
  })
  return { received, queue, base: `http://127.0.0.1:${bridge.port}` }
}

const templateIndex = (entries: unknown[]) => ({
  org: 'https://guillemot.crm4.dynamics.com',
  fetchedAt: '2026-11-19T22:00:00.000Z',
  entries,
})

const get = (url: string) => fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } })

const templateEntry = {
  id: '1d59ffdb-057e-ec11-8d21-000d3a6593d3',
  title: 'TM EN - Paid Spare Part proposal - WW',
  languageCode: 1033,
  modifiedOn: '2025-12-24T11:29:21.000Z',
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
    const message = received[0]
    expect(message.type === 'case.observed' && message.caseKey.id).toBe('11111111-2222-4333-8444-555555555555')
  })

  it('accepts the Agentor Bridge extension identity with the pairing token', async () => {
    const { received, base } = await start()
    const health = await fetch(`${base}/v1/health`, { headers: { Authorization: `Bearer ${TOKEN}` } })
    expect(health.status).toBe(200)
    const response = await post(`${base}/v1/case`, observed, { Origin: AGENTOR_BRIDGE_EXTENSION_ORIGIN })
    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBe(AGENTOR_BRIDGE_EXTENSION_ORIGIN)
    expect(received).toHaveLength(1)
    expect((await post(`${base}/v1/case`, observed, { Origin: AGENTOR_BRIDGE_EXTENSION_ORIGIN, Authorization: 'Bearer wrong' })).status).toBe(401)
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

  it('counts the waiting jobs in the answer to a case push', async () => {
    const { queue, base } = await start()
    expect(await (await post(`${base}/v1/case`, observed)).json()).toMatchObject({ jobs: 0 })
    const harvest = queue.submit({ kind: 'template.harvest' })
    expect(await (await post(`${base}/v1/case`, observed)).json()).toMatchObject({ jobs: 1 })
    queue.clear('test')
    await harvest
  })

  it('hands a job out once and takes its result', async () => {
    const { queue, base } = await start()
    const pending = queue.submit({ kind: 'template.harvest' })

    const handed = await (await get(`${base}/v1/jobs`)).json()
    expect(handed.jobs).toHaveLength(1)
    expect(handed.jobs[0]).toMatchObject({ kind: 'template.harvest', protocol: 2 })
    // Taken once: a second tab must not read the whole index again.
    expect((await (await get(`${base}/v1/jobs`)).json()).jobs).toHaveLength(0)

    const result = await post(`${base}/v1/jobs/${handed.jobs[0].id}/result`, {
      protocol: 2,
      ok: true,
      data: templateIndex([templateEntry, { ...templateEntry, id: 'not-a-guid' }]),
    })
    expect(result.status).toBe(200)
    const settled = await pending
    expect(settled.ok && settled.outcome.kind === 'template.harvest' && settled.outcome.index.entries).toEqual([
      templateEntry,
    ])
  })

  it('refuses an unreadable result and an unknown job', async () => {
    const { queue, base } = await start()
    const pending = queue.submit({ kind: 'template.instantiate', templateId: templateEntry.id })
    const [job] = (await (await get(`${base}/v1/jobs`)).json()).jobs

    // No body: the merge failed, and the job stays in place for a real answer.
    expect((await post(`${base}/v1/jobs/${job.id}/result`, { protocol: 2, ok: true, data: { subject: 'x', body: '' } })).status).toBe(422)
    expect((await post(`${base}/v1/jobs/${templateEntry.id}/result`, { protocol: 2, ok: true })).status).toBe(404)

    await post(`${base}/v1/jobs/${job.id}/result`, { protocol: 2, ok: false, reason: 'case-left' })
    expect(await pending).toEqual({ ok: false, reason: 'case-left' })
  })

  it('carries a refusal through as a normal answer', async () => {
    const { queue, base } = await start()
    const pending = queue.submit({ kind: 'mail.compose', subject: 'Sujet', body: 'Corps' })
    const [job] = (await (await get(`${base}/v1/jobs`)).json()).jobs
    expect(job.payload).toEqual({ subject: 'Sujet', body: 'Corps' })
    await post(`${base}/v1/jobs/${job.id}/result`, { protocol: 2, ok: true, data: { applied: ['subject', 'body'] } })
    const settled = await pending
    expect(settled.ok && settled.outcome.kind === 'mail.compose' && settled.outcome.compose.applied).toEqual([
      'subject',
      'body',
    ])
  })
})
