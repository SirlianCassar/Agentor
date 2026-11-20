/* The values Agentor hands the extension to fill the `***` a CRM template
   leaves in its merged body: the spare part and its three prices, taken from
   the calculator. The order is the one the templates use. */
import { isDashboardCalculatorItemBlank, type DashboardCalculatorItem } from './calculator'

export const MAIL_SLOT_KEYS = ['partName', 'sku', 'productPrice', 'standardShipping', 'expressShipping'] as const
export type MailSlotKey = (typeof MAIL_SLOT_KEYS)[number]
export type MailSlots = Partial<Record<MailSlotKey, string>>

// The tag each value is written as, so a hole left by a CRM template becomes an
// ordinary Agentor tag, filled by the same pipeline as <CLIENT> or <PRODUIT>.
export const MAIL_SLOT_TAGS: Record<MailSlotKey, string> = {
  partName: '<PIECE>',
  sku: '<SKU>',
  productPrice: '<PRIX_UNITAIRE>',
  standardShipping: '<PORT_STANDARD>',
  expressShipping: '<PORT_EXPRESS>',
}

export const mailSlotLabels: Record<MailSlotKey, string> = {
  partName: 'Pièce',
  sku: 'SKU',
  productPrice: 'Prix unitaire',
  standardShipping: 'Port standard',
  expressShipping: 'Port express',
}

const clean = (value: string | undefined) => (typeof value === 'string' ? value.trim() : '')

/** Reads the first part the agent actually filled in. An empty slot is left out. */
export function buildMailSlots(items: DashboardCalculatorItem[]): MailSlots {
  const item = items.find((candidate) => !isDashboardCalculatorItemBlank(candidate))
  if (!item) return {}
  const slots: MailSlots = {}
  for (const key of MAIL_SLOT_KEYS) {
    const value = clean(item[key])
    if (value) slots[key] = value
  }
  return slots
}

/** Keeps only what the bridge may carry: short strings, known keys. */
export function sanitizeMailSlots(raw: unknown): MailSlots {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const slots: MailSlots = {}
  for (const key of MAIL_SLOT_KEYS) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) slots[key] = value.trim().slice(0, 200)
  }
  return slots
}

/** Fills the slot tags. An empty slot keeps its tag, visible and uninvented. */
export function fillMailSlots(text: string, slots: MailSlots) {
  const filled: string[] = []
  let result = text
  for (const key of MAIL_SLOT_KEYS) {
    const value = slots[key]
    if (!value) continue
    const tag = MAIL_SLOT_TAGS[key]
    if (!result.includes(tag)) continue
    result = result.split(tag).join(value)
    filled.push(tag)
  }
  return { text: result, filled }
}
