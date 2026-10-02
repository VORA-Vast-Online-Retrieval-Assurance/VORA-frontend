import { API_PREFIX } from './vora.ts'
import type { RawInstance, RawRun } from './adapt.ts'
import { ApiError, authedFetch, request } from './client.ts'

/**
 * The VORA backend's other endpoints: runs and their timeline, rows by quality tier, sources and files,
 * graphs by parameter, track settings, and the service-wide tools. Shapes follow api/application.py.
 */

const inst = (id: string) => `${API_PREFIX}/instances/${encodeURIComponent(id)}`
const json = (body: unknown) => JSON.stringify(body)

// -- runs -------------------------------------------------------------------------------------------------

export interface RunEvent {
  id: number
  run_id: string
  phase: string
  detail: string
  created_at: string
}

export interface RunDetail {
  run: RawRun
  events: RunEvent[]
  phases: string[]
}

export interface Freshness {
  state: 'fresh' | 'missing' | string
  observed_at: string | null
  scored_at: string | null
  row_count: number
  next_cycle_at: string | null
}

// -- rows by quality ----------------------------------------------------------------------------------------

export type Tier = 'accepted' | 'partial' | 'rejected' | 'raw'

/** One extracted row with where it came from and why it was kept or set aside. */
export interface Observation {
  id: string
  source_url: string
  method: string
  fields: Record<string, string>
  status: string
  tier?: string
  score?: number
  score_breakdown?: Record<string, number>
  reasons: string[]
  content_role?: string
  source_domain?: string
  source_title?: string
  data_period?: string | null
  time_inferred?: boolean
  temporal_confidence?: number
  published_at?: string | null
  modified_at?: string | null
  fetched_at?: string | null
  extraction_confidence?: number
  context?: string
}

export interface ObservationPage {
  rows: Observation[]
  row_count: number
  limit: number
  offset: number
}

export interface DatasetStats {
  row_count: number
  column_count: number
  fill_rate: number
  duplicate_rows: number
  tier_counts: Record<string, number>
  inferred_periods: number
  explicit_periods: number
  distinct_periods: number
  period_min: string | null
  period_max: string | null
  mean_score: number
  source_count: number
}

// -- sources ------------------------------------------------------------------------------------------------

export interface SourceRow {
  id: string
  url: string
  title: string
  status: string
  extracted: number
  accepted: number
  partial: number
  rejected: number
  elapsed_seconds: number
  reason: string
  domain: string
  published_at: string | null
  modified_at: string | null
  fetched_at: string | null
}

export interface SourcesResponse {
  candidate_count: number
  sources: SourceRow[]
  raw_count: number
  partial_count: number
  accepted_count: number
  rejected_count: number
  research_outcome: string
}

export interface FileRow {
  id: string
  url: string
  name: string
  title: string
  extension: string
  file_type: string
  found_via: string
  linked_from: string
  relevance: number
  extractable: boolean
  status: string
  reason: string
  size_bytes: number | null
  content_type: string | null
}

export interface FilesResponse {
  files: FileRow[]
  counts: Record<string, number>
  extractable_formats: string[]
}

export interface PreferredSources {
  domains: string[]
  global: string[]
}

// -- graphs -------------------------------------------------------------------------------------------------

export interface GraphParameter {
  name: string
  unit: string
  points: number
  x_kind: string
  period_min: string | null
  period_max: string | null
  series_count: number
}

export interface GraphPoint {
  x: string
  value: number
  /** The cell as written in the source. */
  raw?: string
  observation_id?: string
  source_url?: string
}

export interface GraphSeries {
  name: string
  points: GraphPoint[]
}

export interface GraphChart {
  parameter: string
  unit: string
  omitted: number
  duplicates: number
  type: 'line' | 'bar' | string
  x: string
  group: string
  series: GraphSeries[]
}

// -- plan preview -------------------------------------------------------------------------------------------

