import { describe, expect, it } from 'vitest'
import { getTemplateVersion, getTemplateVersions, languageForCountry, pickTemplateLanguage } from '../templateLanguages'

const template = {
  language: 'fr' as const,
  content: 'Bonjour <CLIENT>',
  translations: [
    { language: 'en', content: 'Hello <CLIENT>' },
    { language: 'de', content: '' },
    { language: 'en', content: 'Duplicate' },
    { language: 'es', content: 'Hola <CLIENT>' },
  ],
}

describe('template languages', () => {
  it('lists the main version first, then each filled language once', () => {
    expect(getTemplateVersions(template).map((version) => version.language)).toEqual(['fr', 'en', 'es'])
  })

  it('returns the asked language or the main version', () => {
    expect(getTemplateVersion(template, 'es').content).toBe('Hola <CLIENT>')
    expect(getTemplateVersion(template, 'de').content).toBe('Bonjour <CLIENT>')
  })

  it('maps a CRM country to a language', () => {
    expect(languageForCountry('Espagne')).toBe('es')
    expect(languageForCountry('Royaume-Uni')).toBe('en')
    expect(languageForCountry('Japon')).toBeNull()
  })

  it('offers the country language first, then the last choice', () => {
    expect(pickTemplateLanguage(template, { country: 'Spain', lastChosen: 'en' })).toBe('es')
    expect(pickTemplateLanguage(template, { country: 'Allemagne', lastChosen: 'en' })).toBe('en')
    expect(pickTemplateLanguage(template, {})).toBe('fr')
  })
})
