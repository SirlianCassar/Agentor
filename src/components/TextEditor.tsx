import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ClipboardEventHandler, KeyboardEvent, MouseEventHandler } from 'react'
import type { Token } from '../lib/utils'
import { findTokenAt, highlightText, parseTokens, stripTokenSpacing } from '../lib/utils'

const EMPTY_SELECTOR_SPACER = '\u00A0'.repeat(6)

export type ProtectedTextRange = {
  start: number
  end: number
}

export interface TextEditorHandle {
  focus: () => void
  getSelection: () => { start: number; end: number }
  setSelection: (start: number, end: number) => void
}

interface TextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  autoGrow?: boolean
  minHeight?: number
  readOnly?: boolean
  onContextMenu?: MouseEventHandler<HTMLDivElement>
  onPaste?: ClipboardEventHandler<HTMLTextAreaElement>
  protectedRanges?: ProtectedTextRange[]
}

export const TextEditor = forwardRef<TextEditorHandle, TextEditorProps>(
  (
    {
      value,
      onChange,
      placeholder,
      className,
      autoGrow = false,
      minHeight,
      readOnly,
      onContextMenu,
      onPaste,
      protectedRanges = [],
    },
    ref,
  ) => {
    const editorRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const highlightRef = useRef<HTMLPreElement>(null)
    const bubbleRef = useRef<HTMLDivElement>(null)
    const pendingSelectionRef = useRef<{ start: number; end: number } | null>(null)
    const [activeSelector, setActiveSelector] = useState<Token | null>(null)
    const [selectorBubblePos, setSelectorBubblePos] = useState<{ top: number; left: number } | null>(
      null,
    )
    const [autoHeight, setAutoHeight] = useState<number | null>(null)
    const isEmpty = !value.trim()

    const normalizedProtectedRanges = useMemo(
      () =>
        protectedRanges
          .filter((range) => range.end > range.start)
          .map((range) => ({
            start: Math.max(0, Math.min(range.start, value.length)),
            end: Math.max(0, Math.min(range.end, value.length)),
          }))
          .filter((range) => range.end > range.start)
          .sort((a, b) => a.start - b.start),
      [protectedRanges, value.length],
    )

    const highlighted = useMemo(() => {
      const html = highlightText(value)
      if (!value) return ' '
      return value.endsWith('\n') ? `${html}\n ` : html
    }, [value])

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      getSelection: () => {
        const start = textareaRef.current?.selectionStart ?? 0
        const end = textareaRef.current?.selectionEnd ?? 0
        return { start, end }
      },
      setSelection: (start: number, end: number) => {
        textareaRef.current?.setSelectionRange(start, end)
      },
    }))

    const getCaretCoordinates = useCallback((textarea: HTMLTextAreaElement, position: number) => {
      const div = document.createElement('div')
      const style = window.getComputedStyle(textarea)
      div.style.position = 'absolute'
      div.style.visibility = 'hidden'
      div.style.whiteSpace = 'pre-wrap'
      div.style.wordWrap = 'break-word'
      div.style.boxSizing = style.boxSizing
      div.style.width = `${textarea.clientWidth}px`
      div.style.padding = style.padding
      div.style.border = style.border
      div.style.fontFamily = style.fontFamily
      div.style.fontSize = style.fontSize
      div.style.fontWeight = style.fontWeight
      div.style.lineHeight = style.lineHeight
      div.style.letterSpacing = style.letterSpacing
      div.style.textAlign = style.textAlign
      div.style.textTransform = style.textTransform
      div.style.textRendering = style.textRendering

      div.textContent = textarea.value.substring(0, position)
      const span = document.createElement('span')
      span.textContent = textarea.value.substring(position) || '.'
      div.appendChild(span)
      document.body.appendChild(div)

      const coords = { top: span.offsetTop, left: span.offsetLeft }
      document.body.removeChild(div)
      return coords
    }, [])

    const updateSelectorBubblePosition = useCallback((selector: Token | null) => {
      if (!selector) {
        setSelectorBubblePos(null)
        return
      }
      const textarea = textareaRef.current
      const editor = editorRef.current
      if (!textarea || !editor) return

      const coords = getCaretCoordinates(textarea, selector.start)
      const style = window.getComputedStyle(textarea)
      const lineHeight = Number.parseFloat(style.lineHeight) || 24
      const bubbleWidth = bubbleRef.current?.offsetWidth ?? 220
      const bubbleHeight = bubbleRef.current?.offsetHeight ?? 40
      const maxLeft = editor.clientWidth - bubbleWidth - 12

      let left = coords.left - textarea.scrollLeft
      let top = coords.top - textarea.scrollTop + lineHeight + 6
      left = Math.max(12, Math.min(left, maxLeft))

      if (top + bubbleHeight > editor.clientHeight - 12) {
        top = coords.top - textarea.scrollTop - bubbleHeight - 8
      }

      setSelectorBubblePos({ top, left })
    }, [getCaretCoordinates])

    const syncScroll = useCallback(() => {
      if (!textareaRef.current || !highlightRef.current) return
      highlightRef.current.scrollTop = textareaRef.current.scrollTop
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
      updateSelectorBubblePosition(activeSelector)
    }, [activeSelector, updateSelectorBubblePosition])

    const updateActiveSelector = () => {
      if (readOnly) return
      if (!textareaRef.current) return
      const position = textareaRef.current.selectionStart ?? 0
      const token = findTokenAt(value, position)
      const selector =
        token && (token.type === 'selector' || token.type === 'addition') ? token : null
      setActiveSelector(selector)
      updateSelectorBubblePosition(selector)
    }

    const getProtectedRangeAt = useCallback(
      (position: number, includeEdges = false) =>
        normalizedProtectedRanges.find((range) =>
          includeEdges
            ? position >= range.start && position <= range.end
            : position > range.start && position < range.end,
        ) ?? null,
      [normalizedProtectedRanges],
    )

    const getIntersectingProtectedRange = useCallback(
      (start: number, end: number) =>
        normalizedProtectedRanges.find((range) => start < range.end && end > range.start) ?? null,
      [normalizedProtectedRanges],
    )

    const moveSelectionOutsideProtectedRange = useCallback(
      (range: ProtectedTextRange) => {
        const textarea = textareaRef.current
        if (!textarea) return

        const lineStart = value.lastIndexOf('\n', Math.max(0, range.start - 1)) + 1
        const previousLineEnd = lineStart > 0 ? lineStart - 1 : -1
        const belowLineStart = value[range.end] === '\n' ? range.end + 1 : -1

        const next =
          belowLineStart >= 0
          ? belowLineStart
          : previousLineEnd >= 0
          ? previousLineEnd
          : range.start

        textarea.setSelectionRange(next, next)
      },
      [value],
    )

    const correctProtectedSelection = useCallback(() => {
      const textarea = textareaRef.current
      if (!textarea || !normalizedProtectedRanges.length) return false
      const { selectionStart, selectionEnd } = textarea
      if (selectionStart === selectionEnd) {
        const range = getProtectedRangeAt(selectionStart, true)
        if (!range) return false
        moveSelectionOutsideProtectedRange(range)
        setActiveSelector(null)
        return true
      }

      const range = getIntersectingProtectedRange(selectionStart, selectionEnd)
      if (!range) return false
      moveSelectionOutsideProtectedRange(range)
      setActiveSelector(null)
      return true
    }, [
      getIntersectingProtectedRange,
      getProtectedRangeAt,
      moveSelectionOutsideProtectedRange,
      normalizedProtectedRanges.length,
    ])

    useEffect(() => {
      if (!activeSelector) {
        setSelectorBubblePos(null)
        return
      }
      const handle = window.requestAnimationFrame(() => {
        updateSelectorBubblePosition(activeSelector)
      })
      return () => window.cancelAnimationFrame(handle)
    }, [activeSelector, value, updateSelectorBubblePosition])

    useEffect(() => {
      const handlePointerDown = (event: PointerEvent) => {
        const target = event.target as Node | null
        if (!target) return
        if (bubbleRef.current?.contains(target)) return
        if (editorRef.current?.contains(target)) return
        setActiveSelector(null)
      }

      window.addEventListener('pointerdown', handlePointerDown)
      return () => window.removeEventListener('pointerdown', handlePointerDown)
    }, [])

    useLayoutEffect(() => {
      if (!autoGrow) {
        setAutoHeight(null)
        return
      }
      const textarea = textareaRef.current
      if (!textarea) return
      textarea.style.height = 'auto'
      const baseHeight = textarea.scrollHeight
      const nextHeight = Math.max(minHeight ?? 0, baseHeight)
      setAutoHeight(nextHeight)
    }, [value, autoGrow, minHeight])

    useLayoutEffect(() => {
      const selection = pendingSelectionRef.current
      const textarea = textareaRef.current
      if (!selection || !textarea) return
      const max = textarea.value.length
      const start = Math.max(0, Math.min(selection.start, max))
      const end = Math.max(start, Math.min(selection.end, max))
      textarea.setSelectionRange(start, end)
      pendingSelectionRef.current = null
    }, [value])

    useLayoutEffect(() => {
      syncScroll()
    }, [activeSelector, autoHeight, highlighted, syncScroll])

    const handleClick = () => {
      if (readOnly) return
      requestAnimationFrame(() => {
        if (!textareaRef.current) return
        if (correctProtectedSelection()) return
        const position = textareaRef.current.selectionStart ?? 0
        const token = findTokenAt(value, position)
        if (token) {
          textareaRef.current.setSelectionRange(token.start, token.end)
        }
        updateActiveSelector()
      })
    }

    const handleDoubleClick = () => {
      if (readOnly) return
      requestAnimationFrame(() => {
        const textarea = textareaRef.current
        if (!textarea) return
        if (correctProtectedSelection()) return

        let start = textarea.selectionStart ?? 0
        let end = textarea.selectionEnd ?? start

        while (start > 0 && !/\s/.test(value[start - 1])) start -= 1
        while (end < value.length && !/\s/.test(value[end])) end += 1

        if (start === end) return
        if (getIntersectingProtectedRange(start, end)) return
        textarea.setSelectionRange(start, end)
        setActiveSelector(null)
      })
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (readOnly) return
      if (!textareaRef.current) return
      const { selectionStart, selectionEnd } = textareaRef.current
      if (selectionStart === null || selectionEnd === null) return

      if (normalizedProtectedRanges.length) {
        if (selectionStart !== selectionEnd) {
          const range = getIntersectingProtectedRange(selectionStart, selectionEnd)
          if (range) {
            event.preventDefault()
            moveSelectionOutsideProtectedRange(range)
            return
          }
        } else {
          const cursor = selectionStart
          const range = getProtectedRangeAt(cursor, false)
          const editsText =
            !event.metaKey &&
            !event.ctrlKey &&
            !event.altKey &&
            (event.key.length === 1 || event.key === 'Enter' || event.key === 'Tab')
          const edgeRange = editsText ? getProtectedRangeAt(cursor, true) : null
          const targetRange = range ?? edgeRange
          if (targetRange) {
            event.preventDefault()
            moveSelectionOutsideProtectedRange(targetRange)
            return
          }

          const blockedByKey = normalizedProtectedRanges.find((protectedRange) => {
            if (event.key === 'Backspace') {
              return (
                (cursor > protectedRange.start && cursor <= protectedRange.end) ||
                (cursor === protectedRange.end + 1 && value[protectedRange.end] === '\n')
              )
            }
            if (event.key === 'Delete') {
              return (
                (cursor >= protectedRange.start && cursor < protectedRange.end) ||
                (cursor === protectedRange.start - 1 && value[cursor] === '\n')
              )
            }
            return false
          })
          if (blockedByKey) {
            event.preventDefault()
            moveSelectionOutsideProtectedRange(blockedByKey)
            return
          }
        }
      }

      if (event.key !== 'Backspace' && event.key !== 'Delete') return

      const tokens = parseTokens(value)
      if (selectionStart !== selectionEnd) {
        const match = tokens.find(
          (token) => selectionStart >= token.start && selectionEnd <= token.end,
        )
        if (!match) return
        event.preventDefault()
        const next = `${value.slice(0, match.start)}${value.slice(match.end)}`
        onChange(next)
        requestAnimationFrame(() => {
          textareaRef.current?.setSelectionRange(match.start, match.start)
        })
        return
      }

      const cursor = selectionStart
      const match = tokens.find(
        (token) =>
          (cursor > token.start && cursor < token.end) ||
          (event.key === 'Backspace' && cursor === token.end) ||
          (event.key === 'Delete' && cursor === token.start),
      )

      if (!match) return
      event.preventDefault()
      const next = `${value.slice(0, match.start)}${value.slice(match.end)}`
      onChange(next)
      requestAnimationFrame(() => {
        textareaRef.current?.setSelectionRange(match.start, match.start)
      })
    }

    const handlePaste: ClipboardEventHandler<HTMLTextAreaElement> = (event) => {
      if (readOnly) return
      if (correctProtectedSelection()) {
        event.preventDefault()
        return
      }
      onPaste?.(event)
    }

    const handleSelect = () => {
      if (correctProtectedSelection()) return
      updateActiveSelector()
    }

    const handleSelectorReplace = (option: string) => {
      if (readOnly) return
      if (!activeSelector) return
      const cleanedOption = stripTokenSpacing(option)
      const replacement = cleanedOption.trim().length ? cleanedOption : ''
      const next = `${value.slice(0, activeSelector.start)}${replacement}${value.slice(
        activeSelector.end,
      )}`
      onChange(next)
      setActiveSelector(null)
      requestAnimationFrame(() => {
        const pos = activeSelector.start + replacement.length
        textareaRef.current?.setSelectionRange(pos, pos)
        textareaRef.current?.focus()
      })
    }

    const editorStyle = autoGrow
      ? {
          height: autoHeight ?? undefined,
          minHeight: minHeight ? `${minHeight}px` : undefined,
        }
      : minHeight
      ? { minHeight: `${minHeight}px` }
      : undefined

    return (
      <div className="editor-shell">
        <div
          className={`editor ${className ?? ''}`}
          ref={editorRef}
          style={editorStyle}
          onContextMenu={onContextMenu}
        >
          <pre
            className="editor__highlight"
            ref={highlightRef}
            style={autoGrow && autoHeight ? { height: autoHeight } : undefined}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: highlighted || '' }}
          />
          <textarea
            ref={textareaRef}
            value={value}
            className="editor__input"
            style={autoGrow && autoHeight ? { height: autoHeight } : undefined}
            aria-label={placeholder ?? 'Editor'}
            readOnly={readOnly}
            onChange={(event) => {
              if (readOnly) return
              const { selectionStart, selectionEnd } = event.target
              if (selectionStart !== null && selectionEnd !== null) {
                pendingSelectionRef.current = { start: selectionStart, end: selectionEnd }
              } else {
                pendingSelectionRef.current = null
              }
              onChange(event.target.value)
            }}
            onClick={readOnly ? undefined : handleClick}
            onDoubleClick={readOnly ? undefined : handleDoubleClick}
            onKeyDown={readOnly ? undefined : handleKeyDown}
            onKeyUp={readOnly ? undefined : handleSelect}
            onPaste={readOnly ? undefined : handlePaste}
            onScroll={syncScroll}
            onSelect={readOnly ? undefined : handleSelect}
            spellCheck={false}
          />
          {isEmpty && placeholder ? (
            <div className="editor__placeholder">{placeholder}</div>
          ) : null}
          {!readOnly && activeSelector?.options?.length && selectorBubblePos ? (
            <div
              className={`editor__selector-bubble editor__selector-bubble--floating editor__selector-bubble--${activeSelector.type}`}
              ref={bubbleRef}
              style={{ top: selectorBubblePos.top, left: selectorBubblePos.left }}
            >
              {activeSelector.separator ? (
                activeSelector.options.map((option, index) => {
                  const cleanedOption = stripTokenSpacing(option)
                  const trimmed = cleanedOption.trim()
                  const isEmptyOption = !trimmed.length
                  const label = isEmptyOption ? (
                    <span className="selector-empty-block" aria-hidden="true">
                      {EMPTY_SELECTOR_SPACER}
                    </span>
                  ) : (
                    cleanedOption
                  )
                  return (
                    <button
                      key={`${option || 'empty'}-${index}`}
                      type="button"
                      className="editor__selector-option"
                      aria-label={isEmptyOption ? 'Option vide' : undefined}
                      onClick={() => handleSelectorReplace(option)}
                    >
                      {label}
                    </button>
                  )
                })
              ) : (
                <>
                  <button
                    type="button"
                    className="editor__selector-option editor__selector-option--keep"
                    onClick={() => handleSelectorReplace(activeSelector.inner)}
                  >
                    <span className="editor__selector-option-text">Keep</span>
                  </button>
                  <button
                    type="button"
                    className="editor__selector-option editor__selector-option--remove"
                    onClick={() => handleSelectorReplace('')}
                  >
                    <span className="editor__selector-option-text">Remove</span>
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    )
  },
)

TextEditor.displayName = 'TextEditor'
