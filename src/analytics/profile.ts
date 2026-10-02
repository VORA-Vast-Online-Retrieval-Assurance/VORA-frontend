import type { DatasetTable } from '../api/types.ts'
import type { Dec } from './decimal.ts'
import { fromString, mul, toNumber } from './decimal.ts'
import { isMissingText, isUrl, parseNumber } from './parse.ts'
import type { Currency } from './parse.ts'
import { combineMonthYear, parsePeriod } from './period.ts'
import type { Grain, Period } from './period.ts'

export type ColumnKind = 'number' | 'money' | 'percent' | 'period' | 'category' | 'url' | 'text' | 'empty'

/** A non-empty cell that couldn't be read as its column's kind, and why. It's left out of every number. */
export interface Excluded {
  row: number
  raw: string
  reason: string
}

export interface ColumnProfile {
  index: number
  /** The header as scraped. */
  name: string
  /** The header made readable: "price_inr" → "Price inr". */
  label: string
  kind: ColumnKind
  filled: number
  missing: number
  /** Distinct values, ignoring case and extra spaces. */
  distinct: number
  /** One entry per row: the trimmed text, or '' when missing. */
  labels: string[]
  /** Numeric kinds: one exact value per row, null when missing or excluded. */
  numbers?: (Dec | null)[]
  /** Period kind: one period per row. */
  periods?: (Period | null)[]
  excluded: Excluded[]
  currency?: Currency
  percent?: boolean
  /** A shared trailing unit ("km", "units"). */
  suffix?: string
  /** Most decimals seen in a value, so answers show the same precision as the source. */
  scale: number
  grain?: Grain
  /** Slashed dates where day and month could be either way round (read as day/month). */
  ambiguous?: number
  /** Serial numbers or ranks: numeric, but never a measure worth adding up. */
  idLike?: boolean
  /** Built by the profile (Month + Year), not in the scraped table; exports leave it out. */
  virtual?: boolean
}

export interface TableProfile {
  columns: ColumnProfile[]
  rowCount: number
  /** Rows as text, exactly as scraped. */
  raw: string[][]
  name?: string
  sourceUrl?: string
}

const cellText = (v: string | number | null | undefined) => (v === null || v === undefined ? '' : String(v).trim())
export const groupKey = (label: string) => label.replace(/\s+/g, ' ').trim().toLowerCase()

const CODES = new Set(['inr', 'usd', 'eur', 'gbp'])
const UNITS = new Set(['km', 'kg', 'kwh', 'kw', 'hp', 'cc', 'mm', 'cm', 'm', 'sqft', 'hrs', 'mins', 'mah', 'gb', 'tb', 'pct'])
const DURATION_SECONDS: Record<string, string> = {
  s: '1', sec: '1', secs: '1', second: '1', seconds: '1',
  min: '60', mins: '60', minute: '60', minutes: '60',
  h: '3600', hr: '3600', hrs: '3600', hour: '3600', hours: '3600',
  d: '86400', day: '86400', days: '86400',
}
const DURATION_MINUTES: Record<string, string> = {
  min: '1', mins: '1', minute: '1', minutes: '1',
  h: '60', hr: '60', hrs: '60', hour: '60', hours: '60',
  d: '1440', day: '1440', days: '1440',
}

/** "price_inr" → "Price (INR)", "range_km" → "Range (km)", "EV Units Sold" stays as it is. */
export function humanize(name: string): string {
  const words = name.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ')
  const last = words[words.length - 1]?.toLowerCase() ?? ''
  if (words.length > 1 && (CODES.has(last) || UNITS.has(last))) {
    words[words.length - 1] = `(${CODES.has(last) ? last.toUpperCase() : last === 'pct' ? '%' : last})`
  }
  const s = words.join(' ')
  return s ? s[0].toUpperCase() + s.slice(1) : 'Column'
}

/** A label for mid-sentence use: "Price (INR)" → "price (INR)", but "EV units" keeps its capitals. */
export const lc = (label: string) => (/^[A-Z][a-z]/.test(label) ? label[0].toLowerCase() + label.slice(1) : label)

function mostCommon<T>(items: T[]): T | undefined {
  const counts = new Map<T, number>()
  for (const i of items) counts.set(i, (counts.get(i) ?? 0) + 1)
  let best: T | undefined
  let bestN = 0
  for (const [k, n] of counts) if (n > bestN) [best, bestN] = [k, n]
  return best
}

