import { useEffect, useMemo, useState } from 'react'
import type { TableProfile } from '../../analytics/profile.ts'
import { CHART_LABEL } from '../../analytics/spec.ts'
import type { ChartSpec } from '../../analytics/spec.ts'
import { suggestCharts } from '../../analytics/suggest.ts'
import { CheckIcon } from '../../ui/icons.tsx'
import { CloseIcon, PlusIcon } from '../../ui/appIcons.tsx'
import { useFocusTrap } from '../../ui/useFocusTrap.ts'
import { ChartBuilder } from './ChartBuilder.tsx'

type Props = {
  profile: TableProfile
  /** Specs already on the dashboard, so suggestions can say "added". */
  current: ChartSpec[]
  /** Set when editing an existing tile: opens straight into the builder. */
  editing?: ChartSpec
  onAdd: (spec: ChartSpec) => void
  onUpdate: (spec: ChartSpec) => void
  onClose: () => void
}

const same = (a: ChartSpec, b: ChartSpec) => a.type === b.type && JSON.stringify(a.query) === JSON.stringify(b.query) && a.x === b.x && a.y === b.y

/** "Add charts": pick from the suggestions (each says why it fits) or build your own. */
export function ChartPicker({ profile, current, editing, onAdd, onUpdate, onClose }: Props) {
  const [tab, setTab] = useState<'suggested' | 'build'>(editing ? 'build' : 'suggested')
  const trap = useFocusTrap<HTMLDivElement>(true)
  const ideas = useMemo(() => suggestCharts(profile), [profile])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 sm:p-10" data-lenis-prevent onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={trap} role="dialog" aria-modal="true" aria-label={editing ? 'Edit chart' : 'Add charts'} className="w-full max-w-4xl rounded-panel border border-edge bg-surface p-5">
        <div className="mb-4 flex items-center gap-4 border-b border-edge pb-3">
          <h2 className="font-display font-wide text-h3 font-extrabold">{editing ? 'Edit chart' : 'Add charts'}</h2>
          {!editing && (
            <div className="flex gap-1" role="tablist">
              {(['suggested', 'build'] as const).map((t) => (
                <button key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => setTab(t)} className={`rounded-control px-3 py-1.5 text-small ${tab === t ? 'bg-ink text-on-ink' : 'hover:bg-sunken'}`}>
                  {t === 'suggested' ? 'Suggested' : 'Build your own'}
                </button>
              ))}
            </div>
          )}
          <button type="button" aria-label="Close" onClick={onClose} className="ml-auto grid size-8 place-items-center rounded-control hover:bg-sunken">
            <CloseIcon />
          </button>
        </div>

        {tab === 'suggested' ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {ideas.map((s) => {
              const added = current.some((c) => same(c, s))
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={added}
                    onClick={() => onAdd(s)}
                    className="flex h-full w-full items-start gap-3 rounded-panel border border-line p-3 text-left transition-colors duration-300 ease-soft hover:border-edge-strong disabled:cursor-default disabled:bg-sunken disabled:hover:border-line"
                  >
                    <span className={`grid size-7 shrink-0 place-items-center rounded-control border ${added ? 'border-edge bg-signal' : 'border-edge'}`}>{added ? <CheckIcon /> : <PlusIcon />}</span>
                    <span className="min-w-0">
                      <span className="block text-small font-semibold">{s.title}</span>
                      <span className="block font-mono text-micro text-ink-3">{CHART_LABEL[s.type]}{added ? ' · on the dashboard' : ''}</span>
                      <span className="mt-1 block text-small text-ink-2">{s.reason}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <ChartBuilder
            profile={profile}
            initial={editing}
            onCancel={onClose}
            onSave={(spec) => {
              if (editing) onUpdate(spec)
              else onAdd(spec)
              onClose()
            }}
          />
        )}
      </div>
    </div>
  )
}
