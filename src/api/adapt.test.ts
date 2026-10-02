import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  currentSourceOf,
  dashboardFrom,
  instanceFrom,
  liveSnapshotFrom,
  messageFrom,
  phaseOf,
  statusFrom,
} from './adapt.ts'
import type { RawLiveState, RawRun } from './adapt.ts'

const run = (over: Partial<RawRun> = {}): RawRun => ({
  id: 'r1',
  status: 'running',
  phase: 'discovery',
  detail: '',
  rows_total: 0,
  rows_added: 0,
  updated_at: '2026-09-30T10:00:00+00:00',
  ...over,
})

test('backend messages become chat messages (assistant is "bot", content is text)', () => {
  assert.deepEqual(messageFrom({ id: 'a', role: 'assistant', content: '**Done**', created_at: 't' }), {
    id: 'a',
    role: 'bot',
    text: '**Done**',
    created_at: 't',
  })
  assert.equal(messageFrom({ id: 'b', role: 'user', content: 'hi', created_at: 't' }).role, 'user')
})

test('an instance carries its messages and drops the backend-only fields', () => {
  const detail = instanceFrom(
    { id: 'i', title: 'Hospitals', goal: 'x', archived: false, live_enabled: true, dataset_row_count: 7, created_at: 'c', updated_at: 'u' },
    [{ id: 'm', role: 'user', content: 'hospitals', created_at: 't' }],
  )
  assert.equal(detail.live_enabled, true)
  assert.equal(detail.dataset_row_count, 7)
  assert.equal(detail.messages.length, 1)
  assert.equal('goal' in detail, false)
  assert.deepEqual(instanceFrom({ id: 'i', title: 't', live_enabled: false, dataset_row_count: 0, created_at: 'c', updated_at: 'u' }).messages, [])
})

test('backend pipeline phases map onto the five steps the app draws', () => {
  const at = (phase: string) => phaseOf(run({ phase }))
  assert.equal(at('planning'), 'discovery')
  assert.equal(at('discovery'), 'discovery')
  assert.equal(at('rendering'), 'inspect')
  assert.equal(at('extracting'), 'extract')
  assert.equal(at('scoring'), 'merge')
  assert.equal(at('merging'), 'merge')
  assert.equal(at('something new'), 'discovery')
})

test('run outcomes map to what the person sees', () => {
  assert.equal(phaseOf(null), 'idle')
  assert.equal(phaseOf(run({ status: 'queued', phase: 'queued' })), 'idle')
  assert.equal(phaseOf(run({ status: 'succeeded', phase: 'complete' })), 'sleep')
  assert.equal(phaseOf(run({ status: 'failed' })), 'error')
  assert.equal(phaseOf(run({ status: 'cancelled' })), 'stopped')
})

test('the site being read is taken from the run detail while it runs', () => {
  assert.equal(currentSourceOf(run({ detail: 'Rendering www.Example.org (2/8)' })), 'www.example.org')
  assert.equal(currentSourceOf(run({ detail: 'data.gov.in: found 3 tables' })), 'data.gov.in')
  assert.equal(currentSourceOf(run({ detail: 'Searching: hospitals in Kerala' })), '')
  assert.equal(currentSourceOf(run({ status: 'succeeded', detail: 'Rendering example.org (1/1)' })), '')
  assert.equal(currentSourceOf(null), '')
})

test('a live state becomes the snapshot the app reads', () => {
  const state: RawLiveState = {
    enabled: true,
    latest_run: run({ phase: 'extracting', detail: 'Rendering example.org (1/4)', rows_added: 3, rows_total: 12 }),
    rows_total: 12,
  }
  const snap = liveSnapshotFrom(state)
  assert.equal(snap.live_enabled, true)
  assert.equal(snap.rows_total, 12)
  assert.equal(snap.status.phase, 'extract')
  assert.equal(snap.status.current_source, 'example.org')
  assert.equal(snap.status.rows_added_last_cycle, 3)
})

test('a failed run shows its error, and an instance that never ran has an empty status', () => {
  assert.equal(statusFrom({ enabled: true, latest_run: run({ status: 'failed', detail: 'x', error: 'No browser' }), rows_total: 0 }).detail, 'No browser')
  assert.deepEqual(liveSnapshotFrom({ enabled: false, latest_run: null, rows_total: 0 }), { live_enabled: false, status: {}, rows_total: 0 })
})

test('the dashboard keeps the table and reports when the instance changed', () => {
  const table = { columns: ['a'], rows: [['1']] }
  assert.deepEqual(dashboardFrom({ rows_total: 1, table }, 'when'), { rows_total: 1, table, updated_at: 'when' })
  assert.equal(dashboardFrom({ rows_total: 0, table: null }).table, null)
})
