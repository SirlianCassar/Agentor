/* The holes a CRM template leaves in its merged body, and the tags they become.

   The CRM merges a template with the case on its own: the customer's name, the
   address, the agent's first name and the signature arrive filled. What it
   cannot know is what the agent decided — the part, its price, the shipping —
   and the templates leave those as stars:

     - ***SPARE PART*** unit price: ***€
     - Standard shipping cost: ***€

   Those are exactly the values the calculator produces. So a hole is not a new
   kind of thing: it is turned into an Agentor tag, and the merged body becomes
   an ordinary template text that the existing fill pipeline handles. A hole
   nobody mapped keeps its stars, visible, rather than being guessed at. */
import { MAIL_SLOT_TAGS, type MailSlotKey, MAIL_SLOT_KEYS } from './mailSlots'

// A run of three stars or more: the templates are not consistent about four.
const STAR_RUN = /\*{3,}/
const STAR_BLOCK = /\*{3,}([^*]+)\*{3,}/g

export interface CrmTemplateHole {
  // Matched against the text inside a ***…*** block, folded, as a fragment.
  marker?: string
  // Matched against the whole line, folded, as a fragment. The first bare run
  // of stars on that line is the hole.
  line?: string
  source: MailSlotKey
}

export type CrmTemplateHoleMap = Record<string, CrmTemplateHole[]>

/* Shipped as data, by family key (see crmTemplateFamilyKey). Only the family
   the calculator actually feeds is described: a second one is a few lines
   here, or an override in the saved settings, not a release of the
   extension. */
export const DEFAULT_CRM_TEMPLATE_HOLES: CrmTemplateHoleMap = {
  'paid-spare-part-proposal': [
    { marker: 'spare part', source: 'partName' },
    { line: 'unit price', source: 'productPrice' },
    { line: 'standard shipping', source: 'standardShipping' },
    { line: 'express shipping', source: 'expressShipping' },
  ],
}

const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('fr')

/** Reads a map saved in the settings; anything unreadable is left out. */
export function normalizeCrmTemplateHoles(raw: unknown): CrmTemplateHoleMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const map: CrmTemplateHoleMap = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue
    const holes: CrmTemplateHole[] = []
    for (const item of value) {
      const hole = item as Partial<CrmTemplateHole> | null
      if (!hole || typeof hole !== 'object') continue
      if (!MAIL_SLOT_KEYS.includes(hole.source as MailSlotKey)) continue
      const marker = typeof hole.marker === 'string' ? hole.marker.trim().slice(0, 80) : ''
      const line = typeof hole.line === 'string' ? hole.line.trim().slice(0, 80) : ''
      if (!marker && !line) continue
      holes.push({ source: hole.source as MailSlotKey, ...(marker ? { marker } : {}), ...(line ? { line } : {}) })
    }
    if (holes.length) map[key] = holes
  }
  return map
}

export interface CrmTemplateHoleResult {
  text: string
  // The tags the holes became, in the order they appear.
  marked: string[]
  // Stars left in the body: holes nobody described, which the agent completes.
  remaining: number
}

/** Turns the holes of a family into Agentor tags. The rest is left untouched. */
export function markCrmTemplateHoles(
  body: string,
  familyKey: string | undefined,
  map: CrmTemplateHoleMap = DEFAULT_CRM_TEMPLATE_HOLES,
): CrmTemplateHoleResult {
  const holes = (familyKey && map[familyKey]) || []
  const marked: string[] = []
  let text = body

  // Blocks first: `***SPARE PART***` is one hole, not two runs of stars.
  for (const hole of holes.filter((item) => item.marker)) {
    const needle = fold(hole.marker as string)
    let replaced = false
    text = text.replace(STAR_BLOCK, (raw, inner: string) => {
      if (replaced || !fold(inner).includes(needle)) return raw
      replaced = true
      marked.push(MAIL_SLOT_TAGS[hole.source])
      return MAIL_SLOT_TAGS[hole.source]
    })
  }

  // Then the bare runs, line by line: a hole belongs to the label beside it.
  const lines = text.split(/\r?\n/)
  for (const hole of holes.filter((item) => item.line)) {
    const needle = fold(hole.line as string)
    const index = lines.findIndex((line) => fold(line).includes(needle) && STAR_RUN.test(line))
    if (index === -1) continue
    lines[index] = lines[index].replace(STAR_RUN, MAIL_SLOT_TAGS[hole.source])
    marked.push(MAIL_SLOT_TAGS[hole.source])
  }
  text = lines.join('\n')

  return { text, marked, remaining: (text.match(/\*{3,}/g) ?? []).length }
}
