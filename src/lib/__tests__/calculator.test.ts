import { describe, expect, it } from 'vitest'
import {
  computeDashboardCalculatorTotals,
  createDashboardCalculatorFee,
  createDashboardCalculatorItem,
  VAT_DIVISOR,
} from '../calculator'
import { parseDashboardAmount } from '../formatting'

const item = (productPrice: string, shippingPrice = '', importFee = '', quantity = 1) => ({
  ...createDashboardCalculatorItem(),
  productPrice,
  shippingPrice,
  importFee,
  quantity,
})
const fee = (amount: string) => ({ ...createDashboardCalculatorFee('Frais'), amount })

describe('price calculator', () => {
  it('multiplies the products by their quantity', () => {
    const totals = computeDashboardCalculatorTotals([item('100', '', '', 2), item('19,99')], [], parseDashboardAmount)
    expect(totals.productsTtc).toBeCloseTo(219.99)
    expect(totals.productsHt).toBeCloseTo(219.99 / VAT_DIVISOR)
  })

  it('charges the dearest shipping in full and every other unit at half price', () => {
    // Units: 10 + 2 (import), 10 + 2, and 6: 12 + 12 / 2 + 6 / 2.
    const totals = computeDashboardCalculatorTotals([item('', '10', '2', 2), item('', '6')], [], parseDashboardAmount)
    expect(totals.shippingTtc).toBeCloseTo(21)
  })

  it('adds the extra fees to the total', () => {
    const totals = computeDashboardCalculatorTotals([item('100', '10')], [fee('25'), fee(''), fee('4,50')], parseDashboardAmount)
    expect(totals.feesTtc).toBeCloseTo(29.5)
    expect(totals.totalTtc).toBeCloseTo(139.5)
    expect(totals.totalHt).toBeCloseTo(139.5 / VAT_DIVISOR)
  })

  it('counts nothing for empty or invalid amounts', () => {
    const totals = computeDashboardCalculatorTotals([item('abc', '-'), item('')], [fee('x')], parseDashboardAmount)
    expect(totals.totalTtc).toBe(0)
  })
})
