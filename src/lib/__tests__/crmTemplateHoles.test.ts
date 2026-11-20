import { describe, expect, it } from 'vitest'
import { DEFAULT_CRM_TEMPLATE_HOLES, markCrmTemplateHoles, normalizeCrmTemplateHoles } from '../crmTemplateHoles'
import { buildMailSlots, fillMailSlots } from '../mailSlots'
import { createDashboardCalculatorItem } from '../calculator'

// The body as the CRM returns it, merged with the case.
const paidSparePart = [
  'Hello Jean,',
  '',
  'Here is our offer:',
  '- ***SPARE PART*** unit price: ***€',
  '- Standard shipping cost: ***€',
  '- Express shipping cost: ***€',
  '***ATTACH A PDF ON HOW TO REPLACE THE PART, IF IT APPLIES***',
  '',
  'Best regards,',
].join('\n')

describe('CRM template holes', () => {
  it('turns the described holes of a family into tags', () => {
    const result = markCrmTemplateHoles(paidSparePart, 'paid-spare-part-proposal')
    expect(result.text).toContain('- <PIECE> unit price: <PRIX_UNITAIRE>€')
    expect(result.text).toContain('- Standard shipping cost: <PORT_STANDARD>€')
    expect(result.text).toContain('- Express shipping cost: <PORT_EXPRESS>€')
    expect(result.marked).toEqual(['<PIECE>', '<PRIX_UNITAIRE>', '<PORT_STANDARD>', '<PORT_EXPRESS>'])
  })

  it('leaves the holes nobody described exactly as written', () => {
    const result = markCrmTemplateHoles(paidSparePart, 'paid-spare-part-proposal')
    // The instruction to attach a PDF is the agent's business, not a value.
    expect(result.text).toContain('***ATTACH A PDF ON HOW TO REPLACE THE PART, IF IT APPLIES***')
    expect(result.remaining).toBe(2)
  })

  it('leaves an unknown family untouched', () => {
    const result = markCrmTemplateHoles(paidSparePart, '14-day-rma')
    expect(result.text).toBe(paidSparePart)
    expect(result.marked).toEqual([])
  })

  it('fills the tags from the calculator, and keeps the empty ones', () => {
    const item = {
      ...createDashboardCalculatorItem(),
      partName: 'Pédalier T-LCM',
      sku: '4060156',
      productPrice: '89,99',
      standardShipping: '12,90',
      expressShipping: '',
      importFee: '',
    }
    const marked = markCrmTemplateHoles(paidSparePart, 'paid-spare-part-proposal')
    const { text, filled } = fillMailSlots(marked.text, buildMailSlots([item]))
    expect(text).toContain('- Pédalier T-LCM unit price: 89,99€')
    expect(text).toContain('- Standard shipping cost: 12,90€')
    // Nothing was entered for the express shipping: its tag stays visible.
    expect(text).toContain('- Express shipping cost: <PORT_EXPRESS>€')
    expect(filled).toEqual(['<PIECE>', '<PRIX_UNITAIRE>', '<PORT_STANDARD>'])
  })

  it('reads a saved map and drops what it cannot read', () => {
    const map = normalizeCrmTemplateHoles({
      '14-day-rma': [
        { line: 'order number', source: 'sku' },
        { line: 'order number', source: 'unknownSlot' },
        { source: 'sku' },
        'nonsense',
      ],
      'empty-family': [],
      broken: 'nonsense',
    })
    expect(map).toEqual({ '14-day-rma': [{ line: 'order number', source: 'sku' }] })
  })

  it('ships a map only for the family the calculator feeds', () => {
    expect(Object.keys(DEFAULT_CRM_TEMPLATE_HOLES)).toEqual(['paid-spare-part-proposal'])
  })
})
