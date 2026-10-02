import type { Query } from './aggregate.ts'
import { runQuery } from './aggregate.ts'
import { bucketOf } from './period.ts'
import type { Bucket } from './period.ts'
import { isMeasure, lc } from './profile.ts'
import type { ColumnProfile, TableProfile } from './profile.ts'
import type { ChartSpec, ChartType } from './spec.ts'
import { categories, defaultAgg, measures, queryTitle, sourceColumn, timeBucket } from './suggest.ts'

/**
 * Which chart fits a question, decided from the shape of the answer, never from what the data is about.
 *
 * The rules, in order:
 * 1. **No grouping** → a number card: one value answers the question.
 * 2. **Grouped by time** → a line: time is continuous and the question is how it changes.
 *    - fewer than 3 points → columns (two points make a misleading slope);
 *    - more than 60 points → an area (a dense line reads as noise; the filled shape shows the level);
 *    - values printed on the marks when there are 12 points or fewer.
 * 3. **Grouped by category** →
 *    - parts of a whole (row counts or a total of non-negative values) with 2–6 groups → a donut;
 *    - up to 12 groups with short names → columns;
 *    - otherwise horizontal bars (long names stay readable), top 10 plus "Other".
 *    Negative values never go in a donut: a share of a negative is meaningless.
 * 4. **Two measures** → a scatter, to see whether one moves with the other.
 *
 * Each choice carries a one-sentence reason, shown under the chart title.
 */

export interface Choice {
  type: ChartType
  labels: boolean
  reason: string
}

const LINE_MAX_POINTS = 60
const DONUT_MAX_GROUPS = 6
const COLUMN_MAX_GROUPS = 12
const SHORT_LABEL = 14

/** Distinct points a time column gives once grouped by ``bucket`` (or by its own grain). */
function timePoints(time: ColumnProfile, bucket: Bucket | undefined): number {
  if (!bucket) return time.distinct
  return new Set((time.periods ?? []).filter(Boolean).map((period) => bucketOf(period!, bucket).key)).size
}

export function chooseChart(p: TableProfile, q: Query): Choice {
  if (q.groupBy === undefined) return { type: 'kpi', labels: false, reason: 'One value answers this, so it is a number card.' }
  const group = p.columns[q.groupBy]
  if (group?.kind === 'period') {
    const points = timePoints(group, q.bucket)
    if (points < 3) {
      return { type: 'column', labels: true, reason: `Only ${points} point${points === 1 ? '' : 's'} in time: columns, since a line between two points would suggest a trend.` }
    }
    if (points > LINE_MAX_POINTS) {
      return { type: 'area', labels: false, reason: `${points} points in time: an area, because a line this dense reads as noise.` }
    }
    return { type: 'line', labels: points <= 12, reason: `A line over ${lc(group.label)}: time runs continuously, and the question is how it changes.` }
  }
  const result = runQuery(p, { ...q, limit: undefined, other: false })
  const groups = result.rows.length
  const negative = result.rows.some((row) => row.value !== null && row.value.n < 0n)
  const partsOfWhole = q.agg === 'count' || (q.agg === 'sum' && !negative)
  const shortNames = result.rows.every((row) => row.label.length <= SHORT_LABEL)
  if (partsOfWhole && groups >= 2 && groups <= DONUT_MAX_GROUPS) {
    return { type: 'donut', labels: true, reason: `A donut: ${groups} groups that together make the whole.` }
  }
  if (groups <= COLUMN_MAX_GROUPS && shortNames) {
    return { type: 'column', labels: true, reason: `Columns: ${groups} groups with short names compare side by side.` }
  }
  return {
    type: 'bar', labels: true,
    reason: groups > 10 ? `Bars, top 10 of ${groups} ${lc(group?.label ?? 'groups')} (the rest add up in Other).` : 'Bars, so long names stay readable.',
  }
}

let seq = 0

function idea(p: TableProfile, q: Query, title?: string): ChartSpec {
  const choice = chooseChart(p, q)
  const grouped = q.groupBy !== undefined && p.columns[q.groupBy]?.kind !== 'period'
  // Many categories: keep the top 10 and fold the rest into "Other" so the chart stays readable.
  const query: Query = grouped ? { ...q, sort: q.sort ?? 'value-desc', limit: 10, other: true } : q
  return { id: `g${(seq++).toString(36)}`, type: choice.type, title: title ?? queryTitle(p, query), reason: choice.reason, query, labels: choice.labels }
}

/** Date columns worth a timeline: at least two dates, most rows dated. */
function timeColumns(p: TableProfile): ColumnProfile[] {
  return p.columns
    .filter((c) => c.kind === 'period' && c.distinct >= 2 && c.filled >= p.rowCount * 0.5)
    .sort((a, b) => (a.virtual ? 0 : 1) - (b.virtual ? 0 : 1) || b.filled - a.filled)
    .slice(0, 2)
}

/**
 * The Graphs page: every chart the table supports, most telling first, each drawn the way the rules above
 * decide. Timelines lead (rows over each date column, then each measure over time), then how rows or totals
 * split by category, then rows per website, then measures against each other.
 */
export function graphIdeas(p: TableProfile, max = 8): ChartSpec[] {
  if (p.rowCount === 0) return []
  const out: ChartSpec[] = []
  const nums = measures(p)
  const times = timeColumns(p)
  const cats = categories(p).filter((c) => !c.idLike && c.distinct < p.rowCount).slice(0, 3)
  const src = sourceColumn(p)

  for (const time of times) {
    const bucket = timeBucket(time)
    const eventDates = time.grain === 'day' && p.rowCount > 5 && time.distinct >= p.rowCount * 0.8
    out.push(idea(p, { groupBy: time.index, agg: 'count', sort: 'time', bucket: eventDates ? 'month' : bucket }, `Rows by ${lc(time.label)}${bucket ? `, per ${bucket}` : ''}`))
  }
  const time = times.find((candidate) => !(candidate.grain === 'day' && p.rowCount > 5 && candidate.distinct >= p.rowCount * 0.8))
  for (const m of time ? nums : []) {
    out.push(idea(p, { groupBy: time!.index, measure: m.index, agg: defaultAgg(m), sort: 'time', bucket: timeBucket(time!) }))
  }
  for (const cat of cats) {
    out.push(idea(p, { groupBy: cat.index, agg: 'count' }))
    if (cat === cats[0]) for (const m of nums) out.push(idea(p, { groupBy: cat.index, measure: m.index, agg: defaultAgg(m) }))
  }
  if (src && src.distinct > 1) out.push(idea(p, { groupBy: src.index, agg: 'count' }, 'Rows per website'))
  for (const m of nums) {
    if (!out.some((spec) => spec.query.measure === m.index)) out.push(idea(p, { measure: m.index, agg: defaultAgg(m) }))
  }
  const [m1, m2] = p.columns.filter(isMeasure)
  if (m1 && m2) {
    out.push({ id: `g${(seq++).toString(36)}`, type: 'scatter', title: `${m1.label} against ${m2.label}`,
      reason: `A scatter: two measures, to see whether ${lc(m1.label)} moves with ${lc(m2.label)}.`,
      query: { agg: 'count' }, x: m2.index, y: m1.index })
  }
  const required = nums.length > 0 ? out.filter((spec) => spec.query.measure !== undefined) : []
  const selected = out.slice(0, Math.max(max, required.length))
  for (const spec of required) if (!selected.includes(spec) && !selected.some((item) => item.query.measure === spec.query.measure)) selected.push(spec)
  return selected
}
