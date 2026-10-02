import type { RawLiveState, RawRun } from './adapt.ts'
import { API_BASE, authHeaders } from './client.ts'
import type { RowBatch } from './liveRows.ts'

export type SocketEvent =
  | { type: 'hello' | 'status'; state: RawLiveState }
  | { type: 'run'; run: RawRun }
  | ({ type: 'rows' } & RowBatch & { accepted_total: number; source_url: string })
  | { type: 'batch_complete' | 'resync' | 'ping' | 'run_event'; [key: string]: unknown }

export function connectLiveSocket(path: string, handlers: {
  onOpen: () => void
  onEvent: (event: SocketEvent) => void
  onClose: () => void
}): () => void {
  let closed = false
  let socket: WebSocket | null = null
  const open = async () => {
    const token = (await authHeaders()).Authorization?.replace(/^Bearer /, '')
    if (closed) return
    const url = new URL(`${API_BASE}${path}`, window.location.href)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    try { socket = new WebSocket(url) } catch { handlers.onClose(); return }
    socket.onopen = () => {
      if (token) socket?.send(JSON.stringify({ type: 'auth', token }))
      handlers.onOpen()
    }
    socket.onmessage = (message) => {
      try { handlers.onEvent(JSON.parse(message.data) as SocketEvent) } catch { /* malformed event */ }
    }
    socket.onerror = () => socket?.close()
    socket.onclose = () => { if (!closed) handlers.onClose() }
  }
  void open().catch(() => { if (!closed) handlers.onClose() })
  return () => { closed = true; socket?.close() }
}
