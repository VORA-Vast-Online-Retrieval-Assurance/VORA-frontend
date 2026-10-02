import type { ReactNode } from 'react'
import { Button } from '../../ui/Button.tsx'

/** Small shared pieces for the management screens (review, sources, graphs, activity, settings, tools). */

export function Section({ title, note, actions, children }: { title: string; note?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3 border-t border-edge pt-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-display font-wide text-h3 font-extrabold">{title}</h2>
          {note && <p className="mt-1 max-w-[70ch] text-small text-ink-2">{note}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  )
}

export function Note({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'error' }) {
  return (
    <p className={`rounded-panel border px-4 py-3 text-small ${tone === 'error' ? 'border-blocked text-blocked' : 'border-dashed border-line-strong text-ink-2'}`}>
      {children}
    </p>
  )
}

/** Loading, error and empty states in one place. */
export function State({ loading, error, empty, onRetry, children }: { loading: boolean; error: string | null; empty?: ReactNode; onRetry?: () => void; children: ReactNode }) {
  if (error && !loading)
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Note tone="error">{error}</Note>
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    )
  if (loading) return <p className="font-mono text-micro text-ink-3">Loading…</p>
  if (empty) return <Note>{empty}</Note>
  return <>{children}</>
}

export function Chip({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'good' | 'bad' | 'warn' }) {
  const tones = {
    default: 'border-line-strong text-ink-2',
    good: 'border-edge bg-signal-soft text-ink',
    bad: 'border-blocked text-blocked',
    warn: 'border-edge text-ink',
  }
  return <span className={`inline-flex items-center rounded-control border px-2 py-0.5 font-mono text-micro ${tones[tone]}`}>{children}</span>
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="border border-edge bg-surface p-3 shadow-soft">
      <p className="font-mono text-micro text-ink-3">{label}</p>
      <p className="mt-1 font-display font-wide text-h3 font-extrabold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-micro text-ink-3">{hint}</p>}
    </div>
  )
}

/** A horizontal segmented control. */
export function Segments<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: ReactNode }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1 rounded-panel border border-edge p-0.5">
      {options.map((o) => (
        <button key={o.id} type="button" role="tab" aria-selected={value === o.id} onClick={() => onChange(o.id)} className={`h-9 rounded-control px-3 text-small ${value === o.id ? 'bg-ink text-on-ink' : 'hover:bg-sunken'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
