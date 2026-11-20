import { describe, expect, it } from 'vitest'
import { buildCrmTemplateHtml, escapeTemplateHtml, isTagSafeInHtml } from '../crmTemplateHtml'
import type { TemplateBlock } from '../../context/bridgeJobs'

// The merged body as the CRM returns it: text and markup, one block per line.
const blocks: TemplateBlock[] = [
  { text: 'Hello Jean,', html: '<p>Hello Jean,</p>' },
  { text: '', html: '<p></p>' },
  { text: 'Here is our offer:', html: '<p><strong>Here is our offer:</strong></p>' },
  { text: '- ***SPARE PART*** unit price: ***€', html: '<li>- ***SPARE PART*** unit price: ***€</li>' },
  { text: '- Standard shipping cost: ***€', html: '<li>- Standard shipping cost: ***€</li>' },
]
const body = blocks.map((block) => block.text).join('\n')
const values: Record<string, string> = {
  '<PIECE>': 'Pédalier T-LCM',
  '<PRIX_UNITAIRE>': '89,99',
  '<PORT_STANDARD>': '12,90',
}
const fill = (text: string) => values[text] ?? text

describe('CRM template formatting', () => {
  it('finds a hole whose label is only partly wrapped in markup', () => {
    // "Standard shipping" is whole in the markup; the tags around the rest change nothing.
    const wrapped: TemplateBlock[] = [{ text: '- Standard shipping cost: ***€', html: '<li>- Standard shipping <b>cost</b>: ***€</li>' }]
    const result = buildCrmTemplateHtml(wrapped, wrapped[0].text, 'paid-spare-part-proposal', undefined, fill)
    expect(result.html).toBe('<li>- Standard shipping <b>cost</b>: 12,90€</li>')
  })

  it('keeps the markup of the template and fills the holes in it', () => {
    const result = buildCrmTemplateHtml(blocks, body, 'paid-spare-part-proposal', undefined, fill)
    expect(result.html).toContain('<p><strong>Here is our offer:</strong></p>')
    expect(result.html).toContain('<li>- Pédalier T-LCM unit price: 89,99€</li>')
    expect(result.html).toContain('<li>- Standard shipping cost: 12,90€</li>')
  })

  it('writes a tag nobody filled as text, so it stays readable in the mail', () => {
    const result = buildCrmTemplateHtml(
      [{ text: '- ***SPARE PART*** unit price: ***€', html: '<li>- ***SPARE PART*** unit price: ***€</li>' }],
      '- ***SPARE PART*** unit price: ***€',
      'paid-spare-part-proposal',
      undefined,
      (text) => text,
    )
    expect(result.html).toBe('<li>- &lt;PIECE&gt; unit price: &lt;PRIX_UNITAIRE&gt;€</li>')
  })

  it('escapes a value instead of letting it become markup', () => {
    const result = buildCrmTemplateHtml(
      [{ text: 'Piece: ***', html: '<p>Piece: ***</p>' }],
      'Piece: ***',
      'paid-spare-part-proposal',
      { 'paid-spare-part-proposal': [{ line: 'piece', source: 'partName' }] },
      () => '<b>oops</b> & co',
    )
    expect(result.html).toBe('<p>Piece: &lt;b&gt;oops&lt;/b&gt; &amp; co</p>')
  })

  it('gives up on the markup rather than send a body missing a value', () => {
    // The label itself is cut by a tag, so the hole is found in the text and not in the markup.
    const split: TemplateBlock[] = [{ text: '- Standard shipping cost: ***€', html: '<li>- Standard <b>shipping</b> cost: ***€</li>' }]
    const result = buildCrmTemplateHtml(split, split[0].text, 'paid-spare-part-proposal', undefined, fill)
    expect(result).toEqual({ html: null, reason: 'holes-differ' })
  })

  it('refuses a set of blocks that does not read back as the body', () => {
    expect(buildCrmTemplateHtml(blocks, 'another body', undefined, undefined, fill)).toEqual({
      html: null,
      reason: 'text-differs',
    })
    expect(buildCrmTemplateHtml([], '', undefined, undefined, fill)).toEqual({ html: null, reason: 'no-blocks' })
  })

  it('puts a line without markup in a block of its own, escaped', () => {
    const mixed: TemplateBlock[] = [
      { text: 'Line < one', html: null },
      { text: 'Line two', html: '<p>Line two</p>' },
    ]
    const result = buildCrmTemplateHtml(mixed, 'Line < one\nLine two', undefined, undefined, fill)
    expect(result).toMatchObject({ plainLines: 1 })
    expect(result.html).toBe('<div>Line &lt; one</div>\n<p>Line two</p>')
  })

  it('leaves a tag named after an HTML element alone', () => {
    expect(isTagSafeInHtml('<PIECE>')).toBe(true)
    expect(isTagSafeInHtml('<B>')).toBe(false)
    expect(escapeTemplateHtml('<a href="x">&')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;')
  })
})
