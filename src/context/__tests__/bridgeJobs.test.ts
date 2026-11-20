import { describe, expect, it } from 'vitest'
import { BRIDGE_JOB_PROTOCOL_VERSION, parseBridgeJobResult, serializeBridgeJob } from '../bridgeJobs'

const ok = (data: unknown) => ({ protocol: BRIDGE_JOB_PROTOCOL_VERSION, ok: true, data })

describe('bridge job results', () => {
  it('reads a merged template with the markup of its lines', () => {
    const result = parseBridgeJobResult('template.instantiate', ok({
      subject: 'Follow up',
      body: 'Hello\n- price: ***€',
      blocks: [
        { text: 'Hello', html: '<p>Hello</p>' },
        { text: '- price: ***€', html: null },
      ],
      familyKey: 'paid-spare-part-proposal',
    }))
    expect(result).toMatchObject({
      ok: true,
      result: {
        ok: true,
        outcome: {
          template: {
            blocks: [{ text: 'Hello', html: '<p>Hello</p>' }, { text: '- price: ***€', html: null }],
            familyKey: 'paid-spare-part-proposal',
          },
        },
      },
    })
  })

  it('drops the blocks it cannot read rather than pairing them wrong', () => {
    const result = parseBridgeJobResult('template.instantiate', ok({
      subject: '',
      body: 'Hello',
      blocks: [{ html: '<p>no text</p>' }, 'nonsense', { text: 'Hello', html: 42 }],
    }))
    if (!result.ok || !result.result.ok || result.result.outcome.kind !== 'template.instantiate') throw new Error('refused')
    // Only the readable one is kept, and markup that is not a string is left out.
    expect(result.result.outcome.template.blocks).toEqual([{ text: 'Hello', html: null }])
  })

  it('accepts a template from an extension that knows nothing of the markup', () => {
    const result = parseBridgeJobResult('template.instantiate', ok({ subject: '', body: 'Hello' }))
    if (!result.ok || !result.result.ok || result.result.outcome.kind !== 'template.instantiate') throw new Error('refused')
    expect(result.result.outcome.template.blocks).toEqual([])
  })

  it('says which fields kept their formatting', () => {
    const result = parseBridgeJobResult('mail.compose', ok({ applied: ['subject', 'body'], formatted: ['body'] }))
    expect(result).toMatchObject({
      ok: true,
      result: { ok: true, outcome: { compose: { applied: ['subject', 'body'], formatted: ['body'] } } },
    })
  })

  it('sends the markup of the body only when there is one', () => {
    const base = { id: 'j1', protocol: BRIDGE_JOB_PROTOCOL_VERSION, createdAt: '2026-11-20T10:00:00.000Z' } as const
    expect(serializeBridgeJob({ ...base, request: { kind: 'mail.compose', subject: 'S', body: 'B' } }).payload)
      .toEqual({ subject: 'S', body: 'B' })
    expect(
      serializeBridgeJob({ ...base, request: { kind: 'mail.compose', subject: 'S', body: 'B', bodyHtml: '<p>B</p>' } }).payload,
    ).toEqual({ subject: 'S', body: 'B', bodyHtml: '<p>B</p>' })
  })
})
