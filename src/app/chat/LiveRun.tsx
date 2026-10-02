import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { domainOf } from '../../domain/format.ts'
import type { LiveState } from '../../api/useLiveStream.ts'
import { CallChip } from '../../ui/micro/CallChip.tsx'
import { ThoughtLine } from '../../ui/micro/ThoughtLine.tsx'
import { phaseLabel, STEPS, stepStatus, WORKING } from './phases.ts'

type Props = {
  live: LiveState
  /** Re-arms tracking after an error: live off, then on (PATCH /live). */
  onRetry: () => void
  /** Under the steps: the websites involved. */
  footer?: ReactNode
}

/**
 * What the backend is doing right now: a ThoughtLine for the phase and its detail, one CallChip per pipeline
 * step with the page being read, and the row count. Fed by the live stream (SSE, or polling when it drops).
 */
export function LiveRun({ live, onRetry, footer }: Props) {
  const [now, setNow] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const s = live.status
  const working = live.liveEnabled && WORKING.includes(s.phase ?? 'idle')
  const hasData = live.rowsTotal > 0 || !!live.dataset
  const source = s.current_source ? (/^https?:/i.test(s.current_source) ? domainOf(s.current_source) : s.current_source) : undefined
  const label = phaseLabel(s, live.liveEnabled)

  return (
    <section aria-label="Live run" aria-live="polite" className="neo-panel bg-lavender-soft p-5 sm:p-6">
      <p className="mb-4 border-b border-edge pb-3 font-mono text-micro font-bold uppercase tracking-wider">02 / Live discovery</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ThoughtLine
          label={label}
          doneLabel={s.phase === 'error' ? label : `${label} · ${live.rowsTotal.toLocaleString('en-IN')} rows`}
          working={working}
          steps={working && s.detail ? [s.detail] : undefined}
          collapsible={false}
          showTimer={false}
        />
        <span className="font-mono text-micro text-ink-3">
          {live.rowsTotal.toLocaleString('en-IN')} rows
          {s.cycle ? ` · cycle ${s.cycle}` : ''}
          {s.rows_added_last_cycle ? ` · +${s.rows_added_last_cycle} last cycle` : ''}
          {!live.connected && ' · reconnecting'}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-micro text-ink-2">
        <span>Phase: {s.phase ?? 'idle'}</span>
        {source && <span>Source: {source}{live.sourceStatus ? ` · ${live.sourceStatus}` : ''}</span>}
        {s.run_started_at && now > 0 && <span>Batch {Math.max(0, Math.floor((now - Date.parse(s.run_started_at)) / 1000))} s elapsed</span>}
        {s.batch_seconds && <span>Batch limit {Math.round(s.batch_seconds / 60)} min</span>}
        {s.next_cycle_at && live.liveEnabled && <span>Next batch {new Date(s.next_cycle_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {STEPS.map((step, i) => {
          const status = live.liveEnabled || i === 0 ? stepStatus(s, i, hasData) : hasData ? 'done' : 'idle'
          return (
            <li key={step.phase}>
              <CallChip
                icon={step.icon}
                name={step.name}
                argument={status === 'running' ? source : undefined}
                status={status}
                expectedMs={step.expectedMs}
                showTimer={status === 'running'}
                onRetry={status === 'error' ? onRetry : undefined}
              />
            </li>
          )
        })}
      </ul>
      {footer && <div className="mt-3 border-t border-line pt-3">{footer}</div>}
      {s.phase === 'error' && s.detail && (
        <p className="mt-3 rounded-control bg-sunken p-2 font-mono text-micro break-words text-ink-2">{s.detail}</p>
      )}
    </section>
  )
}
