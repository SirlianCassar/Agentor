/* Dashboard price-calculator item model and helpers. */
import { createId } from './utils'

export const VAT_DIVISOR = 1.2

// One spare part. Its two shipping prices are the Standard and the Express
// offer; the import fee is added to whichever of the two is proposed.
export type DashboardCalculatorItem = {
  id: string
  quantity: number
  partName: string
  sku: string
  productPrice: string
  standardShipping: string
  expressShipping: string
  importFee: string
}

export type DashboardCalculatorPriceField =
  | 'productPrice'
  | 'standardShipping'
  | 'expressShipping'
  | 'importFee'

export type DashboardCalculatorShippingOption = 'standard' | 'express'

export const DASHBOARD_CALCULATOR_SHIPPING_OPTIONS: Array<{
  option: DashboardCalculatorShippingOption
  label: string
  field: 'standardShipping' | 'expressShipping'
}> = [
  { option: 'standard', label: 'Standard', field: 'standardShipping' },
  { option: 'express', label: 'Express', field: 'expressShipping' },
]

export type DashboardCalculatorCopyKey =
  | 'productsTtc'
  | 'productsHt'
  | 'feesTtc'
  | 'feesHt'
  | `${DashboardCalculatorShippingOption}${'Shipping' | 'Total'}${'Ht' | 'Ttc'}`

export const createDashboardCalculatorItem = (): DashboardCalculatorItem => ({
  id: createId('dashboard-calculator'),
  quantity: 1,
  partName: '',
  sku: '',
  productPrice: '',
  standardShipping: '',
  expressShipping: '',
  importFee: '',
})

export const getDashboardCalculatorQuantity = (quantity: number | undefined) =>
  Math.max(1, Math.min(99, Math.round(quantity || 1)))

export const isDashboardCalculatorItemBlank = (item: DashboardCalculatorItem) =>
  !item.partName.trim() &&
  !item.sku.trim() &&
  !item.productPrice.trim() &&
  !item.standardShipping.trim() &&
  !item.expressShipping.trim() &&
  !item.importFee.trim()

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

export interface DashboardCalculatorOptionTotals {
  shippingTtc: number
  shippingHt: number
  totalTtc: number
  totalHt: number
  // A part with a price has no shipping price for this option.
  incomplete: boolean
}

export interface DashboardCalculatorTotals {
  productsTtc: number
  productsHt: number
  feesTtc: number
  feesHt: number
  hasImportFee: boolean
  standard: DashboardCalculatorOptionTotals
  express: DashboardCalculatorOptionTotals
}

// Products: price × quantity. Shipping, for each option: each unit's shipping
// price plus its import fee; the most expensive one in full, every other one
// at half price. Fees: added as they are. HT is TTC divided by the VAT rate.
export function computeDashboardCalculatorTotals(
  items: DashboardCalculatorItem[],
  fees: DashboardCalculatorFee[],
  parseAmount: (value: string) => number | null,
): DashboardCalculatorTotals {
  const entries = items.map((item) => ({
    item,
    quantity: getDashboardCalculatorQuantity(item.quantity),
    product: parseAmount(item.productPrice),
    importFee: parseAmount(item.importFee) ?? 0,
  }))
  const productsTtc = entries.reduce((sum, entry) => sum + (entry.product ?? 0) * entry.quantity, 0)
  const feesTtc = fees.reduce((sum, fee) => sum + (parseAmount(fee.amount) ?? 0), 0)

  const optionTotals = (field: 'standardShipping' | 'expressShipping'): DashboardCalculatorOptionTotals => {
    let incomplete = false
    const shippingValues = entries
      .flatMap((entry) => {
        const shipping = parseAmount(entry.item[field])
        if (shipping === null && (entry.product ?? 0) > 0) incomplete = true
        const unit = (shipping ?? 0) + entry.importFee
        return unit > 0 ? Array<number>(entry.quantity).fill(unit) : []
      })
      .sort((left, right) => right - left)
    const shippingTtc = shippingValues.length
      ? shippingValues[0] + shippingValues.slice(1).reduce((sum, value) => sum + value / 2, 0)
      : 0
    const totalTtc = productsTtc + shippingTtc + feesTtc
    return {
      shippingTtc,
      shippingHt: shippingTtc / VAT_DIVISOR,
      totalTtc,
      totalHt: totalTtc / VAT_DIVISOR,
      incomplete,
    }
  }

  return {
    productsTtc,
    productsHt: productsTtc / VAT_DIVISOR,
    feesTtc,
    feesHt: feesTtc / VAT_DIVISOR,
    hasImportFee: entries.some((entry) => entry.importFee > 0),
    standard: optionTotals('standardShipping'),
    express: optionTotals('expressShipping'),
  }
}

export interface PortalSparePartCopy {
  partName: string
  sku: string
  productPrice: string
  standardShipping: string
  expressShipping: string
  // Currency shown by Portal (€, USD, CAD…), empty when no amount carried one.
  currency: string
}

// Reads what Cairm's copy button on Portal's spare-parts table puts in the
// clipboard:
//   PART : <name>
//   SKU : <sku>
//   Price : 12,50 €
//   Standard : 6,90 €
//   Express : 19,90 €
// "NA" means Portal has no amount. Returns null when the text has no price
// line, so ordinary text pasted into a field is left alone.
export function parsePortalSparePartCopy(text: string): PortalSparePartCopy | null {
  const values = new Map<string, string>()
  for (const line of String(text || '').split(/\r?\n/)) {
    const match = line.match(/^\s*(part|sku|price|standard|express)\s*:\s*(.*?)\s*$/i)
    if (match) values.set(match[1].toLowerCase(), match[2])
  }
  if (!values.has('price') && !values.has('standard') && !values.has('express')) return null
  let currency = ''
  const amount = (key: string) => {
    const raw = values.get(key) || ''
    if (!raw || /^n\/?a$/i.test(raw)) return ''
    const number = raw.match(/-?\d[\d\s.,]*/)
    if (!number) return ''
    const unit = raw.replace(number[0], '').trim()
    if (unit && !currency) currency = unit
    let digits = number[0].replace(/\s+/g, '')
    // "1.234,50" or "1,234.50": the first separator groups thousands.
    if (digits.includes('.') && digits.includes(',')) {
      const thousands = digits.indexOf('.') < digits.indexOf(',') ? '.' : ','
      digits = digits.split(thousands).join('')
    }
    return digits.replace(/[.,]$/, '')
  }
  const textValue = (key: string) => {
    const raw = (values.get(key) || '').trim()
    return /^n\/?a$/i.test(raw) ? '' : raw
  }
  return {
    partName: textValue('part'),
    sku: textValue('sku'),
    productPrice: amount('price'),
    standardShipping: amount('standard'),
    expressShipping: amount('express'),
    currency,
  }
}
