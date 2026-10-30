import fs from 'node:fs'
import path from 'node:path'

// Writes through a temporary file in the same folder, flushed then renamed over
// the destination: an interrupted save leaves the previous file intact.
export function writeFileAtomic(filePath: string, content: string) {
  const dir = path.dirname(filePath)
  fs.mkdirSync(dir, { recursive: true })
  const tempPath = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`)
  let fd: number | null = null
  try {
    fd = fs.openSync(tempPath, 'w')
    fs.writeFileSync(fd, content, 'utf-8')
    fs.fsyncSync(fd)
    fs.closeSync(fd)
    fd = null
    fs.renameSync(tempPath, filePath)
  } catch (error) {
    if (fd !== null) fs.closeSync(fd)
    fs.rmSync(tempPath, { force: true })
    throw error
  }
}

// Returns the parsed object, or null when the file is missing or unreadable.
// The renderer normalizes the result against its own defaults.
export function readJsonObject(filePath: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

const CATALOG_PRODUCT_FIELDS = [
  'productType',
  'note',
  'compatibleProductIds',
  'softwareIds',
  'driverIds',
  'firmwareIds',
  'editions',
] as const

const isFilled = (value: unknown) =>
  Array.isArray(value) ? value.length > 0 : typeof value === 'string' ? value.trim() !== '' : value != null

// Data that no screen shows or edits any more: the procedures of the old
// module, the firmware, software and driver catalogs, and the catalog fields of
// the products (the SKU page edits only the name and the spare parts). Null
// when there is nothing of the kind.
export function retiredDataExport(data: Record<string, unknown>, exportedAt = new Date().toISOString()) {
  const settings = (data.settings && typeof data.settings === 'object' ? data.settings : {}) as Record<string, unknown>
  const procedures = Array.isArray(data.procedures) ? data.procedures : []
  const dashboardProducts = Array.isArray(settings.dashboardProducts) ? settings.dashboardProducts : []
  const products = (Array.isArray(settings.products) ? settings.products : [])
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => {
      const kept: Record<string, unknown> = { id: item.id, name: item.name }
      CATALOG_PRODUCT_FIELDS.forEach((key) => {
        if (isFilled(item[key])) kept[key] = item[key]
      })
      return kept
    })
    .filter((item) => Object.keys(item).length > 2)
  if (!procedures.length && !dashboardProducts.length && !products.length) return null
  return {
    about:
      'Copie des données Agentor qui ne sont plus affichées ni modifiables. Elles restent aussi dans agentor-data.json.',
    exportedAt,
    procedures,
    dashboardProducts,
    productCatalogFields: products,
  }
}

// Writes the copy once, next to the data file. An existing copy is never replaced.
export function writeRetiredDataExport(filePath: string, data: Record<string, unknown>): 'written' | 'exists' | 'empty' {
  if (fs.existsSync(filePath)) return 'exists'
  const content = retiredDataExport(data)
  if (!content) return 'empty'
  writeFileAtomic(filePath, JSON.stringify(content, null, 2))
  return 'written'
}
