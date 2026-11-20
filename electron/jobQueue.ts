/* The queue of protocol 2 jobs, held by the main process.

   Agentor is the only side that can keep a server, and the extension is the
   only side that can act in the page. So nothing is pushed: a job waits here
   until a browser tab asks for work, and the caller waits for the answer.

   A job that nobody comes to fetch is not an error to hide: it expires with a
   reason the agent can read ("no CRM tab open"). */
import { randomUUID } from 'node:crypto'
import {
  BRIDGE_JOB_PROTOCOL_VERSION,
  parseBridgeJobResult,
  serializeBridgeJob,
  type BridgeJob,
  type BridgeJobRequest,
  type BridgeJobResult,
} from '../src/context/bridgeJobs'
import type { CaseKey } from '../src/context/caseContext'

// Time a job waits to be fetched by a tab. A visible CRM page asks every two
// seconds, a hidden one every fifteen: past this, no tab is watching.
export const JOB_PICKUP_MS = 20_000
// Time the extension has to answer once it fetched the job. The merge is one
// Dataverse call; the harvest pages through a thousand titles.
export const JOB_ANSWER_MS = 40_000
export const MAX_PENDING_JOBS = 20

export interface JobQueueOptions {
  pickupMs?: number
  answerMs?: number
  now?: () => number
}

interface QueuedJob {
  job: BridgeJob
  // Unset until a tab fetched it: a job is handed out once, then waited for.
  fetchedAt: number | null
  deadline: number
  settle: (result: BridgeJobResult) => void
  timer: NodeJS.Timeout
}

export class JobQueue {
  private readonly jobs = new Map<string, QueuedJob>()
  private readonly pickupMs: number
  private readonly answerMs: number
  private readonly now: () => number
  private readonly listeners = new Set<(pending: number) => void>()

  constructor(options: JobQueueOptions = {}) {
    this.pickupMs = options.pickupMs ?? JOB_PICKUP_MS
    this.answerMs = options.answerMs ?? JOB_ANSWER_MS
    this.now = options.now ?? (() => Date.now())
  }

  /** Queues a job and resolves once the extension answered, or when it expired. */
  submit(request: BridgeJobRequest, caseKey?: CaseKey): Promise<BridgeJobResult> {
    if (this.jobs.size >= MAX_PENDING_JOBS) {
      return Promise.resolve({ ok: false, reason: 'queue-full' })
    }
    // A second harvest while one is already waiting would read the whole index
    // twice for the same answer.
    if (request.kind === 'template.harvest' && this.has('template.harvest')) {
      return Promise.resolve({ ok: false, reason: 'already-queued' })
    }

    const job: BridgeJob = {
      id: randomUUID(),
      protocol: BRIDGE_JOB_PROTOCOL_VERSION,
      createdAt: new Date(this.now()).toISOString(),
      ...(caseKey ? { caseKey } : {}),
      request,
    }

    return new Promise<BridgeJobResult>((resolve) => {
      const entry: QueuedJob = {
        job,
        fetchedAt: null,
        deadline: this.now() + this.pickupMs,
        settle: resolve,
        timer: setTimeout(() => this.expire(job.id), this.pickupMs),
      }
      this.jobs.set(job.id, entry)
      this.announce()
    })
  }

  has(kind: BridgeJobRequest['kind']) {
    for (const entry of this.jobs.values()) {
      if (entry.job.request.kind === kind) return true
    }
    return false
  }

  /** Jobs still waiting for a tab to take them. */
  pendingCount() {
    let count = 0
    for (const entry of this.jobs.values()) {
      if (entry.fetchedAt === null) count += 1
    }
    return count
  }

  /** Hands the waiting jobs to a tab, and starts counting the answer time.
      `abilities` is what that page can run: a mail is only written in the mail
      form, so a job never lands in a tab that would have to refuse it. */
  take(abilities?: readonly string[]) {
    const taken: BridgeJob[] = []
    for (const entry of this.jobs.values()) {
      if (entry.fetchedAt !== null) continue
      if (abilities && !abilities.includes(entry.job.request.kind)) continue
      entry.fetchedAt = this.now()
      entry.deadline = entry.fetchedAt + this.answerMs
      clearTimeout(entry.timer)
      entry.timer = setTimeout(() => this.expire(entry.job.id), this.answerMs)
      taken.push(entry.job)
    }
    if (taken.length) this.announce()
    return taken.map(serializeBridgeJob)
  }

  /** The result the extension posted. Unknown or late identifiers are refused. */
  settle(id: string, raw: unknown): { ok: true } | { ok: false; error: string } {
    const entry = this.jobs.get(id)
    if (!entry) return { ok: false, error: 'unknown-job' }
    const parsed = parseBridgeJobResult(entry.job.request.kind, raw)
    // An unreadable result leaves the job in place: the tab may post a valid
    // one before the deadline rather than losing the agent's action.
    if (!parsed.ok) return { ok: false, error: parsed.error }
    this.finish(id, parsed.result)
    return { ok: true }
  }

  subscribe(listener: (pending: number) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Drops everything, answering each caller: used when the bridge is turned off. */
  clear(reason = 'bridge-off') {
    for (const id of [...this.jobs.keys()]) this.finish(id, { ok: false, reason })
  }

  private expire(id: string) {
    const entry = this.jobs.get(id)
    if (!entry) return
    this.finish(id, { ok: false, reason: entry.fetchedAt === null ? 'no-browser' : 'timeout' })
  }

  private finish(id: string, result: BridgeJobResult) {
    const entry = this.jobs.get(id)
    if (!entry) return
    clearTimeout(entry.timer)
    this.jobs.delete(id)
    entry.settle(result)
    this.announce()
  }

  private announce() {
    const pending = this.pendingCount()
    for (const listener of this.listeners) listener(pending)
  }
}
