import assert from 'node:assert/strict'
import { test } from 'node:test'
import { chooseChart, graphIdeas } from './chooseChart.ts'
import { profileTable } from './profile.ts'

const DAYS = ['17-Sep-2026', '18-Sep-2026', '21-Sep-2026', '22-Sep-2026', '23-Sep-2026', '24-Sep-2026', '25-Sep-2026', '28-Sep-2026']
const MINISTRIES = ['Ministry of Finance', 'Ministry of Defence', 'Ministry of Railways', 'Bureau of Indian Standards']
const PARTS = ['Part I-Section 1', 'Part II-Section 3']

// A gazette listing: long free-text subjects, a few ministries, two parts, dates, IDs, PDF links. No numbers.
const gazette = profileTable({
  columns: ['subject', 'ministry', 'part_section', 'issue_date', 'gazette_id', 'pdf_url'],
  rows: Array.from({ length: 40 }, (_, i) => [
    `Notification number ${i} under section ${i % 7} of the act, published for general information`,
    MINISTRIES[i % MINISTRIES.length],
    PARTS[i % 2],
    DAYS[i % DAYS.length],
    `CG-DL-E-3009202${6}-2766${String(i).padStart(2, '0')}`,
    `https://egazette.gov.in/WriteReadData/2026/2766${String(i).padStart(2, '0')}.pdf`,
  ]),
})

const column = (name: string) => gazette.columns.find((c) => c.name === name)!.index

test('time gets a line, like the dashboard reference "Rows by issue date"', () => {
  const choice = chooseChart(gazette, { groupBy: column('issue_date'), agg: 'count', sort: 'time' })
  assert.equal(choice.type, 'line')
  assert.equal(choice.labels, true) // 8 points: values printed on the marks
})

test('a few parts of a whole get a donut; many groups with long names get bars', () => {
  assert.equal(chooseChart(gazette, { groupBy: column('part_section'), agg: 'count' }).type, 'donut')
  assert.equal(chooseChart(gazette, { groupBy: column('ministry'), agg: 'count' }).type, 'donut') // 4 ministries
  const many = profileTable({ columns: ['name', 'office'], rows: Array.from({ length: 60 }, (_, i) => [`n${i}`, `Regional office number ${i % 20}`]) })
  assert.equal(chooseChart(many, { groupBy: 1, agg: 'count' }).type, 'bar')
})

test('two points in time are columns, a dense timeline is an area', () => {
  const two = profileTable({ columns: ['year', 'sales'], rows: [['2024', '10'], ['2025', '12']] })
  assert.equal(chooseChart(two, { groupBy: 0, measure: 1, agg: 'sum', sort: 'time' }).type, 'column')
  const days = Array.from({ length: 90 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 0, 1 + i))
    return [d.toISOString().slice(0, 10), String(i)]
  })
  const dense = profileTable({ columns: ['date', 'value'], rows: days })
  assert.equal(chooseChart(dense, { groupBy: 0, measure: 1, agg: 'sum', sort: 'time' }).type, 'area')
})

test('no grouping is a number card; negative totals never go in a donut', () => {
  assert.equal(chooseChart(gazette, { agg: 'count' }).type, 'kpi')
  const pnl = profileTable({ columns: ['unit', 'profit'], rows: [['A', '10'], ['B', '-4'], ['C', '6']] })
  assert.notEqual(chooseChart(pnl, { groupBy: 0, measure: 1, agg: 'sum' }).type, 'donut')
})

test('the gazette listing gets timelines and category charts, never charts of text, ids or links', () => {
  const ideas = graphIdeas(gazette)
  assert.equal(ideas[0].type, 'line')
  assert.equal(ideas[0].title, 'Rows by issue date')
  const grouped = ideas.map((idea) => idea.query.groupBy).filter((g) => g !== undefined)
  for (const name of ['subject', 'gazette_id']) assert.ok(!grouped.includes(column(name)), `${name} must not be charted`)
  assert.ok(ideas.every((idea) => idea.reason.length > 10))
})

test('an empty table has nothing to chart', () => {
  assert.deepEqual(graphIdeas(profileTable({ columns: ['a'], rows: [] })), [])
})

test('each numeric measure gets a chart and compatible durations share minutes', () => {
  const profile = profileTable({ columns: ['year', 'sales', 'cost', 'duration'], rows: [
    ['2023', '10', '4', '10 hour'], ['2024', '20', '8', '30 min'], ['2025', '30', '12', '2 hours'],
  ] })
  const duration = profile.columns[3]
  assert.equal(duration.suffix, 'min')
  assert.deepEqual(duration.numbers?.map((value) => value?.n), [600n, 30n, 120n])
  const ideas = graphIdeas(profile)
  for (const index of [1, 2, 3]) assert.ok(ideas.some((spec) => spec.query.measure === index))
  assert.ok(ideas.filter((spec) => spec.query.measure !== undefined).every((spec) => spec.type === 'line'))
  const seconds = profileTable({ columns: ['duration'], rows: [['1 min'], ['30 sec']] }).columns[0]
  assert.equal(seconds.suffix, 'sec')
  assert.deepEqual(seconds.numbers?.map((value) => value?.n), [60n, 30n])
})
