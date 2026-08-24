import { yardsToMiles } from '@/utils/yard'

export type MonthlySwimTotals = {
  checkIns: number
  yards: number
}

/** YYYY-MM for `<input type="month" />`. */
export function defaultReviewMonthValue(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function parseReviewMonth(isoMonth: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(isoMonth.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) return null
  return { year, month, isoMonth: `${match[1]}-${match[2]}` }
}

export function formatReviewMonthName(isoMonth: string) {
  const parsed = parseReviewMonth(isoMonth)
  if (!parsed) return isoMonth
  return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(
    new Date(parsed.year, parsed.month - 1, 1),
  )
}

export function monthDateRange(isoMonth: string) {
  const parsed = parseReviewMonth(isoMonth)
  if (!parsed) {
    throw new Error('Invalid month. Use YYYY-MM.')
  }
  const { year, month } = parsed
  const start = `${parsed.isoMonth}-01`
  const endExclusive =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, '0')}-01`
  return { start, endExclusive }
}

export function formatSwimCount(count: number) {
  return count.toLocaleString('en-US')
}

export function formatSwimMiles(yards: number) {
  const miles = yardsToMiles(yards)
  if (miles >= 100) return miles.toFixed(0)
  if (miles >= 10) return miles.toFixed(1)
  if (miles >= 1) return miles.toFixed(1)
  return miles.toFixed(2)
}

export function emptyMonthlySwimTotals(): MonthlySwimTotals {
  return { checkIns: 0, yards: 0 }
}
