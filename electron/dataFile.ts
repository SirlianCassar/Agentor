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
