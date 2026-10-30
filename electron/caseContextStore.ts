import {
  applyObservations,
  confirmField,
  filterImported,
  resolveCaseImport,
  withoutUnimported,
  type CaseImportKey,
  isContextExpired,
  resolveContextForCase,
  setFieldManually,
  type CaseContext,
  type ContextFieldKey,
} from '../src/context/caseContext'
import type { BridgeMessage } from '../src/context/bridgeMessages'
import { readJsonObject, writeFileAtomic } from './dataFile'
import fs from 'node:fs'

// Single owner of the active case context. Every window reads it from here, so
// two dashboards can never show two different cases. It lives in its own file,
// apart from the user's templates and settings, and expires after 12 hours.
export class CaseContextStore {
  private context: CaseContext | null = null
  private imports: Record<CaseImportKey, boolean> = resolveCaseImport(undefined)
  private readonly listeners = new Set<(context: CaseContext | null) => void>()

  constructor(
    private readonly filePath: string,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {
    const saved = readJsonObject(filePath) as CaseContext | null
    if (saved?.schema === 'agentor.case-context/1' && saved.caseKey && saved.fields) {
      this.context = isContextExpired(saved, this.now()) ? null : saved
    }
    if (!this.context) this.persist()
  }

  get(): CaseContext | null {
    return this.context
  }

  subscribe(listener: (context: CaseContext | null) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  // Fields the user chose to import (Paramètres › Données importées). Values
  // already kept for a field just turned off are dropped at once.
  setImports(raw: unknown) {
    this.imports = resolveCaseImport(raw)
    if (this.context) this.set(withoutUnimported(this.context, this.imports))
  }

  handleBridgeMessage(message: BridgeMessage) {
    if (message.type === 'case.left') {
      // Leaving a case keeps its context: the user often switches to Knack or
      // Portal while still working on it. Another case replaces it.
      return
    }
    const now = this.now()
    let next = resolveContextForCase(this.context, message.caseKey, now)
    next = applyObservations(next, filterImported(message.observations, this.imports))
    if (message.lastTask !== undefined && this.imports.lastTask) next = { ...next, lastTask: message.lastTask }
    this.set(next)
  }

  setManual(caseId: string, key: ContextFieldKey, value: string) {
    if (!this.isCurrent(caseId)) return false
    this.set(setFieldManually(this.context as CaseContext, key, value, this.now()))
    return true
  }

  confirm(caseId: string, key: ContextFieldKey) {
    if (!this.isCurrent(caseId)) return false
    this.set(confirmField(this.context as CaseContext, key, this.now()))
    return true
  }

  clear() {
    this.set(null)
  }

  // Edits name the case they were made for, so a late click on a closed case
  // cannot land on the next one.
  private isCurrent(caseId: string) {
    return this.context?.caseKey.id === caseId
  }

  private set(next: CaseContext | null) {
    if (next === this.context) return
    this.context = next
    this.persist()
    this.listeners.forEach((listener) => listener(next))
  }

  private persist() {
    try {
      if (this.context) {
        writeFileAtomic(this.filePath, JSON.stringify(this.context))
      } else {
        fs.rmSync(this.filePath, { force: true })
      }
    } catch (error) {
      console.warn('[case-context] could not persist', error)
    }
  }
}