export interface GoalPlan {
  normalized_goal: string
  intent: string
  search_queries: string[]
  required_fields: string[]
  year_start?: number | null
  year_end?: number | null
  subject_terms: string[]
  subject_heads: string[]
  concepts: { name: string; role: string; kind: string; aliases: string[]; source: string }[]
  time_scope?: { expression: string; start: string | null; end: string | null; granularity: string; periods: string[]; policy: string } | null
  geography: string[]
  entities: string[]
  answer_shape: 'quantities' | 'records' | 'either' | string
  source_mentions: string[]
  planner?: string
}

// -- service-wide -------------------------------------------------------------------------------------------

export interface BrowserPoolStats {
  active_batches: number
  max_concurrent_batches: number
  size: number
  started: number
  busy: number
  queued: number
  tasks_done: number
  recycled: number
  restarts: number
}

export interface Readiness {
  ready: boolean
  reason?: string
  headless?: boolean
  browsers?: BrowserPoolStats
  llm_models?: string[]
  llm_available?: string[]
  search?: string
  free_memory_mb?: number
  interactive_pass?: boolean
}

export interface SearchStatus {
  api: string | null
  engines: { name: string; resting_seconds: number; blocks_in_a_row: number }[]
  searches_last_hour: number
  max_searches_per_hour: number
  interval_seconds: number
  cooldown_minutes: number
}

export interface Reputation {
  domain: string
  attempts: number
  productive: number
  accepted_rows: number
  blocked: number
  failed: number
  last_blocked_at: string | null
  last_seen_at: string | null
}

export interface Webhook {
  id: string
  url: string
  events: string[]
  enabled: boolean
  created_at: string
}

export interface CacheItem {
  goal_signature: string
  instance_id: string
  goal: string
  row_count: number
  observed_at: string
}

export interface Extractor {
  id: string
  kind: string
}

const query = (params: Record<string, string | number | boolean | undefined>) => {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined) q.set(k, String(v))
  const s = q.toString()
  return s ? `?${s}` : ''
}

