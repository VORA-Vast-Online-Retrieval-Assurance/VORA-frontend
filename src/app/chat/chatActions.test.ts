import assert from 'node:assert/strict'
import { test } from 'node:test'
import { changeTracking, deleteChat } from './chatActions.ts'

test('pause and resume show the server-confirmed tracking state', async () => {
  const confirmed: boolean[] = []
  await changeTracking('chat', false, async () => ({ live_enabled: false }), (enabled) => confirmed.push(enabled))
  await changeTracking('chat', true, async () => ({ live_enabled: true }), (enabled) => confirmed.push(enabled))
  assert.deepEqual(confirmed, [false, true])
  await assert.rejects(changeTracking('chat', false, async () => { throw new Error('offline') }, (enabled) => confirmed.push(enabled)))
  assert.deepEqual(confirmed, [false, true])
})

test('delete navigates only after success and retains the chat on failure', async () => {
  const calls: string[] = []
  await deleteChat('chat', async () => { calls.push('deleted') }, () => calls.push('navigate'))
  assert.deepEqual(calls, ['deleted', 'navigate'])
  calls.length = 0
  await assert.rejects(deleteChat('chat', async () => { throw new Error('offline') }, () => calls.push('navigate')))
  assert.deepEqual(calls, [])
})
