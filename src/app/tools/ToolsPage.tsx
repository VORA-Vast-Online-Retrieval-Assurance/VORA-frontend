import { useState } from 'react'
import { Link } from 'react-router'
import { backend } from '../../api/backend.ts'
import { timeAgo } from '../../api/dates.ts'
import { Button } from '../../ui/Button.tsx'
import { useToast } from '../../ui/toast/toastContext.ts'
import { message } from '../manage/format.ts'
import { Chip, Note, Section, Stat, State } from '../manage/parts.tsx'
import { DomainEditor } from '../manage/SourcesTab.tsx'
import { useAsync } from '../manage/useAsync.ts'

/** The service behind the chats: whether it can run, how searching is going, and your account-wide settings. */
export default function ToolsPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-5 py-8">
      <header className="neo-panel bg-wisteria p-6">
        <p className="font-mono text-micro font-bold uppercase tracking-widest">Workspace / System</p>
        <h1 className="mt-3 font-display font-wide text-h1 font-extrabold">Tools</h1>
        <p className="mt-1 text-small text-ink-2">Service status, searching, and settings that apply to every chat you make.</p>
      </header>
      <Status />
      <Searching />
      <FavouredSites />
      <Reputation />
      <SavedResults />
      <Webhooks />
      <Engines />
    </div>
  )
}

function Status() {
  const ready = useAsync(() => backend.ready(), 'ready')
  const r = ready.data
  const pool = r?.browsers
  return (
    <Section title="Service status" actions={<Button variant="secondary" onClick={ready.reload}>Refresh</Button>}>
      <State loading={ready.loading && !r} error={ready.error} onRetry={ready.reload}>
        {r && (
          <>
            {!r.ready && <Note tone="error">Research can’t start: {r.reason ?? 'the service is not ready'}.</Note>}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Research" value={r.ready ? 'Ready' : 'Not ready'} />
              <Stat label="Search" value={r.search ?? '—'} hint={r.search === 'browser' ? 'a search API key is more dependable' : undefined} />
              <Stat label="Free memory" value={r.free_memory_mb ? `${Math.round(r.free_memory_mb / 102.4) / 10} GB` : '—'} hint={r.interactive_pass === false ? 'interactive pass skipped' : undefined} />
              <Stat label="Language models" value={(r.llm_available ?? r.llm_models ?? []).length} hint={(r.llm_available ?? r.llm_models ?? []).join(', ')} />
            </div>
            {pool && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Chats working" value={`${pool.active_batches} / ${pool.max_concurrent_batches}`} />
                <Stat label="Browsers busy" value={`${pool.busy} / ${pool.size}`} hint={`${pool.started} started`} />
                <Stat label="Pages waiting" value={pool.queued} />
                <Stat label="Pages read" value={pool.tasks_done} hint={`${pool.recycled} restarts for memory · ${pool.restarts} after crashes`} />
              </div>
            )}
          </>
        )}
      </State>
    </Section>
  )
}

function Searching() {
  const search = useAsync(() => backend.searchStatus(), 'search')
  const s = search.data
  return (
    <Section title="Searching" note="Search engines slow down or block automated searches, so VORA rations them. This is shared by every chat.">
      <State loading={search.loading && !s} error={search.error} onRetry={search.reload}>
        {s && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Search API" value={s.api ?? 'none'} />
              <Stat label="Searches this hour" value={`${s.searches_last_hour} / ${s.max_searches_per_hour}`} />
              <Stat label="Gap between searches" value={`${s.interval_seconds} s`} />
              <Stat label="Rest after a block" value={`${s.cooldown_minutes} min`} />
            </div>
            <ul className="flex flex-wrap gap-2">
              {s.engines.length === 0 && <li className="text-small text-ink-3">No engine is resting.</li>}
              {s.engines.map((e) => (
                <li key={e.name}>
                  <Chip tone={e.resting_seconds > 0 ? 'bad' : 'good'}>
                    {e.name}: {e.resting_seconds > 0 ? `resting ${Math.ceil(e.resting_seconds / 60)} min (${e.blocks_in_a_row} blocks in a row)` : 'available'}
                  </Chip>
                </li>
              ))}
            </ul>
          </>
        )}
      </State>
    </Section>
  )
}

function FavouredSites() {
  const global = useAsync(() => backend.globalPreferred(), 'global-preferred')
  const { toast } = useToast()
  const save = async (domains: string[]) => {
    try {
      await backend.setGlobalPreferred(domains)
      global.reload()
    } catch (err) {
      toast({ title: 'Couldn’t save the site list', description: message(err), tone: 'error' })
    }
  }
  return (
    <Section title="Favoured sites" note="Read first in every chat you make, ahead of search results.">
      <State loading={global.loading && !global.data} error={global.error} onRetry={global.reload}>
        <DomainEditor domains={global.data?.domains ?? []} onSave={(d) => void save(d)} />
      </State>
    </Section>
  )
}

