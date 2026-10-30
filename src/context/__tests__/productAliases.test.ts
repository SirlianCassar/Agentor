import { describe, expect, it } from 'vitest'
import { applyObservations, createCaseContext } from '../caseContext'
import { applyProductAliases, findProductAlias, normalizeProductAliases } from '../productAliases'
import { fillTemplateFromContext } from '../templateFill'

const aliases = [
  { id: '1', crm: 'T598', alias: 'T598' },
  { id: '2', crm: 'Thrustmaster T598 Racing Wheel for PS5 / PC', alias: 'T598' },
  { id: '3', crm: 'TS-XW Racer Sparco P310 Competition Mod', alias: 'TS-XW' },
]

const context = (product: string) =>
  applyObservations(createCaseContext({ system: 'dynamics', entity: 'incident', id: 'a' }, '2026-10-29T08:00:00.000Z'), [
    { key: 'productName', value: product, source: 'crm', fetchedAt: '2026-10-29T08:00:00.000Z' },
  ])

describe('product aliases', () => {
  it('prefers the exact CRM name, ignoring case, accents and spaces', () => {
    expect(findProductAlias('  thrustmaster t598 racing wheel for ps5 / pc ', aliases)?.id).toBe('2')
  })

  it('falls back to the longest CRM name contained in the product', () => {
    expect(findProductAlias('TS-XW Racer Sparco P310 Competition Mod (EU)', aliases)?.alias).toBe('TS-XW')
    expect(findProductAlias('T248', aliases)).toBeNull()
  })

  it('fills the product tag with the short name and keeps the CRM name', () => {
    const aliased = applyProductAliases(context('TS-XW Racer Sparco P310 Competition Mod'), aliases)
    expect(aliased?.fields.productName?.value).toBe('TS-XW')
    expect(aliased?.fields.productName?.aliasOf).toBe('TS-XW Racer Sparco P310 Competition Mod')
    expect(fillTemplateFromContext('Votre <PRODUIT>', aliased).text).toBe('Votre TS-XW')
  })

  it('leaves unknown products and malformed rules alone', () => {
    const plain = context('T248')
    expect(applyProductAliases(plain, aliases)).toBe(plain)
    expect(normalizeProductAliases([{ crm: 'A', alias: 'B' }, { crm: 1 }, null])).toEqual([
      { id: 'product-alias-0', crm: 'A', alias: 'B' },
    ])
  })
})
