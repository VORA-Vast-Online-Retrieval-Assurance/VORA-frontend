import type {
  ChatMessage,
  DashboardResponse,
  DatasetTable,
  InstanceDetail,
  InstanceSummary,
  LivePhase,
  LiveSnapshot,
  LiveStatus,
} from './types.ts'

/**
 * The VORA backend (api/application.py) as it actually answers, and the small translations into the shapes
 * the app draws. Everything that differs between the two lives here, so screens never see raw responses.
 */

export interface RawInstance {
  id: string
  title: string
  goal?: string
  archived?: boolean
  live_enabled: boolean
  dataset_row_count: number
  created_at: string
  updated_at: string
}

export interface RawMessage {
  id: string
  role: string
  content: string
  created_at: string
}

export interface RawRun {
  id: string
  instance_id?: string
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | string
  phase: string
  detail: string
  rows_total: number
  rows_added: number
  error?: string | null
  created_at?: string
  started_at?: string | null
  finished_at?: string | null
  updated_at: string
}

/** GET /instances/{id}/live, and the `status` events on /live/stream. */
export interface RawLiveState {
  enabled: boolean
  latest_run: RawRun | null
  interval_seconds?: number
  batch_seconds?: number
  next_cycle_at?: string | null
  rows_total: number
}

export interface RawDashboard {
  instance?: RawInstance
  rows_total: number
  table: DatasetTable | null
}

export function messageFrom(raw: RawMessage): ChatMessage {
  return { id: raw.id, role: raw.role === 'user' ? 'user' : 'bot', text: raw.content, created_at: raw.created_at }
}

export function summaryFrom(raw: RawInstance): InstanceSummary {
  return { id: raw.id, title: raw.title, created_at: raw.created_at, updated_at: raw.updated_at }
}

export function instanceFrom(raw: RawInstance, messages: RawMessage[] = []): InstanceDetail {
  return {
    ...summaryFrom(raw),
    messages: messages.map(messageFrom),
    live_enabled: !!raw.live_enabled,
    dataset_row_count: raw.dataset_row_count ?? 0,
  }
}

/** The app's five-step pipeline vocabulary for the backend's finer phases. */
const RUNNING: Record<string, LivePhase> = {
  planning: 'discovery',
  discovery: 'discovery',
  rendering: 'inspect',
  extracting: 'extract',
  scoring: 'merge',
  merging: 'merge',
  complete: 'sleep',
}

export function phaseOf(run: RawRun | null): LivePhase {
  if (!run) return 'idle'
  switch (run.status) {
    case 'queued':
      return 'idle'
    case 'succeeded':
      return 'sleep'
    case 'failed':
      return 'error'
    case 'cancelled':
      return 'stopped'
    default:
      return RUNNING[run.phase] ?? 'discovery'
  }
}

/** Run details read "Rendering example.org (2/8)" or "example.org: found 3 tables". */
export function currentSourceOf(run: RawRun | null): string {
  if (!run || !['running'].includes(run.status)) return ''
  const m = /^(?:Rendering\s+)?((?:[a-z0-9-]+\.)+[a-z]{2,})(?:[\s:(]|$)/i.exec(run.detail ?? '')
  return m ? m[1].toLowerCase() : ''
}

export function statusFrom(state: RawLiveState): Partial<LiveStatus> {
  const run = state.latest_run
  if (!run) return {}
  return {
    phase: phaseOf(run),
    detail: run.status === 'failed' && run.error ? run.error : (run.detail ?? ''),
    current_source: currentSourceOf(run),
    rows_total: state.rows_total ?? run.rows_total ?? 0,
    rows_added_last_cycle: run.rows_added ?? 0,
    live_enabled: state.enabled,
    updated_at: run.updated_at,
    run_started_at: run.started_at ?? run.created_at,
    batch_seconds: state.batch_seconds,
    next_cycle_at: state.next_cycle_at,
  }
}

export function liveSnapshotFrom(state: RawLiveState): LiveSnapshot {
  return { live_enabled: !!state.enabled, status: statusFrom(state), rows_total: state.rows_total ?? 0 }
}

export function dashboardFrom(raw: RawDashboard, updatedAt: string | null = null): DashboardResponse {
  return { rows_total: raw.rows_total ?? 0, table: raw.table, updated_at: raw.instance?.updated_at ?? updatedAt }
}
