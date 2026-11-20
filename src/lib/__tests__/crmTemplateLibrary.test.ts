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

  it('says why a family cannot be resolved instead of choosing one', () => {
    // A product named after its model alone leaves the brand open.
    const { entries } = buildCrmSearchEntries(index, { productName: 'T598', country: 'France' })
    const rma = entries.find((entry) => entry.title === '14 Day RMA')
    expect(rma?.preview).toBe('Marque du dossier inconnue — à choisir')
    expect(rma?.language).toBeUndefined()
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
    expect(readCrmLibraryId('family:')).toBeNull()
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
