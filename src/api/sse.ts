import { API_BASE, authHeaders, reportUnauthorized } from './client.ts'
import { createSseParser } from './sseParser.ts'
import type { SseMessage } from './sseParser.ts'

export { createSseParser }
export type { SseMessage }

/**
 * Server-sent events read with fetch(), because the browser's EventSource cannot send an Authorization
 * header (and the access token must never go into a URL, where it would be logged).
 */

export interface StreamHandlers {
  onOpen?: () => void
  onMessage: (m: SseMessage) => void
  /** The connection dropped or ended; a retry is already scheduled. */
  onClose?: () => void
  /** The resource is gone (404): no retry. */
  onGone?: () => void
}

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => (clearTimeout(timer), resolve()), { once: true })
  })

/**
 * Keeps an event stream open: reconnects with growing pauses when it drops or the server ends it (the backend
 * closes each stream after 15 minutes), refreshes the token once on a 401, and stops on a 404.
 * Returns a function that closes it.
 */
export function connectEventStream(path: string, handlers: StreamHandlers): () => void {
  const controller = new AbortController()
  const { signal } = controller

  void (async () => {
    let pause = 4000
    while (!signal.aborted) {
      try {
        const open = async (force: boolean) =>
          fetch(`${API_BASE}${path}`, {
            headers: { Accept: 'text/event-stream', ...(await authHeaders(force)) },
            signal,
            cache: 'no-store',
          })
        let res = await open(false)
        if (res.status === 401) {
          res = await open(true)
          if (res.status === 401) reportUnauthorized()
        }
        if (res.status === 404) return handlers.onGone?.()
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
        handlers.onOpen?.()
        const parse = createSseParser(handlers.onMessage, (ms) => (pause = Math.min(Math.max(ms, 1000), 30000)))
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          parse(decoder.decode(value, { stream: true }))
        }
      } catch {
        if (signal.aborted) return
      }
      if (signal.aborted) return
      handlers.onClose?.()
      await wait(pause, signal)
      pause = Math.min(pause * 2, 30000)
    }
  })()

  return () => controller.abort()
}