function Reputation() {
  const rep = useAsync(() => backend.reputation(100), 'reputation')
  const rows = rep.data ?? []
  return (
    <Section title="What past runs learned about sites" note="How often each site gave usable rows, and how often it blocked us. Ranking uses this.">
      <State loading={rep.loading && !rep.data} error={rep.error} onRetry={rep.reload} empty={rows.length === 0 ? 'Nothing recorded yet.' : undefined}>
        <div className="overflow-auto rounded-panel border border-edge" style={{ maxHeight: 420 }} data-lenis-prevent>
          <table className="w-full min-w-max text-small">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-edge text-left">
                <th className="px-3 py-2 font-medium">Site</th>
                <th className="px-3 py-2 text-right font-medium">Tries</th>
                <th className="px-3 py-2 text-right font-medium">Useful</th>
                <th className="px-3 py-2 text-right font-medium">Rows</th>
                <th className="px-3 py-2 text-right font-medium">Blocked</th>
                <th className="px-3 py-2 text-right font-medium">Failed</th>
                <th className="px-3 py-2 font-medium">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.domain} className="border-b border-line">
                  <td className="px-3 py-1.5 font-mono text-micro">{r.domain}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{r.attempts}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{r.productive}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{r.accepted_rows}</td>
                  <td className={`px-3 py-1.5 text-right tabular-nums ${r.blocked ? 'text-blocked' : ''}`}>{r.blocked}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{r.failed}</td>
                  <td className="px-3 py-1.5 text-ink-2">{timeAgo(r.last_seen_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </State>
    </Section>
  )
}

function SavedResults() {
  const cache = useAsync(() => backend.cache(), 'cache')
  const { toast } = useToast()
  const items = cache.data?.items ?? []
  const drop = async (signature: string) => {
    try {
      await backend.invalidateCache(signature)
      cache.reload()
    } catch (err) {
      toast({ title: 'Couldn’t clear that', description: message(err), tone: 'error' })
    }
  }
  return (
    <Section title="Saved results" note="What each of your chats has collected. Clearing one empties its dataset; the chat stays and fills again on the next run.">
      <State loading={cache.loading && !cache.data} error={cache.error} onRetry={cache.reload} empty={items.length === 0 ? 'Nothing saved yet.' : undefined}>
        <ul className="flex flex-col gap-2">
          {items.map((i) => (
            <li key={i.goal_signature} className="flex flex-wrap items-center gap-3 rounded-panel border border-line p-3">
              <Link to={`/app/c/${i.instance_id}`} className="min-w-0 flex-1 truncate font-semibold underline underline-offset-2" title={i.goal}>
                {i.goal}
              </Link>
              <span className="font-mono text-micro text-ink-3">
                {i.row_count} rows · {timeAgo(i.observed_at)}
              </span>
              <Button variant="secondary" onClick={() => void drop(i.goal_signature)}>
                Clear
              </Button>
            </li>
          ))}
        </ul>
      </State>
    </Section>
  )
}

function Webhooks() {
  const hooks = useAsync(() => backend.webhooks(), 'webhooks')
  const [url, setUrl] = useState('')
  const { toast } = useToast()
  const act = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn()
      hooks.reload()
    } catch (err) {
      toast({ title: `Couldn’t ${label}`, description: message(err), tone: 'error' })
    }
  }
  const list = hooks.data ?? []
  return (
    <Section title="Webhooks" note="A web address VORA will notify when a run finishes. Only public addresses are accepted. Deliveries are not sent yet, so treat this as a registry.">
      <form
        className="flex max-w-2xl gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!url.trim()) return
          void act('add that webhook', async () => {
            await backend.createWebhook(url.trim(), ['run.completed'])
            setUrl('')
          })
        }}
      >
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.org/hooks/vora" aria-label="Webhook address" className="h-10 min-w-0 flex-1 rounded-control border border-line px-3 text-small focus:border-edge focus:outline-none" />
        <Button type="submit" variant="secondary">
          Add
        </Button>
      </form>
      <State loading={hooks.loading && !hooks.data} error={hooks.error} onRetry={hooks.reload} empty={list.length === 0 ? 'No webhooks yet.' : undefined}>
        <ul className="flex flex-col gap-2">
          {list.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center gap-3 rounded-panel border border-line p-3">
              <span className="min-w-0 flex-1 truncate font-mono text-micro" title={h.url}>
                {h.url}
              </span>
              <Chip>{h.events.join(', ')}</Chip>
              <Button variant="secondary" onClick={() => void act('change that webhook', () => backend.updateWebhook(h.id, { enabled: !h.enabled }))}>
                {h.enabled ? 'Turn off' : 'Turn on'}
              </Button>
              <Button variant="ghost" onClick={() => void act('remove that webhook', () => backend.deleteWebhook(h.id))}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      </State>
    </Section>
  )
}

function Engines() {
  const list = useAsync(() => backend.extractors(), 'extractors')
  const caps = useAsync(() => backend.capabilities(), 'capabilities')
  return (
    <Section title="How rows are read" note="The extraction methods VORA tries on every page, and the settings this service runs with.">
      <State loading={list.loading && !list.data} error={list.error} onRetry={list.reload}>
        <ul className="flex flex-wrap gap-2">
          {(list.data ?? []).map((e) => (
            <li key={e.id}>
              <Chip>{e.id.replace(/_/g, ' ')}</Chip>
            </li>
          ))}
        </ul>
      </State>
      <details className="rounded-panel border border-line p-3">
        <summary className="cursor-pointer text-small font-semibold">Service settings</summary>
        <State loading={caps.loading && !caps.data} error={caps.error} onRetry={caps.reload}>
          <dl className="mt-3 grid gap-x-6 gap-y-1 text-small sm:grid-cols-2">
            {Object.entries(caps.data ?? {}).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-line py-1">
                <dt className="text-ink-2">{k.replace(/_/g, ' ')}</dt>
                <dd className="font-mono text-micro">{Array.isArray(v) ? v.join(', ') : String(v)}</dd>
              </div>
            ))}
          </dl>
        </State>
      </details>
    </Section>
  )
}
