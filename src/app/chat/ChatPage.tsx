import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { vora } from '../../api/vora.ts'
import { ApiError } from '../../api/client.ts'
import { timeAgo } from '../../api/dates.ts'
import { useInstances } from '../../api/instancesContext.ts'
import type { InstanceDetail } from '../../api/types.ts'
import { useLiveStream } from '../../api/useLiveStream.ts'
import { PauseIcon, PlayIcon } from '../../ui/icons.tsx'
import { TrashIcon } from '../../ui/appIcons.tsx'
import { Button } from '../../ui/Button.tsx'
import { BellToggle } from '../../ui/micro/BellToggle.tsx'
import { FuseButton } from '../../ui/micro/FuseButton.tsx'
import { useToast } from '../../ui/toast/toastContext.ts'
import { useVisits } from '../sources/useVisits.ts'
import { isUntitled } from '../workspace/groupByDay.ts'
import { ActivityPanel } from '../manage/ActivityPanel.tsx'
import { useChatTab } from '../manage/chatTab.ts'
import { ChatTabs } from '../manage/ChatTabs.tsx'
import { GraphsTab } from '../manage/GraphsTab.tsx'
import { ReviewPanel } from '../manage/ReviewPanel.tsx'
import { SettingsPanel } from '../manage/SettingsPanel.tsx'
import { SourcesTab } from '../manage/SourcesTab.tsx'
import { markSeen, notify, setWatched, useAlerts } from './alerts.ts'
import { ChatView } from './ChatView.tsx'
import { changeTracking, deleteChat } from './chatActions.ts'

/**
 * One web request, wired to the backend: the instance and its messages, the live stream, the pages read,
 * pause/resume, delete and row alerts. What it draws is ChatView (shared with the sample run).
 */
export default function ChatPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { remove, upsert } = useInstances()
  const { toast } = useToast()
  const [chat, setChat] = useState<InstanceDetail | null>(null)
  const [missing, setMissing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [override, setOverride] = useState<boolean | null>(null)
  const [actionPending, setActionPending] = useState(false)
  const alerts = useAlerts()
  const watched = alerts[id]?.watched ?? false
  const lastRows = useRef<number | null>(null)
  const { visits, record } = useVisits(id)
  const [tab, setTab] = useChatTab()

  const refetch = useCallback(async () => {
    try {
      const detail = await vora.getInstance(id)
      setChat(detail)
      setLoadError(null)
      upsert(detail)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setMissing(true)
      else setLoadError(err instanceof Error ? err.message : String(err))
    }
  }, [id, upsert])

  useEffect(() => {
    const t = window.setTimeout(refetch, 0)
    return () => window.clearTimeout(t)
  }, [refetch])

  const live = useLiveStream(id, {
    onChatUpdated: refetch,
    onPayload: (p) => {
      setOverride((current) => current === p.live_enabled ? null : current)
      record(p.status?.current_source, p.status?.phase)
      const before = lastRows.current
      lastRows.current = p.rows_total
      if (before !== null && p.rows_total > before && watched) {
        const n = p.rows_total - before
        const title = `${n.toLocaleString('en-IN')} new ${n === 1 ? 'row' : 'rows'}`
        toast({ title, description: chat?.title, tone: 'success' })
        notify(`VORA: ${title}`, chat?.title ?? '')
      }
    },
  })
  const liveEnabled = override ?? live.liveEnabled
  const view = { ...live, liveEnabled, status: override === false ? { ...live.status, phase: 'stopped' as const } : live.status }

  useEffect(() => {
    if (live.rowsTotal > 0) markSeen(id, live.rowsTotal)
  }, [id, live.rowsTotal])

  const setLive = async (enabled: boolean) => {
    if (actionPending) return
    setActionPending(true)
    try {
      await changeTracking(id, enabled, vora.setLive, setOverride)
    } catch (err) {
      toast({ title: enabled ? 'Couldn’t resume' : 'Couldn’t pause', description: err instanceof Error ? err.message : String(err), tone: 'error' })
    } finally {
      setActionPending(false)
    }
  }

  if (missing || live.missing) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="font-display font-wide text-h2 font-extrabold">This chat no longer exists.</h1>
        <p className="mt-3 text-ink-2">It may have been deleted in another tab.</p>
        <Link to="/app" className="mt-6 inline-block underline underline-offset-2">
          Start a new chat
        </Link>
      </div>
    )
  }

  // The chat never loaded (server down or not connected): say why instead of waiting on "Loading…" forever.
  if (!chat && loadError) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="font-display font-wide text-h2 font-extrabold">This chat can’t load right now.</h1>
        <p className="mt-3 max-w-[60ch] text-ink-2">{loadError}</p>
        <div className="mt-6 flex gap-2">
          <Button onClick={() => void refetch()}>Try again</Button>
          <Link to="/app" className="inline-flex h-10 items-center px-3 text-small underline underline-offset-2">
            Back to New chat
          </Link>
        </div>
      </div>
    )
  }

  const title = chat && !isUntitled(chat.title) ? chat.title : 'Untitled chat'
  const actions = (
    <>
      <BellToggle pressed={watched} onChange={(on) => setWatched(id, on, live.rowsTotal)} offLabel="Alert me on new rows" onLabel="Alerts on" size="sm" />
      {liveEnabled ? (
        <Button variant="secondary" disabled={actionPending} onClick={() => void setLive(false)}><PauseIcon /> Pause tracking</Button>
      ) : (
        <Button variant="secondary" disabled={actionPending} onClick={() => void setLive(true)}>
          <PlayIcon /> Resume tracking
        </Button>
      )}
      <FuseButton
        label="Delete chat"
        undoLabel="Undo"
        doneLabel="Deleting"
        tone="danger"
        size="sm"
        icon={<TrashIcon />}
        disabled={actionPending}
        onCommit={async () => {
          if (actionPending) return
          setActionPending(true)
          try {
            await deleteChat(id, remove, () => navigate('/app', { replace: true }))
          } catch (err) {
            toast({ title: 'Could not delete that chat', description: err instanceof Error ? err.message : String(err), tone: 'error' })
          } finally {
            setActionPending(false)
          }
        }}
      />
    </>
  )

  // The tabs beside Results reload when a run moves on, so what they show keeps up with the run.
  const refreshKey = `${live.rowsTotal}:${live.status.phase ?? ''}`
  const tabPanel =
    tab === 'review' ? <ReviewPanel id={id} refreshKey={refreshKey} />
    : tab === 'sources' ? <SourcesTab id={id} refreshKey={refreshKey} />
    : tab === 'graphs' ? <GraphsTab id={id} refreshKey={`${live.rowsTotal}:${live.status.phase ?? ''}`} />
    : tab === 'activity' ? <ActivityPanel id={id} refreshKey={refreshKey} />
    : tab === 'settings' && chat ? <SettingsPanel chat={chat} liveEnabled={liveEnabled} onChanged={() => void refetch()} onLive={setLive} />
    : undefined

  return (
    <ChatView
      instanceKey={id}
      subnav={<ChatTabs value={tab} onChange={setTab} />}
      tabPanel={tabPanel}
      title={title}
      meta={`${chat ? `Started ${timeAgo(chat.created_at)} · updated ${timeAgo(chat.updated_at)}` : 'Loading…'} · ${liveEnabled ? 'live' : 'paused'}`}
      messages={chat?.messages ?? []}
      live={view}
      visits={visits}
      actions={actions}
      onRetry={async () => {
        await setLive(false)
        await setLive(true)
      }}
    />
  )
}

