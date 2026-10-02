import { useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import type { DatasetTable } from '../../api/types.ts'
import { profileTable } from '../../analytics/profile.ts'
import { suggestFollowUps } from '../../analytics/suggest.ts'
import { AnswerCard } from '../ask/AnswerCard.tsx'
import { AskBox } from '../ask/AskBox.tsx'
import { Dashboard } from '../dashboard/Dashboard.tsx'
import type { DashboardView } from '../dashboard/Dashboard.tsx'
import { useDashboard } from '../dashboard/useDashboard.ts'
import { FollowUps } from './FollowUps.tsx'
import { useAnswers } from './useAnswers.ts'

type Props = {
  instanceId: string
  table: DatasetTable
  title: string
  sources?: { count: number; panel: ReactNode }
  view?: DashboardView
  onViewChange?: (v: DashboardView) => void
}

/**
 * Everything built from a chat's scraped table: the dashboard, then questions about it (follow-up chips, the
 * Ask box, and the answers so far). Mounted only once the table exists, so the hooks always have data.
 */
export function ChatData({ instanceId, table, title, sources, view, onViewChange }: Props) {
  const profile = useMemo(() => profileTable(table), [table])
  const dash = useDashboard(instanceId, profile)
  const answers = useAnswers(instanceId)
  const followUps = useMemo(() => suggestFollowUps(profile), [profile])
  const asked = new Set(answers.items.map((a) => a.question))
  const fresh = followUps.filter((f) => !asked.has(f.text))
  const last = useRef<HTMLLIElement>(null)
  const count = answers.items.length
  const firstRender = useRef(true)

  // A new answer scrolls into view; answers restored on load don't.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    last.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [count])

  return (
    <>
      <Dashboard profile={profile} dash={dash} title={title} sources={sources} view={view} onViewChange={onViewChange} />
      <section aria-labelledby="ask-heading" className="flex max-w-3xl flex-col gap-5 border-t border-edge pt-6">
        <div>
          <h2 id="ask-heading" className="font-display font-wide text-h3 font-extrabold">
            Ask about this data
          </h2>
          <p className="mt-1 text-small text-ink-2">
            Answered from the {profile.rowCount.toLocaleString('en-IN')} rows above, exactly. Asking never re-scrapes; for new data, start a new chat.
          </p>
        </div>
        {answers.items.length > 0 && (
          <ol className="flex flex-col gap-6">
            {answers.items.map((a, i) => (
              <li key={a.id} ref={i === answers.items.length - 1 ? last : undefined}>
                <AnswerCard profile={profile} saved={a} title={title} onAddToDashboard={dash.add} onRemove={() => answers.remove(a.id)} />
              </li>
            ))}
          </ol>
        )}
        <FollowUps items={fresh} onPick={(f) => answers.add({ question: f.text, intent: f.intent, chart: f.chart, query: f.query })} />
        <AskBox profile={profile} onAnswer={answers.add} suggestions={followUps} />
      </section>
    </>
  )
}
