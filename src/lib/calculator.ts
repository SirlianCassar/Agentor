/* Dashboard price-calculator item model and helpers. */
import { createId } from './utils'

export const VAT_DIVISOR = 1.2

export type DashboardCalculatorItem = {
  id: string
  quantity: number
  productPrice: string
  shippingPrice: string
  importFee: string
}

export type DashboardCalculatorPriceField = keyof Omit<
  DashboardCalculatorItem,
  'id' | 'quantity'
>

export type DashboardCalculatorCopyKey =
  | 'productsTtc'
  | 'productsHt'
  | 'shippingTtc'
  | 'shippingHt'
  | 'feesTtc'
  | 'feesHt'
  | 'totalTtc'
  | 'totalHt'

export const createDashboardCalculatorItem = (): DashboardCalculatorItem => ({
  id: createId('dashboard-calculator'),
  quantity: 1,
  productPrice: '',
  shippingPrice: '',
  importFee: '',
})

export const getDashboardCalculatorQuantity = (quantity: number | undefined) =>
  Math.max(1, Math.min(99, Math.round(quantity || 1)))

// Extra fee added to the total when needed (repair, handling…), entered TTC.
export type DashboardCalculatorFee = {
  id: string
  label: string
  amount: string
}

export const createDashboardCalculatorFee = (label = ''): DashboardCalculatorFee => ({
  id: createId('dashboard-calculator-fee'),
  label,
  amount: '',
})

export interface DashboardCalculatorTotals {
  productsTtc: number
  shippingTtc: number
  feesTtc: number
  totalTtc: number
  productsHt: number
  shippingHt: number
  feesHt: number
  totalHt: number
}

// Products: price × quantity. Shipping: each unit's shipping and import fee;
// the most expensive one in full, every other one at half price. Fees: added
// as they are. HT is TTC divided by the VAT rate.
export function computeDashboardCalculatorTotals(
  items: DashboardCalculatorItem[],
  fees: DashboardCalculatorFee[],
  parseAmount: (value: string) => number | null,
): DashboardCalculatorTotals {
  const entries = items.map((item) => ({
    quantity: getDashboardCalculatorQuantity(item.quantity),
    product: parseAmount(item.productPrice) ?? 0,
    shipping: (parseAmount(item.shippingPrice) ?? 0) + (parseAmount(item.importFee) ?? 0),
  }))
  const productsTtc = entries.reduce((sum, item) => sum + item.product * item.quantity, 0)
  const shippingValues = entries
    .flatMap((item) => (item.shipping > 0 ? Array<number>(item.quantity).fill(item.shipping) : []))
    .sort((left, right) => right - left)
  const shippingTtc = shippingValues.length
    ? shippingValues[0] + shippingValues.slice(1).reduce((sum, value) => sum + value / 2, 0)
    : 0
  const feesTtc = fees.reduce((sum, fee) => sum + (parseAmount(fee.amount) ?? 0), 0)
  const totalTtc = productsTtc + shippingTtc + feesTtc
  return {
    productsTtc,
    shippingTtc,
    feesTtc,
    totalTtc,
    productsHt: productsTtc / VAT_DIVISOR,
    shippingHt: shippingTtc / VAT_DIVISOR,
    feesHt: feesTtc / VAT_DIVISOR,
    totalHt: totalTtc / VAT_DIVISOR,
  }
}
