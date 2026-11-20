import { describe, expect, it } from 'vitest'
import {
  buildCrmTemplateIndex,
  normalizeCrmTemplateBrand,
  normalizeCrmTemplateLanguage,
  parseCrmTemplateTitle,
  resolveCrmTemplateVariant,
  type CrmTemplateIndexEntry,
} from '../crmTemplates'

const entry = (title: string, languageCode: number, id = title): CrmTemplateIndexEntry => ({
  id,
  title,
  languageCode,
})

describe('normalizeCrmTemplateLanguage', () => {
  it('reads a Dynamics code, a title token or a label', () => {
    expect(normalizeCrmTemplateLanguage(1036)).toBe('FR')
    expect(normalizeCrmTemplateLanguage('3082')).toBe('SP')
    expect(normalizeCrmTemplateLanguage('fr')).toBe('FR')
    expect(normalizeCrmTemplateLanguage('Français')).toBe('FR')
    expect(normalizeCrmTemplateLanguage('Néerlandais')).toBe('NL')
    expect(normalizeCrmTemplateLanguage('NE')).toBe('NL')
    expect(normalizeCrmTemplateLanguage('klingon')).toBeNull()
    expect(normalizeCrmTemplateLanguage(null)).toBeNull()
  })

  it('reads a brand written short or in full', () => {
    expect(normalizeCrmTemplateBrand('TM')).toBe('TM')
    expect(normalizeCrmTemplateBrand('Thrustmaster')).toBe('TM')
    expect(normalizeCrmTemplateBrand('HERCULES')).toBe('HR')
    expect(normalizeCrmTemplateBrand('Djuced')).toBe('HR')
    expect(normalizeCrmTemplateBrand('Guillemot')).toBeNull()
  })
})

describe('parseCrmTemplateTitle', () => {
  it('reads the dominant convention', () => {
    expect(parseCrmTemplateTitle('TM EN - Paid Spare Part proposal - WW')).toEqual({
      brand: 'TM',
      language: 'EN',
      zones: ['WW'],
      family: 'Paid Spare Part proposal',
      logistics: false,
    })
  })

  it('reads the LOG prefix and a compound zone', () => {
    expect(parseCrmTemplateTitle('LOG HR EN - Return label notification for RMA - message to customer EU')).toMatchObject({
      brand: 'HR',
      language: 'EN',
      logistics: true,
    })
    expect(parseCrmTemplateTitle('TM EN - RMA Proposal UW - HK TW')).toEqual({
      brand: 'TM',
      language: 'EN',
      zones: ['HK', 'TW'],
      family: 'RMA Proposal UW',
      logistics: false,
    })
  })

  it('takes the zone closing a logistics title without a separator', () => {
    const eu = parseCrmTemplateTitle('LOG TM FR - Return label notification for RMA - message to customer EU')
    const uk = parseCrmTemplateTitle('LOG TM EN - Return label notification for RMA - message to customer UK')
    expect(eu).toMatchObject({ zones: ['EU'], family: 'Return label notification for RMA - message to customer' })
    expect(uk?.family).toBe(eu?.family)
  })

  it('keeps a suffix that is not a zone inside the family', () => {
    expect(parseCrmTemplateTitle('TM EN - Paid RMA Proposal - US Ricmotech')).toEqual({
      brand: 'TM',
      language: 'EN',
      zones: [],
      family: 'Paid RMA Proposal - US Ricmotech',
      logistics: false,
    })
  })

  it('reads the inverted form and the full brand name', () => {
    expect(parseCrmTemplateTitle('Order Cancellation TM EN')).toMatchObject({
      brand: 'TM',
      language: 'EN',
      family: 'Order Cancellation',
    })
    expect(parseCrmTemplateTitle('THRUSTMASTER FR - Accusé de réception Web')).toMatchObject({
      brand: 'TM',
      language: 'FR',
      family: 'Accusé de réception Web',
    })
  })

  it('refuses what it cannot read rather than guessing', () => {
    expect(parseCrmTemplateTitle('Test WilCarlos')).toBeNull()
    expect(parseCrmTemplateTitle('PROP - email template test 1902')).toBeNull()
    expect(parseCrmTemplateTitle('Exceptional Cases EN')).toBeNull()
    expect(parseCrmTemplateTitle('')).toBeNull()
  })
})

