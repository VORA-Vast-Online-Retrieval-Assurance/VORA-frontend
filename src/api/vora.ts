import {
  dashboardFrom,
  instanceFrom,
  liveSnapshotFrom,
  summaryFrom,
} from './adapt.ts'
import type { RawDashboard, RawInstance, RawLiveState, RawMessage } from './adapt.ts'
import { request } from './client.ts'
import type { DashboardResponse, InstanceDetail, InstanceSummary, LiveSnapshot } from './types.ts'
import type { RowBatch } from './liveRows.ts'

/** The VORA backend's versioned API. */
export const API_PREFIX = '/api/v1'

const at = (id: string) => `${API_PREFIX}/instances/${encodeURIComponent(id)}`

/** Every backend call the app makes, in the shapes the app draws (api/adapt.ts translates). */
export const vora = {
  health: () => request<{ status: string }>('/health'),

  listInstances: async (): Promise<InstanceSummary[]> =>
    (await request<RawInstance[]>(`${API_PREFIX}/instances?limit=500`)).map(summaryFrom),

  createInstance: async (title?: string): Promise<InstanceDetail> =>
    instanceFrom(
      await request<RawInstance>(`${API_PREFIX}/instances`, {
        method: 'POST',
        // The backend wants a title; "New track" is what it (and the sidebar) treat as untitled.
        body: JSON.stringify({ title: title?.trim() || 'New track' }),
      }),
    ),

  /** The instance with its chat messages (two backend calls, made together). */
  getInstance: async (id: string): Promise<InstanceDetail> => {
    const [raw, messages] = await Promise.all([
      request<RawInstance>(at(id)),
      request<RawMessage[]>(`${at(id)}/messages?limit=200`),
    ])
    return instanceFrom(raw, messages)
  },

  deleteInstance: (id: string) => request<void>(at(id), { method: 'DELETE' }),

  /**
   * Sets the instance's goal and starts a research run. The backend replaces the goal on every call,
   * so the app sends this once per chat (from New chat) and never for follow-ups.
   */
  startTracking: async (id: string, text: string): Promise<InstanceDetail> => {
    await request<unknown>(`${at(id)}/messages`, { method: 'POST', body: JSON.stringify({ content: text }) })
    // A new chat is tracked from the start: the run just begun shows its progress, and the backend repeats
    // it on its schedule until the person pauses it.
    await vora.setLive(id, true)
    return vora.getInstance(id)
  },

  /** Pause or resume live tracking; answers with the new state. */
  setLive: async (id: string, enabled: boolean): Promise<{ live_enabled: boolean }> => {
    const state = await request<RawLiveState>(`${at(id)}/live`, { method: 'PATCH', body: JSON.stringify({ enabled }) })
    return { live_enabled: !!state.enabled }
  },

  getDashboard: async (id: string): Promise<DashboardResponse> =>
    dashboardFrom(await request<RawDashboard>(`${at(id)}/dashboard`)),

  getDataset: async (id: string): Promise<RowBatch> => {
    let offset = 0
    let total: number
    const all: RowBatch = { columns: [], rows: [], records: [] }
    do {
      const page = await request<RowBatch & { row_count: number }>(`${at(id)}/dataset?limit=5000&offset=${offset}`)
      all.columns = page.columns
      all.rows.push(...page.rows)
      all.records.push(...page.records)
      offset += page.rows.length
      total = page.row_count
    } while (offset < total && offset > 0)
    return all
  },

  getLive: async (id: string): Promise<LiveSnapshot> => liveSnapshotFrom(await vora.getLiveState(id)),

  /** The backend's own live state (the live hook reads the run's id and status from it). */
  getLiveState: (id: string) => request<RawLiveState>(`${at(id)}/live`),
  getSources: (id: string) => request<{ sources: { url: string; domain: string; status: string }[] }>(`${at(id)}/sources`),

  /** Path of the live event stream (read with api/sse.ts, which sends the token). */
  streamPath: (id: string) => `${at(id)}/live/stream`,
  socketPath: (id: string) => `${at(id)}/live/ws`,
}
