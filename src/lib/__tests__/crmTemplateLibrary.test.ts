import { describe, expect, it } from 'vitest'
import { buildCrmTemplateIndex } from '../crmTemplates'
import {
  buildCrmSearchEntries,
  CRM_LIBRARY_FOLDER_ID,
  CRM_UNCLASSIFIED_FOLDER_ID,
  crmLanguageToAppLanguage,
  crmTemplateAsMailTemplate,
  readCrmLibraryId,
} from '../crmTemplateLibrary'
import { searchLibrary } from '../unifiedSearch'

const index = buildCrmTemplateIndex([
  { id: 'a1', title: 'TM EN - Paid Spare Part proposal - WW', languageCode: 1033 },
  { id: 'a2', title: 'TM FR - Paid Spare Part proposal - WW', languageCode: 1036 },
  { id: 'b1', title: 'TM FR - 14 Day RMA - EU', languageCode: 1036 },
  { id: 'b2', title: 'TM FR - 14 Day RMA - UK', languageCode: 1036 },
  { id: 'c1', title: 'LOG TM FR - Return label - message to customer EU', languageCode: 1036 },
  { id: 'd1', title: 'Test WilCarlos', languageCode: 1033 },
])

const frenchCase = { productName: 'Thrustmaster T598', country: 'France', customerLanguage: 'Français' }

describe('CRM templates as library items', () => {
  it('lists the families with the variant resolved for the case', () => {
    const { entries } = buildCrmSearchEntries(index, frenchCase)
    const rma = entries.find((entry) => entry.title === '14 Day RMA')
    expect(rma).toMatchObject({
      kind: 'crm',
      id: 'family:14-day-rma',
      folderId: CRM_LIBRARY_FOLDER_ID,
      preview: 'TM FR - 14 Day RMA - EU',
      language: 'FR',
    })
  })

  it('offers the variants when the case does not decide, instead of a dead end', () => {
    // A product named after its model leaves the brand open, and no default is set.
    const { entries } = buildCrmSearchEntries(index, { productName: 'T598', country: 'France' })
    expect(entries.find((entry) => entry.title === '14 Day RMA')).toBeUndefined()
    const variants = entries.filter((entry) => entry.title.startsWith('14 Day RMA ·'))
    expect(variants.map((entry) => entry.id)).toEqual([
      'variant:14-day-rma:b1',
      'variant:14-day-rma:b2',
    ])
    expect(variants[0].preview).toBe('Marque du dossier inconnue — variante choisie à la main')
    expect(variants[0].title).toBe('14 Day RMA · TM FR · EU')
  })

  it('resolves the family on the default brand, and says the brand came from there', () => {
    const { entries } = buildCrmSearchEntries(index, {
      productName: 'T598',
      country: 'France',
      customerLanguage: 'Français',
      defaultBrand: 'TM',
    })
    const rma = entries.find((entry) => entry.title === '14 Day RMA')
    expect(rma).toMatchObject({ id: 'family:14-day-rma', preview: 'TM FR - 14 Day RMA - EU · marque par défaut' })
  })

  it('ignores a default brand nobody can read', () => {
    const { entries } = buildCrmSearchEntries(index, { productName: 'T598', defaultBrand: 'nonsense' })
    expect(entries.some((entry) => entry.id === 'family:14-day-rma')).toBe(false)
  })

  it('keeps the logistics prefix and the unclassified titles choosable', () => {
    const { entries } = buildCrmSearchEntries(index, frenchCase)
    expect(entries.some((entry) => entry.title === 'LOG Return label - message to customer')).toBe(true)
    expect(entries.find((entry) => entry.title === 'Test WilCarlos')).toMatchObject({
      id: 'template:d1',
      folderId: CRM_UNCLASSIFIED_FOLDER_ID,
    })
  })

  it('finds a family through the titles of its variants', () => {
    const { entries } = buildCrmSearchEntries(index, frenchCase)
    const groups = searchLibrary(entries, 'spare part proposal')
    expect(groups.map((group) => group.kind)).toEqual(['crm'])
    expect(groups[0].items[0].id).toBe('family:paid-spare-part-proposal')
  })

  it('reads back what an entry stands for', () => {
    expect(readCrmLibraryId('family:14-day-rma')).toEqual({ kind: 'family', familyKey: '14-day-rma' })
    expect(readCrmLibraryId('template:a1')).toEqual({ kind: 'template', templateId: 'a1' })
    expect(readCrmLibraryId('variant:14-day-rma:b1')).toEqual({
      kind: 'variant',
      familyKey: '14-day-rma',
      templateId: 'b1',
    })
    expect(readCrmLibraryId('family:')).toBeNull()
    expect(readCrmLibraryId('variant:14-day-rma:')).toBeNull()
    expect(readCrmLibraryId('a1')).toBeNull()
  })

  it('turns a merged body into a mail template, holes tagged', () => {
    const { template, marked, remaining } = crmTemplateAsMailTemplate(
      {
        familyKey: 'paid-spare-part-proposal',
        title: 'Paid Spare Part proposal',
        subject: 'Thrustmaster - Follow up your request N° RQT-704346-2026',
        body: '- ***SPARE PART*** unit price: ***€\n***ATTACH A PDF***',
      },
      'fr',
    )
    expect(template.content).toBe('- <PIECE> unit price: <PRIX_UNITAIRE>€\n***ATTACH A PDF***')
    expect(template.description).toBe('Thrustmaster - Follow up your request N° RQT-704346-2026')
    // A CRM template is a mail: nothing is imported into a task.
    expect(template.taskImportMode).toBe('none')
    expect(marked).toEqual(['<PIECE>', '<PRIX_UNITAIRE>'])
    expect(remaining).toBe(2)
  })

  it('labels the single version with the only two languages Agentor knows', () => {
    expect(crmLanguageToAppLanguage('FR')).toBe('fr')
    expect(crmLanguageToAppLanguage('DE')).toBe('en')
    expect(crmLanguageToAppLanguage(null)).toBe('en')
  })
})
