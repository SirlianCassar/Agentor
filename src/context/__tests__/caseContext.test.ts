import { describe, expect, it } from 'vitest'
import {
  applyObservations,
  confirmField,
  createCaseContext,
  getUnconfirmedFields,
  isContextExpired,
  normalizeCaseId,
  resolveContextForCase,
  setFieldManually,
  type CaseKey,
} from '../caseContext'
import { fillTemplateFromContext } from '../templateFill'
import { findDuplicateCaseTags, normalizeCaseTag, resolveCaseTags } from '../caseTags'

// Fictitious case used throughout the workspace fixtures.
const caseA: CaseKey = {
  system: 'dynamics',
  entity: 'incident',
  id: '11111111-2222-4333-8444-555555555555',
  number: 'RQT-000001',
}
const caseB: CaseKey = { ...caseA, id: '99999999-2222-4333-8444-555555555555', number: 'RQT-000002' }
const t0 = '2026-10-29T08:00:00.000Z'
const t1 = '2026-10-29T08:00:05.000Z'

const loaded = () =>
  applyObservations(createCaseContext(caseA, t0), [
    { key: 'caseNumber', value: 'RQT-000001', source: 'crm', fetchedAt: t0 },
    { key: 'productName', value: 'T598', source: 'crm', fetchedAt: t0 },
    { key: 'serialNumber', value: '3030303030', source: 'crm', fetchedAt: t0 },
    { key: 'productionDate', value: '12/09/2024', source: 'crm', fetchedAt: t0 },
  ])

describe('case identity', () => {
  it('normalizes Dataverse ids and rejects anything else', () => {
    expect(normalizeCaseId('{11111111-2222-4333-8444-555555555555}')).toBe(caseA.id)
    expect(normalizeCaseId('RQT-000001')).toBeNull()
  })

  it('never carries values over to another case', () => {
    const next = resolveContextForCase(loaded(), caseB, t1)
    expect(next.caseKey.id).toBe(caseB.id)
    expect(next.fields).toEqual({})
  })

  it('keeps the context when the same case comes back', () => {
    const context = loaded()
    expect(resolveContextForCase(context, caseA, t1)).toBe(context)
  })
})

describe('observations', () => {
  it('records provenance and freshness', () => {
    const field = loaded().fields.serialNumber
    expect(field).toEqual({ value: '3030303030', status: 'auto', source: 'crm', updatedAt: t0 })
  })

  it('follows a new value from the same source', () => {
    const next = applyObservations(loaded(), [
      { key: 'serialNumber', value: '4040404040', source: 'crm', fetchedAt: t1 },
    ])
    expect(next.fields.serialNumber?.value).toBe('4040404040')
    expect(next.fields.serialNumber?.status).toBe('auto')
  })

  it('marks a disagreement between sources as a conflict', () => {
    const next = applyObservations(loaded(), [
      { key: 'productName', value: 'T598 Racing', source: 'portal', fetchedAt: t1 },
    ])
    const field = next.fields.productName
    expect(field?.status).toBe('conflict')
    expect(field?.value).toBe('T598')
    expect(field?.candidates).toEqual([{ value: 'T598 Racing', source: 'portal', fetchedAt: t1 }])
  })

  it('never overwrites a manual or confirmed value', () => {
    let context = setFieldManually(loaded(), 'serialNumber', '5050505050', t1)
    context = confirmField(context, 'productName', t1)
    context = applyObservations(context, [
      { key: 'serialNumber', value: '3030303030', source: 'crm', fetchedAt: t1 },
      { key: 'productName', value: 'Autre', source: 'crm', fetchedAt: t1 },
    ])
    expect(context.fields.serialNumber).toMatchObject({ value: '5050505050', status: 'manual' })
    expect(context.fields.productName).toMatchObject({ value: 'T598', status: 'confirmed' })
  })

  it('ignores an empty observation instead of erasing a known value', () => {
    const next = applyObservations(loaded(), [
      { key: 'serialNumber', value: '  ', source: 'crm', fetchedAt: t1 },
    ])
    expect(next.fields.serialNumber?.value).toBe('3030303030')
  })
})

describe('sensitive actions', () => {
  it('lists the fields still to check', () => {
    const context = confirmField(loaded(), 'serialNumber', t1)
    expect(getUnconfirmedFields(context, ['serialNumber', 'productionDate', 'customerName'])).toEqual([
      'productionDate',
      'customerName',
    ])
  })

  it('expires an old context', () => {
    expect(isContextExpired(loaded(), '2026-10-29T21:00:00.000Z')).toBe(true)
    expect(isContextExpired(loaded(), t1)).toBe(false)
  })
})

describe('template filling', () => {
  it('fills known tags and leaves unknown values visible', () => {
    const result = fillTemplateFromContext(
      'Dossier <DOSSIER> : produit < produit >, SN <SERIAL>, client <CLIENT>, <TAG>',
      loaded(),
    )
    expect(result.text).toBe('Dossier RQT-000001 : produit T598, SN 3030303030, client <CLIENT>, <TAG>')
    expect(result.filled).toEqual(['<DOSSIER>', '<PRODUIT>', '<SERIAL>'])
    expect(result.missing).toEqual(['<CLIENT>'])
  })

  it('does not use a conflicting value', () => {
    const context = applyObservations(loaded(), [
      { key: 'productName', value: 'Autre', source: 'portal', fetchedAt: t1 },
    ])
    expect(fillTemplateFromContext('<PRODUIT>', context).text).toBe('<PRODUIT>')
  })

  it('keeps every tag without a context', () => {
    expect(fillTemplateFromContext('<SERIAL>', null)).toEqual({
      text: '<SERIAL>',
      filled: [],
      missing: ['<SERIAL>'],
    })
  })

  it('uses the tags chosen in the settings', () => {
    const tags = resolveCaseTags({ serialNumber: 'numéro série', customerName: '' })
    expect(tags.serialNumber).toBe('<NUMERO_SERIE>')
    expect(tags.customerName).toBe('<CLIENT>')
    const result = fillTemplateFromContext('SN <NUMERO_SERIE>, ancien <SERIAL>', loaded(), tags)
    expect(result.text).toBe('SN 3030303030, ancien <SERIAL>')
  })
})

describe('case tags', () => {
  it('normalizes what the user types into a tag', () => {
    expect(normalizeCaseTag('<Date de production>')).toBe('<DATE_DE_PRODUCTION>')
    expect(normalizeCaseTag('  ')).toBeNull()
  })

  it('finds a tag used twice', () => {
    expect(findDuplicateCaseTags(resolveCaseTags({ caseTitle: 'DOSSIER' }))).toEqual(['<DOSSIER>'])
  })
})
