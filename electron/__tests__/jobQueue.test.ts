import { describe, expect, it } from 'vitest'
import { JobQueue, MAX_PENDING_JOBS } from '../jobQueue'

const harvest = { kind: 'template.harvest' } as const
const instantiate = { kind: 'template.instantiate', templateId: '1d59ffdb-057e-ec11-8d21-000d3a6593d3' } as const

const index = {
  org: 'https://guillemot.crm4.dynamics.com',
  fetchedAt: '2026-11-19T22:00:00.000Z',
  entries: [{ id: '1d59ffdb-057e-ec11-8d21-000d3a6593d3', title: 'TM EN - 14 Day RMA - EU', languageCode: 1033 }],
}

describe('job queue', () => {
  it('serializes the job the extension will read', async () => {
    const queue = new JobQueue()
    const pending = queue.submit(instantiate, {
      system: 'dynamics',
      entity: 'incident',
      id: '11111111-2222-4333-8444-555555555555',
      number: 'RQT-000001',
    })
    const [job] = queue.take()
    expect(job).toMatchObject({
      protocol: 2,
      kind: 'template.instantiate',
      caseKey: { number: 'RQT-000001' },
      payload: { templateId: instantiate.templateId },
    })
    queue.clear('test')
    expect(await pending).toEqual({ ok: false, reason: 'test' })
  })

  it('expires a job no tab came for, and says so', async () => {
    const queue = new JobQueue({ pickupMs: 5 })
    expect(await queue.submit(harvest)).toEqual({ ok: false, reason: 'no-browser' })
  })

  it('expires a job that was taken but never answered', async () => {
    const queue = new JobQueue({ pickupMs: 50, answerMs: 5 })
    const pending = queue.submit(harvest)
    expect(queue.take()).toHaveLength(1)
    expect(await pending).toEqual({ ok: false, reason: 'timeout' })
  })

  it('refuses a second harvest while one is waiting', async () => {
    const queue = new JobQueue({ pickupMs: 20 })
    const first = queue.submit(harvest)
    expect(await queue.submit(harvest)).toEqual({ ok: false, reason: 'already-queued' })
    await first
  })

  it('keeps an unreadable result pending so a valid one can still arrive', async () => {
    const queue = new JobQueue({ pickupMs: 60, answerMs: 60 })
    const pending = queue.submit(harvest)
    const [job] = queue.take()
    expect(queue.settle(job.id, { protocol: 2, ok: true, data: { ...index, entries: [] } })).toEqual({
      ok: false,
      error: 'invalid-entries',
    })
    expect(queue.settle(job.id, { protocol: 2, ok: true, data: index })).toEqual({ ok: true })
    const result = await pending
    expect(result.ok && result.outcome.kind === 'template.harvest' && result.outcome.index.org).toBe(index.org)
  })

  it('hands a job only to a page able to run it', async () => {
    const queue = new JobQueue({ pickupMs: 60, answerMs: 60 })
    const pending = queue.submit({ kind: 'mail.compose', subject: 'Sujet', body: 'Corps' })
    // A case page cannot write a mail: the job stays for the mail form.
    expect(queue.take(['template.harvest', 'template.instantiate'])).toHaveLength(0)
    expect(queue.take(['template.instantiate', 'mail.compose'])).toHaveLength(1)
    queue.clear('test')
    await pending
  })

  it('counts only the jobs still waiting for a tab', async () => {
    const queue = new JobQueue({ pickupMs: 60, answerMs: 60 })
    const pending = queue.submit(instantiate)
    expect(queue.pendingCount()).toBe(1)
    queue.take()
    expect(queue.pendingCount()).toBe(0)
    queue.clear('test')
    await pending
  })

  it('stops taking jobs past the queue limit', async () => {
    const queue = new JobQueue({ pickupMs: 60, answerMs: 60 })
    const waiting = Array.from({ length: MAX_PENDING_JOBS }, () => queue.submit(instantiate))
    expect(await queue.submit(instantiate)).toEqual({ ok: false, reason: 'queue-full' })
    queue.clear('test')
    await Promise.all(waiting)
  })
})
