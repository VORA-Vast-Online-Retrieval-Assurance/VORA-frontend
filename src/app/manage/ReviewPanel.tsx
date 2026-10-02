import { useMemo, useState } from 'react'
import { backend } from '../../api/backend.ts'
import type { Observation, Tier } from '../../api/backend.ts'
import { Button } from '../../ui/Button.tsx'
import { download } from '../export/download.ts'
import { useToast } from '../../ui/toast/toastContext.ts'
import { hostOf, message } from './format.ts'
import { Chip, Note, Section, Segments, State } from './parts.tsx'
import { useAsync } from './useAsync.ts'

const TIERS: { id: Tier; label: string; help: string }[] = [
  { id: 'accepted', label: 'Accepted', help: 'Rows that match the request and are well-evidenced. These make the dashboard.' },
  { id: 'partial', label: 'Partial', help: 'Relevant rows missing something the request needs. Kept for review.' },
  { id: 'rejected', label: 'Rejected', help: 'Rows set aside: page chrome, wrong subject or outside the time window.' },
  { id: 'raw', label: 'Raw', help: 'Everything extracted, before any judgement.' },
]

const MAX_COLUMNS = 8

/** A row's own fields, read as text. */
const cell = (o: Observation, key: string) => (o.fields?.[key] ?? '').toString()

/**
 * Every extracted row, by how far it was trusted. Pick a row to see why: its score, the reasons it was
 * kept or set aside, and the page it came from.
 */
