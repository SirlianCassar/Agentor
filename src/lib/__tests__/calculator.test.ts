import { describe, expect, it } from 'vitest'
import {
  computeDashboardCalculatorTotals,
  createDashboardCalculatorFee,
  createDashboardCalculatorItem,
  parsePortalSparePartCopy,
  VAT_DIVISOR,
} from '../calculator'
import { parseDashboardAmount } from '../formatting'

const item = (productPrice: string, standardShipping = '', expressShipping = '', importFee = '', quantity = 1) => ({
  ...createDashboardCalculatorItem(),
  productPrice,
  standardShipping,
  expressShipping,
  importFee,
  quantity,
})
const fee = (amount: string) => ({ ...createDashboardCalculatorFee('Frais'), amount })

describe('price calculator', () => {
  it('multiplies the parts by their quantity', () => {
    const totals = computeDashboardCalculatorTotals([item('100', '', '', '', 2), item('19,99')], [], parseDashboardAmount)
    expect(totals.productsTtc).toBeCloseTo(219.99)
    expect(totals.productsHt).toBeCloseTo(219.99 / VAT_DIVISOR)
  })

  it('charges the dearest shipping in full and every other unit at half price, per option', () => {
    // Standard units: 10 + 2 (import), 10 + 2, and 6: 12 + 12 / 2 + 6 / 2.
    // Express units: 20 + 2, 20 + 2, and 8: 22 + 22 / 2 + 8 / 2.
    const totals = computeDashboardCalculatorTotals(
      [item('', '10', '20', '2', 2), item('', '6', '8')],
      [],
      parseDashboardAmount,
    )
    expect(totals.standard.shippingTtc).toBeCloseTo(21)
    expect(totals.express.shippingTtc).toBeCloseTo(37)
    expect(totals.hasImportFee).toBe(true)
  })

  it('gives parts + shipping totals HT and TTC for each option', () => {
    const totals = computeDashboardCalculatorTotals([item('50', '6', '18', '3')], [], parseDashboardAmount)
    expect(totals.standard.shippingTtc).toBeCloseTo(9)
    expect(totals.standard.shippingHt).toBeCloseTo(9 / VAT_DIVISOR)
    expect(totals.standard.totalTtc).toBeCloseTo(59)
    expect(totals.standard.totalHt).toBeCloseTo(59 / VAT_DIVISOR)
    expect(totals.express.totalTtc).toBeCloseTo(71)
    expect(totals.express.totalHt).toBeCloseTo(71 / VAT_DIVISOR)
  })

  it('adds the extra fees to both totals', () => {
    const totals = computeDashboardCalculatorTotals([item('100', '10', '30')], [fee('25'), fee(''), fee('4,50')], parseDashboardAmount)
    expect(totals.feesTtc).toBeCloseTo(29.5)
    expect(totals.standard.totalTtc).toBeCloseTo(139.5)
    expect(totals.express.totalTtc).toBeCloseTo(159.5)
  })

  it('flags an option when a priced part has no shipping price for it', () => {
    const totals = computeDashboardCalculatorTotals([item('100', '10', '')], [], parseDashboardAmount)
    expect(totals.standard.incomplete).toBe(false)
    expect(totals.express.incomplete).toBe(true)
  })

  it('counts nothing for empty or invalid amounts', () => {
    const totals = computeDashboardCalculatorTotals([item('abc', '-', 'x'), item('')], [fee('x')], parseDashboardAmount)
    expect(totals.standard.totalTtc).toBe(0)
    expect(totals.express.totalTtc).toBe(0)
  })
})

describe('Portal spare-part copy', () => {
  it('reads the part, its price and both shipping prices', () => {
    const copy = parsePortalSparePartCopy(
      'PART : GAS&CLUTCH SPRING\nSKU : 6001367\nPrice : 12,50 €\nStandard : 6,90 €\nExpress : 19,90 €',
    )
    expect(copy).toEqual({
      partName: 'GAS&CLUTCH SPRING',
      sku: '6001367',
      productPrice: '12,50',
      standardShipping: '6,90',
      expressShipping: '19,90',
      currency: '€',
    })
  })

  it('leaves NA amounts empty and keeps the currency', () => {
    const copy = parsePortalSparePartCopy('PART : X\r\nSKU : 1\r\nPrice : 1,234.50 USD\r\nStandard : NA\r\nExpress : 40.00 USD')
    expect(copy?.productPrice).toBe('1234.50')
    expect(copy?.standardShipping).toBe('')
    expect(copy?.expressShipping).toBe('40.00')
    expect(copy?.currency).toBe('USD')
  })

  it('ignores text that is not a priced Portal copy', () => {
    expect(parsePortalSparePartCopy('19,99')).toBeNull()
    expect(parsePortalSparePartCopy('PART : X\nSKU : 1')).toBeNull()
  })
})
