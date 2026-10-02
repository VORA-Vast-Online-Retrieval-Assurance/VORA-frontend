import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LiveRows } from './liveRows.ts'

test('streamed and saved rows use record IDs to prevent duplicates', () => {
  const rows = new LiveRows()
  assert.equal(rows.merge({ columns: ['name'], rows: [['A']], records: [{ id: 'one' }] }), true)
  assert.equal(rows.merge({ columns: ['name'], rows: [['A']], records: [{ id: 'one' }] }), false)
  rows.merge({ columns: ['name', 'value'], rows: [['B', '20']], records: [{ id: 'two' }] })
  assert.deepEqual(rows.table().rows, [['A', null], ['B', '20']])
  rows.replace({ columns: ['name'], rows: [['B']], records: [{ id: 'two' }] })
  assert.deepEqual(rows.table().rows, [['B']])
})
