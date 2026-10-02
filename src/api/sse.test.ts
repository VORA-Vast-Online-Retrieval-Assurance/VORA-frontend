import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createSseParser } from './sseParser.ts'
import type { SseMessage } from './sseParser.ts'

function collect(chunks: string[]) {
  const messages: SseMessage[] = []
  const retries: number[] = []
  const feed = createSseParser((m) => messages.push(m), (ms) => retries.push(ms))
  for (const chunk of chunks) feed(chunk)
  return { messages, retries }
}

test('reads named events and their JSON data', () => {
  const { messages } = collect(['event: status\ndata: {"a":1}\n\n'])
  assert.deepEqual(messages, [{ event: 'status', data: '{"a":1}' }])
})

test('an event with no name is a "message"', () => {
  assert.deepEqual(collect(['data: hi\n\n']).messages, [{ event: 'message', data: 'hi' }])
})

test('events split across chunks, even mid-line, come out whole', () => {
  const { messages } = collect(['event: sta', 'tus\nda', 'ta: {"x":', '2}\n', '\nevent: run_event\ndata: 1\n\n'])
  assert.deepEqual(messages, [
    { event: 'status', data: '{"x":2}' },
    { event: 'run_event', data: '1' },
  ])
})

test('keep-alive comments and the retry hint are not events', () => {
  const { messages, retries } = collect(['retry: 4000\n\n', ': keep-alive\n\n', 'data: x\n\n'])
  assert.deepEqual(messages, [{ event: 'message', data: 'x' }])
  assert.deepEqual(retries, [4000])
})

test('multi-line data joins with newlines, and CRLF works', () => {
  assert.deepEqual(collect(['data: a\r\ndata: b\r\n\r\n']).messages, [{ event: 'message', data: 'a\nb' }])
})

test('CRLF split between two chunks is one line end, not two', () => {
  assert.deepEqual(collect(['event: status\r', '\ndata: 1\r\n\r', '\n']).messages, [{ event: 'status', data: '1' }])
})

test('an event name never leaks into the next event', () => {
  const { messages } = collect(['event: status\ndata: 1\n\ndata: 2\n\n'])
  assert.deepEqual(messages.map((m) => m.event), ['status', 'message'])
})

test('a field with no colon and a blank event are ignored safely', () => {
  assert.deepEqual(collect(['bogus\n\n', 'data\n\n']).messages, [])
})
