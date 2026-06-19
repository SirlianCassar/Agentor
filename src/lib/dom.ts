/* DOM-level helpers that operate on the live document selection. */

// On double-click, browsers often select trailing/leading whitespace; this trims
// the active selection (textarea/input or DOM range) back to the word itself.
export function trimDoubleClickSelection() {
  const active = document.activeElement
  if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) {
    const start = active.selectionStart
    const end = active.selectionEnd
    if (start === null || end === null || start === end) return
    let nextStart = start
    let nextEnd = end
    while (nextStart < nextEnd && /\s/.test(active.value[nextStart] ?? '')) nextStart += 1
    while (nextEnd > nextStart && /\s/.test(active.value[nextEnd - 1] ?? '')) nextEnd -= 1
    if (nextStart !== start || nextEnd !== end) {
      active.setSelectionRange(nextStart, nextEnd)
    }
    return
  }

  const selection = window.getSelection()
  if (!selection || selection.rangeCount !== 1 || selection.isCollapsed) return
  const selectedText = selection.toString()
  const leading = selectedText.match(/^\s+/)?.[0].length ?? 0
  const trailing = selectedText.match(/\s+$/)?.[0].length ?? 0
  if (!leading && !trailing) return

  const range = selection.getRangeAt(0)
  if (
    leading &&
    range.startContainer.nodeType === Node.TEXT_NODE &&
    range.startOffset + leading <= range.startContainer.textContent!.length
  ) {
    range.setStart(range.startContainer, range.startOffset + leading)
  }
  if (
    trailing &&
    range.endContainer.nodeType === Node.TEXT_NODE &&
    range.endOffset - trailing >= 0
  ) {
    range.setEnd(range.endContainer, range.endOffset - trailing)
  }
  selection.removeAllRanges()
  selection.addRange(range)
}
