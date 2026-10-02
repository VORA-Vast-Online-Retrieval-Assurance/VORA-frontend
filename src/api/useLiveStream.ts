import { useEffect, useRef, useState } from 'react'
import { liveSnapshotFrom } from './adapt.ts'
import type { RawLiveState, RawRun } from './adapt.ts'
import { vora } from './vora.ts'
import { ApiError } from './client.ts'
import { LiveRows } from './liveRows.ts'
import { connectEventStream } from './sse.ts'
import type { DatasetTable, LiveStatus, LiveStreamPayload } from './types.ts'
import { connectLiveSocket } from './websocket.ts'
import type { SocketEvent } from './websocket.ts'

export interface LiveState {
  status: Partial<LiveStatus>
  liveEnabled: boolean
  rowsTotal: number
  dataset: DatasetTable | null
  connected: boolean
  missing: boolean
  sourceStatus?: string
}

const EMPTY: LiveState = { status: {}, liveEnabled: false, rowsTotal: 0, dataset: null, connected: false, missing: false }
const POLL_MS = 5000
const FINISHED = ['succeeded', 'failed', 'cancelled']

type Handlers = {
  onPayload?: (payload: LiveStreamPayload) => void
  onChatUpdated?: () => void
}

/** WebSocket rows arrive immediately; SSE and polling recover state when sockets are unavailable. */
export function useLiveStream(id: string | null, handlers: Handlers = {}): LiveState {
  const [tagged, setTagged] = useState<LiveState & { forId: string | null }>({ ...EMPTY, forId: null })
  const handlersRef = useRef(handlers)
  useEffect(() => { handlersRef.current = handlers })

  useEffect(() => {
    if (!id) return
    let closed = false
    let poll: number | undefined
    let stopSse: (() => void) | undefined
    let lastRun = ''
    let loadedRows = -1
    let loading = false
    let reload = false
    let replaceRequested = false
    let sourceUrl = ''
    const rows = new LiveRows()
    const setState = (fn: (s: LiveState) => LiveState) => {
      if (!closed) setTagged((t) => ({ ...fn(t.forId === id ? t : EMPTY), forId: id }))
    }

    const loadTable = async (replace = false) => {
      if (replace) replaceRequested = true
      if (loading) { reload = true; return }
      loading = true
      try {
        do {
          reload = false
          const batch = await vora.getDataset(id)
          if (closed) return
          const replacing = replaceRequested
          replaceRequested = false
          if (replacing) rows.replace(batch)
          else rows.merge(batch)
          loadedRows = batch.rows.length
          setState((s) => ({ ...s, dataset: rows.table(), rowsTotal: replacing ? rows.size : Math.max(s.rowsTotal, rows.size) }))
        } while (reload)
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) setState((s) => ({ ...s, missing: true }))
      } finally { loading = false }
    }

    const loadSource = async (url: string, refresh = false) => {
      if (!url || (url === sourceUrl && !refresh)) return
      if (url !== sourceUrl) setState((s) => ({ ...s, sourceStatus: 'inspecting' }))
      sourceUrl = url
      try {
        const list = await vora.getSources(id)
        const source = list.sources.find((s) => s.url === url || s.domain === url || (s.domain && url.includes(s.domain)))
        if (source && sourceUrl === url) setState((s) => ({ ...s, sourceStatus: source.status }))
      } catch { /* source status is optional while discovery runs */ }
    }

    const onState = (state: RawLiveState) => {
      const snap = liveSnapshotFrom(state)
      const run = state.latest_run
      const key = run ? `${run.id}:${run.status}` : ''
      const ended = !!run && FINISHED.includes(run.status)
      const chatUpdated = ended && lastRun !== '' && lastRun !== key
      setState((s) => ({ ...s, status: snap.status, liveEnabled: snap.live_enabled, rowsTotal: ended ? snap.rows_total : Math.max(snap.rows_total, rows.size) }))
      if (snap.rows_total !== loadedRows || chatUpdated) void loadTable(ended)
      if (snap.status.current_source) void loadSource(snap.status.current_source)
      lastRun = key
      handlersRef.current.onPayload?.({ ...snap, chat_updated: chatUpdated || undefined })
      if (chatUpdated) handlersRef.current.onChatUpdated?.()
    }

    const onRun = (run: RawRun) => {
      const source = run.detail.match(/(?:Rendering\s+)?([\w.-]+\.[a-z]{2,})/i)?.[1]
      setState((s) => ({ ...s, status: { ...s.status, detail: run.detail, current_source: source ?? s.status.current_source, rows_added_last_cycle: run.rows_added, updated_at: run.updated_at } }))
      if (source) void loadSource(source)
      if (FINISHED.includes(run.status)) void pollOnce()
    }

    const onSocketEvent = (event: SocketEvent) => {
      if (event.type === 'hello' || event.type === 'status') onState(event.state)
      else if (event.type === 'run') onRun(event.run)
      else if (event.type === 'rows') {
        if (rows.merge(event)) setState((s) => ({ ...s, dataset: rows.table(), rowsTotal: Math.max(s.rowsTotal, rows.size, event.accepted_total), sourceStatus: 'reading', status: { ...s.status, current_source: event.source_url } }))
        handlersRef.current.onPayload?.({ live_enabled: true, status: {}, rows_total: Math.max(rows.size, event.accepted_total) })
      } else if (event.type === 'batch_complete' || event.type === 'resync') {
        void loadTable(true)
        if (sourceUrl) void loadSource(sourceUrl, true)
      }
    }

    const pollOnce = async () => {
      try { onState(await vora.getLiveState(id)) }
      catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setState((s) => ({ ...s, missing: true }))
          stopSocket(); stopSse?.(); window.clearInterval(poll)
        }
      }
    }
    const startPolling = () => { if (poll === undefined) poll = window.setInterval(() => void pollOnce(), POLL_MS) }
    const stopPolling = () => { window.clearInterval(poll); poll = undefined }
    const startSse = () => {
      if (closed || stopSse) return
      stopSse = connectEventStream(vora.streamPath(id), {
        onOpen: () => { stopPolling(); setState((s) => ({ ...s, connected: true })) },
        onMessage: (message) => {
          if (message.event === 'status') {
            try { onState(JSON.parse(message.data) as RawLiveState) } catch { /* malformed event */ }
          }
        },
        onClose: () => { setState((s) => ({ ...s, connected: false })); void pollOnce(); startPolling() },
        onGone: () => { setState((s) => ({ ...s, missing: true })); stopPolling() },
      })
    }
    const stopSocket = connectLiveSocket(vora.socketPath(id), {
      onOpen: () => { stopPolling(); setState((s) => ({ ...s, connected: true })) },
      onEvent: onSocketEvent,
      onClose: () => { setState((s) => ({ ...s, connected: false })); startSse(); void pollOnce(); startPolling() },
    })
    void pollOnce()
    startPolling()
    return () => { closed = true; stopSocket(); stopSse?.(); stopPolling() }
  }, [id])
  return tagged.forId === id ? tagged : EMPTY
}
