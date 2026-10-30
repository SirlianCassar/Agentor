import { describe, expect, it } from 'vitest'
import { normalizeRqtNumber, onlyRqtContext, createCaseContext, applyObservation } from '../caseContext'
import { fillTemplateFromContext } from '../templateFill'
import { parseBridgeMessage } from '../bridgeMessages'
import { caseTabLabel, parseCaseTabs } from '../../lib/caseTabs'

const id = '11111111-2222-4333-8444-555555555555'
const at = '2026-10-30T14:00:00Z'
const key = { system: 'dynamics' as const, entity: 'incident' as const, id, number: 'CAS-987654' }

describe('RQT references only', () => {
  it('never turns a CAS reference into an RQT', () => {
    expect(normalizeRqtNumber('CAS-987654')).toBeUndefined()
    expect(normalizeRqtNumber('CAS-123 / RQT-123456-ABCD')).toBe('RQT-123456-ABCD')
  })
  it('extracts the real RQT from the title while ignoring the CRM CAS number', () => {
    const result = parseBridgeMessage({ protocol: 1, type: 'case.observed', caseKey: key, observations: [
      {key:'caseNumber', value:'CAS-987654', source:'crm', fetchedAt:at},
      {key:'caseTitle', value:'RQT-123456-ABCD — Problème volant', source:'crm', fetchedAt:at},
      {key:'productName', value:'T598', source:'crm', fetchedAt:at},
    ] })
    expect(result.ok).toBe(true)
    if (!result.ok || result.message.type !== 'case.observed') return
    expect(result.message.caseKey.number).toBe('RQT-123456-ABCD')
    expect(result.message.observations.some((item) => item.key === 'caseNumber')).toBe(false)
    expect(result.message.observations.find((item) => item.key === 'productName')?.value).toBe('T598')
    expect(fillTemplateFromContext('<DOSSIER>', createCaseContext(result.message.caseKey, at)).text).toBe('RQT-123456-ABCD')
  })
  it('cleans CAS numbers in saved contexts and locked tabs', () => {
    const saved = { ...createCaseContext(key, at), caseKey: key, fields: { caseNumber: {value:'CAS-987654',status:'auto' as const,source:'crm' as const,updatedAt:at} } }
    const clean = onlyRqtContext(saved)
    expect(clean.caseKey.number).toBeUndefined()
    expect(clean.fields.caseNumber).toBeUndefined()
    const tabs = parseCaseTabs({ activeId:'a', tabs:[{id:'a',caseKey:{id,number:'CAS-987654'},locked:true,context:saved}] })
    expect(caseTabLabel(tabs.tabs[0],0)).toBe('RQT sans numéro')
    expect(tabs.tabs[0].context?.fields.caseNumber).toBeUndefined()
  })
  it('does not overwrite a valid RQT with a later CAS observation', () => {
    const context = createCaseContext({...key,number:'RQT-123456-ABCD'},at)
    expect(applyObservation(context,{key:'caseNumber',value:'CAS-987654',source:'crm',fetchedAt:at}).caseKey.number).toBe('RQT-123456-ABCD')
  })
})
