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