export function ReviewPanel({ id, refreshKey }: { id: string; refreshKey: string | number }) {
  const [tier, setTier] = useState<Tier>('accepted')
  const [picked, setPicked] = useState<Observation | null>(null)
  const [busy, setBusy] = useState(false)
  const { toast } = useToast()
  const sources = useAsync(() => backend.sources(id), `${id}:${refreshKey}`)
  const rows = useAsync(
    async () => (tier === 'accepted' ? (await backend.accepted(id, 300)).records : (await backend.tier(id, tier, 300)).rows),
    `${id}:${tier}:${refreshKey}`,
  )
  const counts: Record<Tier, number | undefined> = {
    accepted: sources.data?.accepted_count,
    partial: sources.data?.partial_count,
    rejected: sources.data?.rejected_count,
    raw: sources.data?.raw_count,
  }
  const columns = useMemo(() => {
    const seen = new Map<string, number>()
    for (const r of rows.data ?? []) for (const [k, v] of Object.entries(r.fields ?? {})) if (v) seen.set(k, (seen.get(k) ?? 0) + 1)
    return [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_COLUMNS).map(([k]) => k)
  }, [rows.data])

  const rescore = async () => {
    setBusy(true)
    try {
      await backend.rescore(id)
      toast({ title: 'Scored again', tone: 'success' })
      sources.reload()
      rows.reload()
    } catch (err) {
      toast({ title: 'Couldn’t re-score', description: message(err), tone: 'error' })
    } finally {
      setBusy(false)
    }
  }
  const save = async (format: 'csv' | 'json' | 'jsonl', provenance: boolean) => {
    try {
      const { blob, filename } = await backend.exportDataset(id, format, { provenance, includePartial: tier !== 'accepted' })
      download(blob, filename)
    } catch (err) {
      toast({ title: 'Couldn’t export', description: message(err), tone: 'error' })
    }
  }

  const info = TIERS.find((t) => t.id === tier)!
  return (
    <Section
      title="Review the rows"
      note={info.help}
      actions={
        <>
          <Button variant="secondary" onClick={() => void save('csv', true)}>
            Export CSV with sources
          </Button>
          <Button variant="secondary" onClick={() => void save('json', false)}>
            JSON
          </Button>
          <Button variant="secondary" loading={busy} onClick={() => void rescore()}>
            Score again
          </Button>
        </>
      }
    >
      <Segments
        label="Rows by quality"
        value={tier}
        onChange={(t) => {
          setTier(t)
          setPicked(null)
        }}
        options={TIERS.map((t) => ({ id: t.id, label: <>{t.label} {counts[t.id] !== undefined && <span className="font-mono text-micro opacity-70">{counts[t.id]}</span>}</> }))}
      />
      <State loading={rows.loading && !rows.data} error={rows.error} onRetry={rows.reload} empty={rows.data && rows.data.length === 0 ? `No ${info.label.toLowerCase()} rows yet.` : undefined}>
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="min-w-0 flex-1 overflow-auto rounded-panel border border-edge" style={{ maxHeight: 560 }} data-lenis-prevent>
            <table className="w-full min-w-max text-small">
              <thead className="sticky top-0 z-10 bg-surface">
                <tr className="border-b border-edge">
                  <th className="px-3 py-2 text-left font-mono text-micro font-normal text-ink-3">#</th>
                  {columns.map((c) => (
                    <th key={c} className="px-3 py-2 text-left font-medium">
                      {c.replace(/_/g, ' ')}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-left font-medium">Source</th>
                  {tier !== 'raw' && <th className="px-3 py-2 text-left font-medium">Why</th>}
                </tr>
              </thead>
              <tbody>
                {(rows.data ?? []).map((r, i) => (
                  <tr key={r.id} onClick={() => setPicked(r)} className={`cursor-pointer border-b border-line hover:bg-sunken ${picked?.id === r.id ? 'bg-signal-soft' : ''}`}>
                    <td className="px-3 py-1.5 font-mono text-micro text-ink-3 tabular-nums">{i + 1}</td>
                    {columns.map((c) => (
                      <td key={c} className="max-w-[26ch] truncate px-3 py-1.5" title={cell(r, c)}>
                        {cell(r, c) || <span className="text-ink-3 italic">—</span>}
                      </td>
                    ))}
                    <td className="px-3 py-1.5 font-mono text-micro text-ink-2">{r.source_domain || hostOf(r.source_url)}</td>
                    {tier !== 'raw' && (
                      <td className="max-w-[34ch] truncate px-3 py-1.5 text-ink-2" title={(r.reasons ?? []).join(' · ')}>
                        {r.reasons?.[0] ?? ''}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {picked && <RowDetail row={picked} onClose={() => setPicked(null)} />}
        </div>
      </State>
    </Section>
  )
}

function RowDetail({ row, onClose }: { row: Observation; onClose: () => void }) {
  const parts = Object.entries(row.score_breakdown ?? {})
  return (
    <aside aria-label="Row detail" className="w-full shrink-0 rounded-panel border border-edge p-4 lg:w-80" data-lenis-prevent>
      <div className="flex items-start gap-2">
        <h3 className="flex-1 font-semibold">Why this row</h3>
        <button type="button" onClick={onClose} className="text-small underline underline-offset-2">
          Close
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Chip tone={row.status === 'accepted' ? 'good' : row.status === 'rejected' ? 'bad' : 'default'}>{row.status}</Chip>
        {row.tier && <Chip>{row.tier}</Chip>}
        {row.score !== undefined && <Chip>score {row.score.toFixed(2)}</Chip>}
        <Chip>{row.method}</Chip>
      </div>
      {parts.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-small">
          {parts.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-ink-2">{k}</dt>
              <dd className="text-right font-mono tabular-nums">{v.toFixed(2)}</dd>
            </div>
          ))}
        </dl>
      )}
      {row.reasons?.length > 0 && (
        <ul className="mt-3 list-disc pl-5 text-small text-ink-2">
          {row.reasons.slice(0, 8).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      <h4 className="mt-4 text-small font-semibold">Fields</h4>
      <dl className="mt-1 flex flex-col gap-1 text-small">
        {Object.entries(row.fields ?? {}).map(([k, v]) => (
          <div key={k}>
            <dt className="font-mono text-micro text-ink-3">{k}</dt>
            <dd className="break-words">{String(v) || '—'}</dd>
          </div>
        ))}
      </dl>
      <h4 className="mt-4 text-small font-semibold">Source</h4>
      <a href={row.source_url} target="_blank" rel="noopener noreferrer" className="break-all font-mono text-micro underline underline-offset-2">
        {row.source_url}
      </a>
      {row.source_title && <p className="mt-1 text-small text-ink-2">{row.source_title}</p>}
      {(row.data_period || row.fetched_at) && (
        <p className="mt-2 font-mono text-micro text-ink-3">
          {row.data_period ? `Period ${row.data_period}${row.time_inferred ? ' (inferred)' : ''}` : ''}
          {row.fetched_at ? `${row.data_period ? ' · ' : ''}read ${row.fetched_at.slice(0, 16).replace('T', ' ')} UTC` : ''}
        </p>
      )}
      {row.context && <Note>{row.context}</Note>}
    </aside>
  )
}
