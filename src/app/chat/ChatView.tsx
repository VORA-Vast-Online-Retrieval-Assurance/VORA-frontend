import { useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { ChatMessage } from '../../api/types.ts'
import type { LiveState } from '../../api/useLiveStream.ts'
import { profileTable } from '../../analytics/profile.ts'
import { parseRunReport } from '../../analytics/runReport.ts'
import type { DashboardView } from '../dashboard/Dashboard.tsx'
import { buildSources } from '../sources/buildSources.ts'
import type { Visit } from '../sources/buildSources.ts'
import { SourcesPanel } from '../sources/SourcesPanel.tsx'
import { SourcesStrip } from '../sources/SourcesStrip.tsx'
import { ChatData } from './ChatData.tsx'
import { LiveRun } from './LiveRun.tsx'
import { WORKING } from './phases.ts'
import { Thread } from './Thread.tsx'
import { useStickToBottom } from '../../ui/useStickToBottom.ts'
import { JumpToLatest } from '../../ui/JumpToLatest.tsx'

type Props = {
  /** Where this chat's dashboard layout and answers are kept. */
  instanceKey: string
  title: string
  meta: ReactNode
  messages: ChatMessage[]
  live: LiveState
  visits: Visit[]
  actions?: ReactNode
  onRetry: () => void
  /** Shown above the title, e.g. "Sample run · fictional data". */
  badge?: ReactNode
  /** Tabs under the title (the real chat page adds Review, Sources, Graphs, Activity and Settings). */
  subnav?: ReactNode
  /** When set, shown in place of the chat body: another tab is open. */
  tabPanel?: ReactNode
}

/**
 * One chat, drawn from plain data (the real page feeds it the backend; the sample run feeds it a script):
 * the request and replies, the live run with the websites being read, then the one-screen dashboard with its
 * Sources tab, and questions about the rows.
 */
export function ChatView({ instanceKey, title, meta, messages, live, visits, actions, onRetry, badge, subnav, tabPanel }: Props) {
  const [view, setView] = useState<DashboardView>('report')
  const dashRef = useRef<HTMLDivElement>(null)
  const working = live.liveEnabled && WORKING.includes(live.status.phase ?? 'idle')
  const table = live.dataset && live.dataset.rows.length > 0 ? live.dataset : null
  const report = useMemo(() => {
    for (const m of messages) if (m.role === 'bot') { const r = parseRunReport(m.text); if (r) return r }
    return null
  }, [messages])
  const profile = useMemo(() => (table ? profileTable(table) : undefined), [table])
  const sources = useMemo(
    () => buildSources({ report, profile, visits, current: live.status.current_source, working }),
    [report, profile, visits, live.status.current_source, working],
  )
  const { ref: threadRef, hasNew: newReply, jump: toLatestReply } = useStickToBottom<HTMLDivElement>(`${messages.length}:${messages[messages.length - 1]?.text.length ?? 0}`)
  const panel = <SourcesPanel sources={sources} report={report} visits={visits} />
  const openSources = () => {
    setView('sources')
    dashRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-7 px-5 py-8 sm:px-8">
      <header className="neo-panel neo-enter grid gap-5 bg-wisteria p-5 sm:p-7 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0 flex-1">
          {badge}
          <p className="mb-3 font-mono text-micro font-bold uppercase tracking-widest">Research / {instanceKey.slice(0, 8)}</p>
          <h1 className="max-w-[30ch] font-display font-wide text-h1 font-extrabold break-words">{title}</h1>
          <p className="mt-3 font-mono text-micro text-ink-2">{meta}</p>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3 xl:justify-end">{actions}</div>}
      </header>

      {subnav && <div className="pt-2">{subnav}</div>}
      {tabPanel ?? (
        <>
          <div className="grid items-start gap-6 xl:grid-cols-12">
            <section aria-labelledby="conversation-heading" className="neo-panel flex h-[min(38rem,70dvh)] min-h-72 min-w-0 flex-col p-5 xl:col-span-5">
              <h2 id="conversation-heading" className="mb-5 shrink-0 border-b border-edge pb-3 font-mono text-micro font-bold uppercase tracking-wider">01 / Conversation</h2>
              <div className="relative min-h-0 flex-1">
                <div ref={threadRef} role="region" aria-label="Conversation messages" tabIndex={0} data-lenis-prevent className="h-full overflow-x-hidden overflow-y-auto overscroll-contain pr-2 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink">
                  <Thread messages={messages} working={working} />
                </div>
                <JumpToLatest show={newReply} onClick={toLatestReply} label="New reply" />
              </div>
            </section>
            <div className="min-w-0 xl:col-span-7">
              <LiveRun live={live} onRetry={onRetry} footer={sources.length > 0 ? <SourcesStrip sources={sources} onOpen={table ? openSources : undefined} /> : undefined} />
            </div>
          </div>

          {table ? (
            <div ref={dashRef} className="scroll-mt-4 border-t border-edge pt-6">
              <p className="mb-5 font-mono text-micro font-bold uppercase tracking-wider">03 / Dataset</p>
              <ChatData instanceId={instanceKey} table={table} title={title} sources={{ count: sources.filter((s) => s.state !== 'rejected').length, panel }} view={view} onViewChange={setView} />
            </div>
          ) : (
            <>
              {sources.length > 0 && panel}
              <div className="neo-panel grid min-h-40 place-items-center border-dashed bg-lavender-soft p-8 text-center text-ink-2">
                <p className="max-w-[46ch]">Your dashboard appears here after the first pass. Charts, filters and questions all work from the rows VORA finds.</p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
