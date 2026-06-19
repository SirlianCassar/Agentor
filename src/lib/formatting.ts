/* Pure date / currency / number / version formatting helpers.
   No app state or DOM access — safe to use anywhere. */

const historyTimestampFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})
const dashboardNewsDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
})
const euroFormatter2 = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const euroFormatter3 = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
})

// 2 décimales par défaut ; 3 décimales quand un 3e chiffre significatif
// disparaîtrait à l'arrondi sur 2 décimales (ex. 14,995 → « 14,995 »).
export function euroFractionDigits(value: number) {
  return Math.round(value * 1000) % 10 === 0 ? 2 : 3
}

export function formatVersionLabel(value?: string | null) {
  const normalized = value?.trim()
  if (!normalized) return null
  return normalized.replace(/\.0$/, '')
}

export function formatHistoryTimestamp(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return historyTimestampFormatter.format(date)
}

export function getTodayIsoDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDashboardNewsDate(value: string) {
  if (!value.trim()) return 'Date non renseignée'
  const [year, month, day] = value.split('-').map((item) => Number(item))
  if (!year || !month || !day) return value
  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return value
  return dashboardNewsDateFormatter.format(date)
}

export function parseDashboardAmount(value: string) {
  const normalized = value.replace(/\s+/g, '').replace(',', '.').trim()
  if (!normalized) return null
  const parsed = Number.parseFloat(normalized)
  if (!Number.isFinite(parsed)) return null
  return Math.max(0, parsed)
}

export function formatEuroAmount(value: number) {
  return (euroFractionDigits(value) === 3 ? euroFormatter3 : euroFormatter2).format(value)
}

export function formatAmountForCopy(value: number) {
  return value.toFixed(euroFractionDigits(value)).replace('.', ',')
}

export function getSliderProgress(value: number, min: number, max: number) {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return '0%'
  }
  const clamped = Math.min(max, Math.max(min, value))
  return `${((clamped - min) / (max - min)) * 100}%`
}

export function formatUpdateCheckedAt(value?: string) {
  if (!value) return 'Aucune vérification récente.'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return historyTimestampFormatter.format(date)
}
