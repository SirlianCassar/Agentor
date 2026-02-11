const CRM_ENDPOINTS = [
  'http://127.0.0.1:32100/crm/import',
  'http://localhost:32100/crm/import',
]

function normalizeText(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function queryText(selector, root = document) {
  const el = root.querySelector(selector)
  return normalizeText(el ? el.textContent : '')
}

function queryInputValue(selector, root = document) {
  const el = root.querySelector(selector)
  if (!el) return ''
  if ('value' in el) return normalizeText(el.value)
  return normalizeText(el.getAttribute('value'))
}

function findLookupValue(fieldName) {
  const exact = document.querySelector(
    `[data-id^="${fieldName}."][data-id$="selected_tag_text"]`
  )
  if (exact) return normalizeText(exact.textContent)
  const fallback = document.querySelector(
    `[data-id*="${fieldName}"][data-id$="selected_tag_text"]`
  )
  return normalizeText(fallback ? fallback.textContent : '')
}

function findRequestNumber() {
  const header = document.querySelector('[data-id="header_title"]')
  const headerText = normalizeText(
    header ? header.getAttribute('title') || header.textContent : ''
  )
  const candidates = [headerText, document.title]
  for (const candidate of candidates) {
    if (!candidate) continue
    const match = candidate.match(/RQT[-0-9]+/i)
    if (match) return match[0].toUpperCase()
  }
  return ''
}

function findGridCellValue(root, colId) {
  const selectors = [
    `.ag-center-cols-container .ag-row [col-id="${colId}"]`,
    `.ag-center-cols-container [role="gridcell"][col-id="${colId}"]`,
  ]
  for (const selector of selectors) {
    const cell = root.querySelector(selector)
    if (cell) return normalizeText(cell.textContent)
  }
  return ''
}

function findCustomerName() {
  const lookup =
    findLookupValue('customerid') ||
    findLookupValue('primarycontactid') ||
    findLookupValue('contactid')
  if (lookup) return lookup

  const customerPanel =
    document.querySelector('[aria-label="Customer"]') ||
    document.querySelector('[data-id*="QuickviewControl"][aria-label="Customer"]')
  if (customerPanel) {
    const cellValue = findGridCellValue(customerPanel, 'fullname')
    if (cellValue) return cellValue
  }

  return findGridCellValue(document, 'fullname')
}

function buildPayload() {
  const requestNumber = findRequestNumber()
  const payload = {
    requestNumber,
    customerName: findCustomerName(),
    language: findLookupValue('isa_langue'),
    country: findLookupValue('isa_pays'),
    brand: findLookupValue('isa_marque'),
    sharepointLink: queryInputValue(
      'input[data-id^="isa_liendepartagesharepoint."][data-id$="url-text-input"]'
    ),
    sourceUrl: window.location.href,
    capturedAt: new Date().toISOString(),
  }

  if (!payload.requestNumber) {
    throw new Error('request-number-not-found')
  }

  return payload
}

async function postPayload(payload) {
  let lastError = null
  for (const endpoint of CRM_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        throw new Error(`server-${response.status}`)
      }
      return { ok: true, endpoint }
    } catch (error) {
      lastError = error
    }
  }
  throw lastError || new Error('server-unreachable')
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== 'typefast:export') return undefined

  ;(async () => {
    try {
      const payload = buildPayload()
      const result = await postPayload(payload)
      sendResponse({ ok: true, result, payload })
    } catch (error) {
      sendResponse({ ok: false, error: String(error) })
    }
  })()

  return true
})