/** Everything beyond the chat itself. Each call is one backend request. */
export const backend = {
  // runs
  runs: (id: string, limit = 50) => request<RawRun[]>(`${inst(id)}/runs${query({ limit })}`),
  runDetail: (id: string, runId: string, after = 0) =>
    request<RunDetail>(`${inst(id)}/runs/${encodeURIComponent(runId)}/events${query({ after })}`),
  startRun: (id: string) => request<RawRun>(`${inst(id)}/runs`, { method: 'POST' }),
  cancelRun: (id: string, runId: string) => request<RawRun>(`${inst(id)}/runs/${encodeURIComponent(runId)}/cancel`, { method: 'POST' }),
  retryRun: (id: string, runId: string) => request<RawRun>(`${inst(id)}/runs/${encodeURIComponent(runId)}/retry`, { method: 'POST' }),
  freshness: (id: string) => request<Freshness>(`${inst(id)}/freshness`),

  // rows by quality
  tier: (id: string, tier: Exclude<Tier, 'accepted'>, limit = 200, offset = 0) =>
    request<ObservationPage>(`${inst(id)}/dataset/${tier}${query({ limit, offset })}`),
  accepted: (id: string, limit = 200, offset = 0) =>
    request<{ records: Observation[]; row_count: number }>(`${inst(id)}/dataset${query({ limit, offset })}`),
  stats: (id: string) => request<DatasetStats>(`${inst(id)}/dataset/stats`),
  rescore: (id: string) => request<Record<string, number>>(`${inst(id)}/dataset/rescore`, { method: 'POST' }),
  clearDataset: (id: string) => request<void>(`${inst(id)}/dataset`, { method: 'DELETE' }),

  /** The dataset file, downloaded with the token (a plain link could not carry it). */
  exportDataset: async (id: string, format: 'csv' | 'json' | 'jsonl', opts: { provenance?: boolean; includePartial?: boolean } = {}) => {
    const res = await authedFetch(
      `${inst(id)}/dataset/export${query({ format, provenance: opts.provenance || undefined, include_partial: opts.includePartial || undefined })}`,
    )
    if (!res.ok) throw new ApiError(res.status, (await res.text()) || `HTTP ${res.status}`)
    return { blob: await res.blob(), filename: `dataset.${format}` }
  },

  // sources
  sources: (id: string) => request<SourcesResponse>(`${inst(id)}/sources`),
  files: (id: string) => request<FilesResponse>(`${inst(id)}/files`),
  extractFile: (id: string, fileId: string) =>
    request<FileRow>(`${inst(id)}/files/${encodeURIComponent(fileId)}/extract`, { method: 'POST' }),
  preferred: (id: string) => request<PreferredSources>(`${inst(id)}/preferred-sources`),
  setPreferred: (id: string, domains: string[]) =>
    request<PreferredSources>(`${inst(id)}/preferred-sources`, { method: 'PUT', body: json({ domains }) }),

  // graphs
  graphParameters: (id: string) =>
    request<{ parameters: GraphParameter[]; dimensions: { name: string; distinct: number }[]; row_count: number }>(
      `${inst(id)}/graph/parameters`,
    ),
  graph: (id: string, parameters?: string[]) =>
    request<{ charts: GraphChart[]; parameters: string[]; selected: string[]; row_count: number }>(
      `${inst(id)}/graph${query({ parameters: parameters?.join(',') })}`,
    ),

  // track settings
  updateInstance: (id: string, changes: { title?: string; archived?: boolean; live_enabled?: boolean }) =>
    request<RawInstance>(inst(id), { method: 'PATCH', body: json(changes) }),
  duplicate: (id: string) => request<RawInstance>(`${inst(id)}/duplicate`, { method: 'POST' }),

  // plan preview (no model call, so it is cheap enough to run as the person types)
  analyze: (goal: string) => request<GoalPlan>(`${API_PREFIX}/goals/analyze?mode=fast`, { method: 'POST', body: json({ goal }) }),

  // service-wide tools
  ready: async (): Promise<Readiness> => {
    // /ready answers 503 with the reason when the browser is missing; that is data, not a failure.
    const res = await authedFetch(`${API_PREFIX}/ready`)
    return (await res.json()) as Readiness
  },
  capabilities: () => request<Record<string, unknown>>(`${API_PREFIX}/capabilities`),
  searchStatus: () => request<SearchStatus>(`${API_PREFIX}/search/status`),
  reputation: (limit = 100) => request<Reputation[]>(`${API_PREFIX}/sources/reputation${query({ limit })}`),
  globalPreferred: () => request<{ domains: string[] }>(`${API_PREFIX}/sources/preferred`),
  setGlobalPreferred: (domains: string[]) =>
    request<{ domains: string[] }>(`${API_PREFIX}/sources/preferred`, { method: 'PUT', body: json({ domains }) }),
  cache: () => request<{ items: CacheItem[] }>(`${API_PREFIX}/cache`),
  invalidateCache: (signature: string) => request<unknown>(`${API_PREFIX}/cache/${encodeURIComponent(signature)}/invalidate`, { method: 'POST' }),
  webhooks: () => request<Webhook[]>(`${API_PREFIX}/webhooks`),
  createWebhook: (url: string, events: string[]) =>
    request<Webhook>(`${API_PREFIX}/webhooks`, { method: 'POST', body: json({ url, events, enabled: true }) }),
  updateWebhook: (id: string, changes: { url?: string; events?: string[]; enabled?: boolean }) =>
    request<Webhook>(`${API_PREFIX}/webhooks/${encodeURIComponent(id)}`, { method: 'PATCH', body: json(changes) }),
  deleteWebhook: (id: string) => request<void>(`${API_PREFIX}/webhooks/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  extractors: () => request<Extractor[]>(`${API_PREFIX}/extractors`),
}