const ID_NAME = /(^|\b|_)(id|no|sr|s\.?no|serial|rank|index|#)(\b|_|$)/i
const TIME_NAME = /date|month|period|quarter|time|day|year|\bfy\b|week/i
const CATEGORY_NAME = /segment|type|class|category|variant|grade|tier|size|model|code/i

function profileColumn(index: number, name: string, cells: string[]): ColumnProfile {
  const base = { index, name, label: humanize(name), labels: cells, excluded: [] as Excluded[], scale: 0 }
  const present = cells.map((c, row) => ({ c, row })).filter(({ c }) => c !== '' && !isMissingText(c))
  const filled = present.length
  const missing = cells.length - filled
  const distinct = new Set(present.map(({ c }) => groupKey(c))).size
  if (filled === 0) return { ...base, kind: 'empty', filled, missing, distinct }

  const nums = present.map(({ c, row }) => ({ row, c, r: parseNumber(c) }))
  const numOk = nums.filter((x) => x.r.ok)
  const pers = present.map(({ c, row }) => ({ row, c, p: parsePeriod(c) }))
  const perOk = pers.filter((x) => x.p !== null)
  const urls = present.filter(({ c }) => isUrl(c)).length
  const enough = (n: number) => n >= Math.max(1, Math.ceil(filled * 0.8))

  if (enough(urls)) return { ...base, kind: 'url', filled, missing, distinct }

  // A column of 4-digit numbers is a year only when its header says so: prices like 1999 must stay numbers.
  const yearLike = enough(perOk.length) && perOk.every((x) => x.p!.grain === 'year') && /year|yr|\bfy\b/i.test(name)
  const timeLike = enough(perOk.length) && (perOk.length > numOk.length || TIME_NAME.test(name))
  if (yearLike || timeLike) {
    const grain = mostCommon(perOk.map((x) => x.p!.grain))!
    const periods: (Period | null)[] = cells.map(() => null)
    const excluded: Excluded[] = []
    for (const x of pers) {
      if (x.p && x.p.grain === grain) periods[x.row] = x.p
      else excluded.push({ row: x.row, raw: x.c, reason: x.p ? `a ${x.p.grain}, not a ${grain}` : 'not a date or period' })
    }
    const ambiguous = perOk.filter((x) => x.p!.ambiguous).length
    return { ...base, kind: 'period', filled, missing, distinct, periods, excluded, grain, ambiguous: ambiguous || undefined }
  }

  // Short codes glued to a unit-like word ("2W", "4W", "5G", "3BHK") that repeat across rows are categories,
  // not quantities: adding up "2W + 4W" would be a precise-looking wrong number. So are columns named like one.
  const codes = present.filter(({ c }) => /^\d{1,2}[a-z]{1,4}$/i.test(c.trim())).length
  const codeLike = (enough(codes) && distinct <= 12 && distinct <= filled * 0.5) || (CATEGORY_NAME.test(name) && distinct <= 20 && distinct <= filled * 0.5)
  if (enough(numOk.length) && !codeLike) {
    const parsed = numOk.map((x) => (x.r.ok ? x.r.num : null)!)
    const currency = mostCommon(parsed.map((p) => p.currency).filter((c): c is Currency => !!c))
    const moneyVotes = parsed.filter((p) => p.currency).length
    const percent = parsed.filter((p) => p.percent).length * 2 > parsed.length
    const suffix = mostCommon(parsed.map((p) => p.suffix).filter((s): s is string => !!s))
    const duration = parsed.length > 0 && parsed.every((p) => !!p.suffix && !!DURATION_SECONDS[p.suffix])
    const durationInSeconds = duration && parsed.some((p) => ['s', 'sec', 'secs', 'second', 'seconds'].includes(p.suffix!))
    const numbers: (Dec | null)[] = cells.map(() => null)
    const excluded: Excluded[] = []
    let scale = 0
    for (const x of nums) {
      if (!x.r.ok) {
        excluded.push({ row: x.row, raw: x.c, reason: x.r.reason })
        continue
      }
      const p = x.r.num
      if (p.currency && currency && p.currency !== currency) {
        excluded.push({ row: x.row, raw: x.c, reason: `in ${p.currency}, the column is in ${currency}` })
        continue
      }
      if (!duration && p.suffix && suffix && p.suffix !== suffix) {
        excluded.push({ row: x.row, raw: x.c, reason: `in “${p.suffix}”, the column is in “${suffix}”` })
        continue
      }
      const value = duration ? mul(p.value, fromString((durationInSeconds ? DURATION_SECONDS : DURATION_MINUTES)[p.suffix!])!) : p.value
      numbers[x.row] = value
      scale = Math.max(scale, value.s)
    }
    const kind: ColumnKind = moneyVotes * 2 > parsed.length ? 'money' : percent ? 'percent' : 'number'
    const ints = numbers.filter((n): n is Dec => n !== null)
    const consecutive = ints.length > 2 && ints.every((d, i) => d.s === 0 && d.n === BigInt(i + 1))
    const idLike = kind === 'number' && (ID_NAME.test(name) || consecutive)
    // Outliers are left out of every number (totals, averages, charts) and shown struck through with the reason.
    if (!idLike) {
      for (const o of findOutliers(numbers)) {
        excluded.push({ row: o.row, raw: cells[o.row], reason: o.reason })
        numbers[o.row] = null
      }
    }
    return {
      ...base, kind, filled, missing, distinct, numbers, excluded, scale,
      currency: kind === 'money' ? currency : undefined,
      percent: kind === 'percent' || undefined,
      suffix: duration ? durationInSeconds ? 'sec' : 'min' : suffix, idLike: idLike || undefined,
    }
  }

  const avgLength = present.reduce((n, { c }) => n + c.length, 0) / filled
  const category = distinct >= 1 && avgLength <= 48 && (distinct <= 12 || distinct <= Math.ceil(filled * 0.6))
  return { ...base, kind: category ? 'category' : 'text', filled, missing, distinct }
}

/** A Month column (January…) beside a Year column becomes one real timeline. */
function monthYear(columns: ColumnProfile[], rowCount: number): ColumnProfile | null {
  const monthCol = columns.find((c) => c.kind === 'period' && c.grain === 'monthName')
  const yearCol = columns.find((c) => c.kind === 'period' && c.grain === 'year')
  if (!monthCol || !yearCol) return null
  const periods = Array.from({ length: rowCount }, (_, r) =>
    combineMonthYear(monthCol.periods?.[r] ?? null, yearCol.periods?.[r] ?? null),
  )
  const filled = periods.filter(Boolean).length
  if (filled === 0) return null
  return {
    index: columns.length,
    name: `${monthCol.name} + ${yearCol.name}`,
    label: `${monthCol.label} and ${yearCol.label}`,
    kind: 'period',
    grain: 'month',
    filled,
    missing: rowCount - filled,
    distinct: new Set(periods.filter(Boolean).map((p) => p!.key)).size,
    labels: periods.map((p) => p?.label ?? ''),
    periods,
    excluded: [],
    scale: 0,
    virtual: true,
  }
}

/** Reads a scraped table: what each column holds, every value parsed exactly, every left-out cell listed. */
export function profileTable(table: DatasetTable): TableProfile {
  const raw = table.rows.map((row) => table.columns.map((_, i) => cellText(row[i])))
  const columns = table.columns.map((name, i) => profileColumn(i, name, raw.map((r) => r[i])))
  const combined = monthYear(columns, raw.length)
  if (combined) columns.push(combined)
  return { columns, rowCount: raw.length, raw, name: table.name, sourceUrl: table.source_url }
}

export const isNumeric = (c: ColumnProfile) => c.kind === 'number' || c.kind === 'money' || c.kind === 'percent'
export const isMeasure = (c: ColumnProfile) => isNumeric(c) && !c.idLike
export const isGroupable = (c: ColumnProfile) =>
  c.kind === 'category' || c.kind === 'period' || c.kind === 'url' || (c.kind === 'text' && c.distinct <= 60)


/** The most an ordinary value may sit from the middle, in robust deviations (Iglewicz–Hoaglin's 3.5). */
const OUTLIER_Z = 3.5
/** Too few values to tell an outlier from a real spread. */
const OUTLIER_MIN_VALUES = 8

/**
 * Values far outside the rest of their column, by the modified z-score: distance from the median in units of the
 * median absolute deviation (MAD). Unlike the mean and standard deviation, the median and MAD are not pulled by the
 * outliers themselves, so one stray "₹4,50,00,000" among prices near ₹4,50,000 is caught. Columns of positive values
 * (prices, counts) are judged on a log scale, where "10× bigger" is the same step at any size; a column where most
 * values are identical (MAD = 0) is left alone, since there is no spread to judge against.
 */
export function findOutliers(values: (Dec | null)[]): { row: number; reason: string }[] {
  const present = values.flatMap((v, row) => (v === null ? [] : [{ row, x: toNumber(v) }])).filter((p) => Number.isFinite(p.x))
  if (present.length < OUTLIER_MIN_VALUES) return []
  const positive = present.every((p) => p.x > 0)
  const scaled = present.map((p) => (positive ? Math.log10(p.x) : p.x))
  const middle = medianOf(scaled)
  const mad = medianOf(scaled.map((v) => Math.abs(v - middle)))
  if (!(mad > 0)) return []
  const typical = positive ? 10 ** middle : middle
  const out: { row: number; reason: string }[] = []
  present.forEach((p, i) => {
    const z = (0.6745 * (scaled[i] - middle)) / mad
    if (Math.abs(z) <= OUTLIER_Z) return
    const times = positive ? p.x / typical : NaN
    const how = Number.isFinite(times) && times >= 1 ? `${times >= 10 ? Math.round(times) : times.toFixed(1)}× the typical value`
      : Number.isFinite(times) ? `1/${Math.round(1 / times)} of the typical value` : 'far from the other values'
    out.push({ row: p.row, reason: `an outlier: ${how} (${formatTypical(typical)}), left out of totals and averages` })
  })
  return out
}

function medianOf(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function formatTypical(x: number): string {
  return `typical ≈ ${x.toLocaleString('en-IN', { maximumSignificantDigits: 3 })}`
}
