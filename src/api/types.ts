/**
 * The shapes the app draws. The VORA backend answers a little differently (api/adapt.ts has its raw
 * response types and translates). Dates are ISO strings. Every dataset cell arrives as a string;
 * src/analytics parses them.
 */

export type LivePhase = 'idle' | 'discovery' | 'inspect' | 'extract' | 'merge' | 'sleep' | 'error' | 'stopped'

export interface ChatMessage {
  id: string | number
  role: 'user' | 'bot'
  /** Markdown: **bold**, _italic_, lists, links. */
  text: string
  created_at: string
}

export interface InstanceSummary {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export interface InstanceDetail extends InstanceSummary {
  messages: ChatMessage[]
  live_enabled: boolean
  dataset_row_count: number
}

/** ExtractedTable. `name` and `source_url` are missing from the backend's own docs but always sent. */
export interface DatasetTable {
  name?: string
  source_url?: string
  columns: string[]
  rows: (string | number | null)[][]
  row_count?: number
}

export interface LiveStatus {
  phase: LivePhase
  detail: string
  current_source: string
  rows_total: number
  rows_added_last_cycle: number
  cycle: number
  live_enabled: boolean
  updated_at: string
  run_started_at?: string
  batch_seconds?: number
  next_cycle_at?: string | null
}

export interface LiveSnapshot {
  live_enabled: boolean
  /** Empty object when the instance has never run. */
  status: Partial<LiveStatus>
  rows_total: number
}

export interface DashboardResponse {
  rows_total: number
  table: DatasetTable | null
  updated_at: string | null
}

/** One server-sent event on /live/stream. The first one after connecting carries the dataset. */
export interface LiveStreamPayload {
  live_enabled: boolean
  status: Partial<LiveStatus>
  rows_total: number
  dataset?: DatasetTable
  /** The bot rewrote a message: refetch the instance. */
  chat_updated?: boolean
}
