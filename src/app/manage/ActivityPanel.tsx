import { useEffect, useState } from 'react'
import type { RawRun } from '../../api/adapt.ts'
import { backend } from '../../api/backend.ts'
import { timeAgo } from '../../api/dates.ts'
import { Button } from '../../ui/Button.tsx'
import { useToast } from '../../ui/toast/toastContext.ts'
import { message } from './format.ts'
import { Chip, Note, Section, Stat, State } from './parts.tsx'
import { useAsync } from './useAsync.ts'

const ACTIVE = ['queued', 'running']
const tone = (s: string) => (s === 'succeeded' ? 'good' : s === 'failed' ? 'bad' : 'default')

const elapsed = (r: RawRun) => {
  const from = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(r.created_at ?? '') ? r.created_at! : `${r.created_at}Z`)
  const to = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(r.updated_at) ? r.updated_at : `${r.updated_at}Z`)
  return Number.isFinite(from) && Number.isFinite(to) ? Math.max(0, Math.round((to - from) / 1000)) : null
}

/**
 * What the pipeline did and is doing: every run of this chat, the step-by-step timeline of the one you pick,
 * and controls to stop or repeat a run.
 */
export function ActivityPanel({ id, refreshKey }: { id: string; refreshKey: string | number }) {
  const runs = useAsync(() => backend.runs(id, 50), `${id}:${refreshKey}`)
  const fresh = useAsync(() => backend.freshness(id), `${id}:${refreshKey}`)
  const [picked, setPicked] = useState<string | null>(null)
  const { toast } = useToast()
  const list = runs.data ?? []
  const active = list.find((r) => ACTIVE.includes(r.status))
  const selected = picked ?? list[0]?.id ?? null
  const detail = useAsync(() => (selected ? backend.runDetail(id, selected) : Promise.resolve(null)), `${id}:${selected}:${refreshKey}`)

  // While a run is going, keep its timeline current.
  const reloadDetail = detail.reload
  const reloadRuns = runs.reload
  useEffect(() => {
    if (!active) return
    const t = window.setInterval(() => {
      reloadRuns()
      reloadDetail()
    }, 3000)
    return () => window.clearInterval(t)
  }, [active, reloadRuns, reloadDetail])

  const act = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn()
      runs.reload()
      detail.reload()
    } catch (err) {
      toast({ title: `Couldn’t ${label}`, description: message(err), tone: 'error' })
    }
  }

  const next = fresh.data?.next_cycle_at
  return (
    <div className="flex flex-col gap-6">
      <Section
        title="Runs"
        note="Each time VORA looks for data is one run. Live tracking starts a new one on a schedule."
        actions={
          active ? (
            <Button variant="secondary" onClick={() => void act('stop that run', () => backend.cancelRun(id, active.id))}>
              Stop the running one
            </Button>
          ) : (
            <Button onClick={() => void act('start a run', () => backend.startRun(id))}>Run now</Button>
          )
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Runs so far" value={list.length} />
          <Stat label="Rows in the dataset" value={fresh.data?.row_count ?? '—'} />
          <Stat label="Data" value={fresh.data?.state === 'fresh' ? 'Fresh' : 'None yet'} hint={fresh.data?.observed_at ? `read ${timeAgo(fresh.data.observed_at)}` : undefined} />
          <Stat label="Next run" value={next ? new Date(next).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} hint={next ? undefined : 'Turn on live tracking'} />
        </div>
        <State loading={runs.loading && !runs.data} error={runs.error} onRetry={runs.reload} empty={list.length === 0 ? 'No runs yet.' : undefined}>
          <ul className="flex flex-col gap-2">
            {list.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setPicked(r.id)}
                  aria-pressed={selected === r.id}
                  className={`flex w-full flex-wrap items-center gap-2 rounded-panel border p-3 text-left ${selected === r.id ? 'border-edge bg-signal-soft' : 'border-line hover:border-edge-strong'}`}
                >
                  <Chip tone={tone(r.status)}>{r.status}</Chip>
                  <span className="min-w-0 flex-1 truncate text-small" title={r.error || r.detail}>
                    {r.error || r.detail}
                  </span>
                  <span className="font-mono text-micro text-ink-3">
                    {r.rows_total} rows{r.rows_added ? ` · +${r.rows_added}` : ''} · {timeAgo(r.created_at)}
                    {elapsed(r) !== null && ACTIVE.indexOf(r.status) < 0 ? ` · ${elapsed(r)} s` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </State>
      </Section>

      {selected && (
        <Section
          title="Timeline"
          actions={
            detail.data && !ACTIVE.includes(detail.data.run.status) ? (
              <Button variant="secondary" onClick={() => void act('repeat that run', () => backend.retryRun(id, selected))}>
                Run again
              </Button>
            ) : undefined
          }
        >
          <State loading={detail.loading && !detail.data} error={detail.error} onRetry={detail.reload}>
            {detail.data && (
              <>
                {detail.data.run.error && <Note tone="error">{detail.data.run.error}</Note>}
                <ol className="flex flex-col border-l border-edge pl-4">
                  {detail.data.events.map((e) => (
                    <li key={e.id} className="relative pb-3">
                      <span className="absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full border border-edge bg-surface" aria-hidden />
                      <p className="text-small">
                        <span className="font-semibold">{e.phase}</span> · {e.detail}
                      </p>
                      <p className="font-mono text-micro text-ink-3">{timeAgo(e.created_at)}</p>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </State>
        </Section>
      )}
    </div>
  )
}
