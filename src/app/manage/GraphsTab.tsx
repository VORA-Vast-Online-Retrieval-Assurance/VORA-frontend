import { useEffect, useMemo, useState } from 'react'
import { vora } from '../../api/vora.ts'
import { graphIdeas } from '../../analytics/chooseChart.ts'
import { isMeasure, profileTable } from '../../analytics/profile.ts'
import type { TableProfile } from '../../analytics/profile.ts'
import { CHART_LABEL, newId, typesFor } from '../../analytics/spec.ts'
import type { ChartSpec, ChartType } from '../../analytics/spec.ts'
import { Button } from '../../ui/Button.tsx'
import { ChartBuilder } from '../dashboard/ChartBuilder.tsx'
import { ChartView } from '../dashboard/charts/ChartView.tsx'
import { useResult } from '../dashboard/charts/useResult.ts'
import { PrecisionNote } from '../dashboard/PrecisionNote.tsx'
import { Section, State } from './parts.tsx'
import { useAsync } from './useAsync.ts'

const CHART_HEIGHT = 296
const keyFor = (id: string) => `vora.graphs.v1.${id}`
const signatureOf = (p: TableProfile) => p.columns.filter((c) => !c.virtual).map((c) => c.name).join('|')
type Saved = { signature: string; specs: ChartSpec[] }

function initial(id: string, profile: TableProfile): ChartSpec[] {
  try {
    const raw = localStorage.getItem(keyFor(id))
    if (raw) {
      const saved = JSON.parse(raw) as Saved
      if (saved.signature === signatureOf(profile) && Array.isArray(saved.specs)) return saved.specs
    }
  } catch { /* private browsing may block storage */ }
  return graphIdeas(profile).map((spec) => ({ ...spec, id: newId('g') }))
}

export function GraphsTab({ id, refreshKey }: { id: string; refreshKey: string | number }) {
  const table = useAsync(() => vora.getDashboard(id), `${id}:${refreshKey}`)
  const profile = useMemo(() => (table.data?.table ? profileTable(table.data.table) : null), [table.data])
  return (
    <Section title="Graphs" note="Charts use the rows in this chat. Each measure has its own scale; changes are saved in this browser for this chat.">
      <State loading={table.loading && !table.data} error={table.error} onRetry={table.reload}>
        {profile && <GraphPanel key={`${id}:${signatureOf(profile)}`} id={id} profile={profile} />}
      </State>
    </Section>
  )
}

function GraphPanel({ id, profile }: { id: string; profile: TableProfile }) {
  const [specs, setSpecs] = useState(() => initial(id, profile))
  const [editing, setEditing] = useState<ChartSpec | 'new' | null>(null)
  useEffect(() => {
    try { localStorage.setItem(keyFor(id), JSON.stringify({ signature: signatureOf(profile), specs } satisfies Saved)) }
    catch { /* charts still work without storage */ }
  }, [id, profile, specs])
  const update = (spec: ChartSpec) => {
    setSpecs((current) => editing === 'new'
      ? [...current, { ...spec, id: newId('g') }]
      : current.map((item) => item.id === spec.id ? spec : item))
    setEditing(null)
  }
  const measures = profile.columns.filter(isMeasure)
  const explanation = profile.rowCount === 0
    ? 'No accepted rows yet. Graphs appear as rows arrive.'
    : measures.length === 0 && !profile.columns.some((c) => c.kind === 'category' || c.kind === 'period')
      ? 'These rows contain text without a usable date, category or numeric measure. Keep reviewing the table; graphs will appear when structured values arrive.'
      : 'No graph choices are saved. Add a chart to choose fields and an aggregation.'
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setEditing('new')}>Add chart</Button>
        <Button variant="ghost" onClick={() => setSpecs(graphIdeas(profile).map((spec) => ({ ...spec, id: newId('g') })))}>Restore suggestions</Button>
      </div>
      {editing && (
        <section className="rounded-panel border border-edge p-4" aria-label={editing === 'new' ? 'Add chart' : 'Edit chart'}>
          <ChartBuilder key={editing === 'new' ? 'new' : editing.id} profile={profile} initial={editing === 'new' ? undefined : editing} onSave={update} onCancel={() => setEditing(null)} />
        </section>
      )}
      {specs.length === 0 ? <p className="rounded-panel border border-line p-5 text-small text-ink-2">{explanation}</p> : (
        <div className="grid gap-3 lg:grid-cols-2">
          {specs.map((spec, index) => (
            <GraphCard key={spec.id} spec={spec} profile={profile} wide={spec.type === 'line' || spec.type === 'area' || index === 0}
              onChange={(next) => setSpecs((current) => current.map((item) => item.id === spec.id ? next : item))}
              onEdit={() => setEditing(spec)} onRemove={() => setSpecs((current) => current.filter((item) => item.id !== spec.id))} />
          ))}
        </div>
      )}
    </div>
  )
}

function GraphCard({ spec, profile, wide, onChange, onEdit, onRemove }: {
  spec: ChartSpec; profile: TableProfile; wide: boolean
  onChange: (spec: ChartSpec) => void; onEdit: () => void; onRemove: () => void
}) {
  const result = useResult(profile, spec, [])
  const grouped = spec.query.groupBy !== undefined
  const timeGroup = grouped && profile.columns[spec.query.groupBy!]?.kind === 'period'
  const types: ChartType[] = spec.type === 'scatter' ? ['scatter'] : typesFor(grouped, timeGroup)
  return (
    <section aria-label={spec.title} className={`neo-panel relative flex min-w-0 flex-col p-4 ${wide ? 'lg:col-span-2' : ''}`}>
      <header className="mb-1 flex shrink-0 flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate text-small font-semibold" title={spec.title}>{spec.title}</h3>
        <label className="shrink-0">
          <span className="sr-only">Chart type for {spec.title}</span>
          <select value={spec.type} onChange={(e) => onChange({ ...spec, type: e.target.value as ChartType })}
            className="h-7 rounded-control border border-line bg-surface px-1.5 text-micro hover:border-edge-strong focus-visible:border-edge focus-visible:outline-none">
            {types.map((type) => <option key={type} value={type}>{CHART_LABEL[type]}</option>)}
          </select>
        </label>
        <button type="button" onClick={onEdit} className="text-micro underline underline-offset-2">Edit</button>
        <button type="button" onClick={onRemove} className="text-micro underline underline-offset-2">Remove</button>
      </header>
      <p className="mb-1 text-micro text-ink-3">{spec.reason}</p>
      <div className="min-h-0 flex-1"><ChartView spec={spec} profile={profile} height={CHART_HEIGHT} /></div>
      <footer className="mt-1 shrink-0 border-t border-line pt-1"><PrecisionNote profile={profile} result={result} /></footer>
    </section>
  )
}