describe('buildCrmTemplateIndex', () => {
  const index = buildCrmTemplateIndex([
    entry('TM EN - Paid Spare Part proposal - WW', 1033),
    entry('TM FR - Paid Spare Part proposal - WW', 1036),
    entry('HR EN - Paid Spare Part proposal - WW', 1033),
    entry('TM FR - 14 Day RMA - EU', 1036),
    entry('LOG TM FR - 14 Day RMA - EU', 1036, 'log'),
    entry('Test WilCarlos', 1033),
  ])

  it('folds the variants into families and keeps the rest apart', () => {
    expect(index.families.map((family) => family.key)).toEqual([
      '14-day-rma',
      'log-14-day-rma',
      'paid-spare-part-proposal',
    ])
    expect(index.unclassified.map((item) => item.title)).toEqual(['Test WilCarlos'])
  })

  it('separates a logistics family from the agent one', () => {
    const logistics = index.families.find((family) => family.logistics)
    expect(logistics?.key).toBe('log-14-day-rma')
    expect(logistics?.variants).toHaveLength(1)
  })
})

describe('resolveCrmTemplateVariant', () => {
  const family = buildCrmTemplateIndex([
    entry('TM EN - RMA Proposal UW - EU', 1033, 'tm-en-eu'),
    entry('TM FR - RMA Proposal UW - EU', 1036, 'tm-fr-eu'),
    entry('TM FR - RMA Proposal UW - WW', 1036, 'tm-fr-ww'),
    entry('HR FR - RMA Proposal UW - EU', 1036, 'hr-fr-eu'),
  ]).families[0]

  it('picks the brand, the language and the zone of the case', () => {
    expect(resolveCrmTemplateVariant(family, { brand: 'TM', language: 'FR', zone: 'EU' })).toEqual({
      variant: expect.objectContaining({ id: 'tm-fr-eu' }),
      exactZone: true,
    })
  })

  it('falls back to the worldwide variant and says the zone is not exact', () => {
    expect(resolveCrmTemplateVariant(family, { brand: 'TM', language: 'FR', zone: 'CA' })).toEqual({
      variant: expect.objectContaining({ id: 'tm-fr-ww' }),
      exactZone: false,
    })
  })

  it('refuses instead of choosing when nothing matches', () => {
    expect(resolveCrmTemplateVariant(family, { brand: 'TM', language: 'DE', zone: 'EU' })).toEqual({
      variant: null,
      reason: 'language',
    })
    expect(resolveCrmTemplateVariant(family, { brand: null, language: 'FR', zone: 'EU' })).toEqual({
      variant: null,
      reason: 'brand',
    })
  })

  it('keeps the only variant of a brand but marks its zone as not exact', () => {
    expect(resolveCrmTemplateVariant(family, { brand: 'HR', language: 'FR', zone: 'US' })).toEqual({
      variant: expect.objectContaining({ id: 'hr-fr-eu' }),
      exactZone: false,
    })
  })

  it('refuses when several zones compete and none fits', () => {
    const zoned = buildCrmTemplateIndex([
      entry('TM FR - Customs fees to refund - EU', 1036, 'eu'),
      entry('TM FR - Customs fees to refund - UK', 1036, 'uk'),
    ]).families[0]
    expect(resolveCrmTemplateVariant(zoned, { brand: 'TM', language: 'FR', zone: 'US' })).toEqual({
      variant: null,
      reason: 'zone',
    })
  })
})
