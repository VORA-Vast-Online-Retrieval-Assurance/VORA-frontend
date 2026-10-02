import { useMemo } from 'react'
import { NavLink, useMatch, useNavigate } from 'react-router'
import { apiTime } from '../../api/dates.ts'
import { useInstances } from '../../api/instancesContext.ts'
import { FileIcon } from '../../ui/appIcons.tsx'
import { FuseButton } from '../../ui/micro/FuseButton.tsx'
import { deleteLocal } from '../files/localProjects.ts'
import { useLocalProjects } from '../files/useLocalProjects.ts'
import { groupByDay, isUntitled } from './groupByDay.ts'

/** A chat in the history: a web request (backend instance) or an uploaded file (kept in this browser). */
type Entry = { id: string; title: string; updated_at: string; kind: 'web' | 'file' }

/** Every chat ever started, web and file, grouped by day and filtered by the sidebar search. */
export function HistoryList({ query, onNavigate }: { query: string; onNavigate?: () => void }) {
  const { list, loading, error } = useInstances()
  const local = useLocalProjects()
  const q = query.trim().toLowerCase()
  const groups = useMemo(() => {
    const all: Entry[] = [
      ...list.map((i) => ({ id: i.id, title: i.title, updated_at: i.updated_at, kind: 'web' as const })),
      ...local.map((p) => ({ id: p.id, title: p.title, updated_at: p.updated_at, kind: 'file' as const })),
    ].sort((a, b) => apiTime(b.updated_at) - apiTime(a.updated_at))
    return groupByDay(q ? all.filter((i) => i.title.toLowerCase().includes(q)) : all)
  }, [list, local, q])

  if (loading && local.length === 0) {
    return (
      <ul className="flex flex-col gap-2 px-3" aria-label="Loading chats">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="h-8 animate-pulse rounded-control bg-sunken" />
        ))}
      </ul>
    )
  }
  if (groups.length === 0) {
    return (
      <p className="px-4 text-small text-ink-3">
        {error && list.length === 0 ? error : q ? `No chats match “${query.trim()}”.` : 'No chats yet. Ask for some data to start one.'}
      </p>
    )
  }

  return (
    <nav aria-label="Chat history" className="flex flex-col gap-5">
      {error && <p className="px-4 text-micro text-blocked">{error}</p>}
      {groups.map((g) => (
        <section key={g.label}>
          <h2 className="px-4 pb-1.5 font-mono text-micro text-ink-3">{g.label}</h2>
          <ul className="flex flex-col px-2">
            {g.items.map((item) => (
              <HistoryItem key={`${item.kind}-${item.id}`} item={item} onNavigate={onNavigate} />
            ))}
          </ul>
        </section>
      ))}
    </nav>
  )
}

function HistoryItem({ item, onNavigate }: { item: Entry; onNavigate?: () => void }) {
  const { remove } = useInstances()
  const navigate = useNavigate()
  const path = `/app/${item.kind === 'file' ? 'f' : 'c'}/${item.id}`
  const active = useMatch(path) !== null
  const title = isUntitled(item.title) ? 'Untitled chat' : item.title

  const del = async () => {
    if (active) navigate('/app', { replace: true })
    try {
      await (item.kind === 'file' ? deleteLocal(item.id) : remove(item.id))
    } catch {
      // remove() puts a web chat back in the list if the backend refused
    }
  }

  return (
    <li className="group relative">
      <NavLink
        to={path}
        onClick={onNavigate}
        title={title}
        className={({ isActive }) =>
          `flex items-center gap-1.5 rounded-control py-1.5 pr-9 pl-2 text-small transition-colors duration-300 ease-soft focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink ${
            isActive ? 'bg-signal-soft font-medium text-ink' : 'text-ink-2 hover:bg-sunken hover:text-ink'
          }`
        }
      >
        {item.kind === 'file' && <FileIcon aria-label="Uploaded file" className="shrink-0 text-ink-3" />}
        <span className="truncate">{title}</span>
      </NavLink>
      <span className="absolute top-1/2 right-1 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <FuseButton label={`Delete ${title}`} iconOnly tone="danger" size="sm" undoWindow={4000} onCommit={() => void del()} />
      </span>
    </li>
  )
}
