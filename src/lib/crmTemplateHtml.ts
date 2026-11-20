/* The formatting of a CRM template, kept from the CRM to the CRM.

   The merged body arrives twice: as text, which Agentor reads, tags and shows, and as the lines
   of markup it came from (see TemplateBlock). The text is what the agent works with; the markup
   is what the mail should keep, because the bold, the lists and the links were put there by
   whoever wrote the template, and redoing them by hand in Dynamics is the work this is meant to
   save.

   So the holes are marked twice, on the text and on the markup, with the same map and the same
   function. Either both readings find the same holes — and the markup, values in place, is what
   the CRM is given — or they disagree, and the plain text is sent instead. A body that lost its
   bold is a nuisance; a body that lost a price is a wrong answer to a customer. */
import { markCrmTemplateHoles, type CrmTemplateHoleMap } from './crmTemplateHoles'
import type { TemplateBlock } from '../context/bridgeJobs'

export const escapeTemplateHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/* A tag is substituted in the markup by its name, so a tag named after an HTML element would
   eat that element. Tags can be renamed in the settings, so the check is made rather than
   assumed: `<B>` stays untouched and keeps its text form, bold survives. */
const HTML_ELEMENT_NAMES = new Set([
  'A', 'B', 'BLOCKQUOTE', 'BR', 'CAPTION', 'COL', 'COLGROUP', 'DIV', 'EM', 'H1', 'H2', 'H3',
  'H4', 'H5', 'H6', 'HR', 'I', 'LI', 'OL', 'P', 'PRE', 'S', 'SMALL', 'SPAN', 'STRONG', 'SUB',
  'SUP', 'TABLE', 'TBODY', 'TD', 'TFOOT', 'TH', 'THEAD', 'TR', 'U', 'UL',
])

export const isTagSafeInHtml = (tag: string) => {
  const name = tag.replace(/^<|>$/g, '').toUpperCase()
  return Boolean(name) && !HTML_ELEMENT_NAMES.has(name)
}

export type CrmTemplateHtmlResult =
  | { html: string; plainLines: number }
  // Why the formatting could not be kept, for the agent and for the trace.
  | { html: null; reason: 'no-blocks' | 'text-differs' | 'holes-differ' }

/** The markup of the merged body, holes filled, ready for the Dynamics mail form. */
export function buildCrmTemplateHtml(
  blocks: TemplateBlock[],
  body: string,
  familyKey: string | undefined,
  holes: CrmTemplateHoleMap | undefined,
  // Replaces the tags of one line by their values, exactly as the text body is filled.
  fill: (text: string) => string,
  // Tags the text body fills too, when a template writes one in its own text (the CRM merges
  // its own fields, so this is rare): the case tags and the calculator's.
  extraTags: string[] = [],
): CrmTemplateHtmlResult {
  if (!blocks.length) return { html: null, reason: 'no-blocks' }
  const lines = blocks.map((block) => block.text)
  // The pairing is positional, so a body that does not read back line for line is not paired at
  // all: a value written on the wrong line would be invisible and wrong.
  if (lines.join('\n') !== body) return { html: null, reason: 'text-differs' }

  // A line without markup of its own travels as text: escaped, in a block of its own, so the
  // lines keep their order and their spacing.
  const asHtml = blocks.map((block) => (block.html === null ? `<div>${escapeTemplateHtml(block.text)}</div>` : block.html))
  const markedText = markCrmTemplateHoles(lines.join('\n'), familyKey, holes)
  const markedHtml = markCrmTemplateHoles(asHtml.join('\n'), familyKey, holes)
  // One block per line in both readings, so "the line that holds this label" is the same line.
  if (markedText.marked.join('\u0000') !== markedHtml.marked.join('\u0000')) {
    return { html: null, reason: 'holes-differ' }
  }

  let html = markedHtml.text
  for (const tag of new Set([...markedHtml.marked, ...extraTags])) {
    if (!isTagSafeInHtml(tag) || !html.includes(tag)) continue
    // Escaped, always: a tag left unfilled must read as `<PIECE>` in the mail, not disappear as
    // an unknown element, and a value is text, never markup.
    html = html.split(tag).join(escapeTemplateHtml(fill(tag)))
  }
  return { html, plainLines: blocks.filter((block) => block.html === null).length }
}
