import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router'
import { useAuth } from '../auth/authContext.ts'
import { DatabaseIcon, LogoutIcon, PlusIcon, ReportIcon, SearchIcon, SidebarIcon, TerminalIcon } from '../../ui/appIcons.tsx'
import { buttonClass } from '../../ui/buttonClass.ts'
import { HistoryList } from './HistoryList.tsx'

type Props = {
  /** Hides the sidebar on desktop (the rail in Layout brings it back). */
  onCollapse: () => void
  /** Called after navigating, so the mobile drawer can close. */
  onNavigate?: () => void
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2.5 border-l px-3 py-2 text-small font-semibold transition-[background-color,translate] duration-200 ease-soft focus-visible:outline-2 focus-visible:outline-ink ${
    isActive ? 'border-edge bg-lavender-soft text-ink' : 'border-transparent text-ink-2 hover:translate-x-1 hover:border-edge-strong hover:bg-lavender-soft hover:text-ink'
  }`

/** The archive rail: workspace views, searchable history, and the account. */
export function Sidebar({ onCollapse, onNavigate }: Props) {
  const [query, setQuery] = useState('')

  return (
    <aside className="neo-enter flex h-full w-72 max-w-[88vw] shrink-0 flex-col border-r border-edge bg-surface">
      <div className="flex h-18 shrink-0 items-center justify-between gap-2 border-b border-edge px-4">
        <Link
          to="/"
          className="font-mono text-small font-bold uppercase tracking-[0.16em] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        >
          Research index
        </Link>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Close archive"
          className="grid size-8 place-items-center border border-edge bg-surface text-ink transition-[translate,box-shadow] duration-200 ease-soft hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline-2 focus-visible:outline-ink"
        >
          <SidebarIcon />
        </button>
      </div>

      <div className="flex flex-col gap-1 px-4 pt-5 pb-5">
        <span className="mb-2 font-mono text-micro uppercase tracking-wider text-ink-3">Start here</span>
        <Link to="/app" onClick={onNavigate} className={buttonClass('primary', 'md', 'w-full justify-start')}>
          <PlusIcon /> New chat
        </Link>
        <div className="mt-6 flex flex-col gap-1 border-t border-edge pt-3">
          <span className="mb-1 font-mono text-micro uppercase tracking-wider text-ink-3">Workspaces</span>
          <NavLink to="/app/projects" onClick={onNavigate} className={navClass}>
            <ReportIcon /> Projects report
          </NavLink>
          <NavLink to="/app/ask" onClick={onNavigate} className={navClass}>
            <DatabaseIcon /> Ask database
          </NavLink>
          <NavLink to="/app/tools" onClick={onNavigate} className={navClass}>
            <TerminalIcon /> Tools
          </NavLink>
        </div>
      </div>

      <label className="mx-4 mb-4 flex items-center gap-2 border border-edge bg-surface px-2.5 shadow-soft focus-within:bg-lavender-soft">
        <SearchIcon className="shrink-0 text-ink-3" />
        <span className="sr-only">Search chats</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chats"
          className="h-9 w-full min-w-0 bg-transparent text-small outline-none placeholder:text-ink-3"
        />
      </label>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-edge pt-4 pb-4" data-lenis-prevent>
        <HistoryList query={query} onNavigate={onNavigate} />
      </div>

      <Account />
    </aside>
  )
}

function Account() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const meta = user?.user_metadata ?? {}
  // No user only in the agent preview (npm run dev:agent), which skips sign-in.
  const name: string = meta.full_name ?? meta.name ?? user?.email ?? 'Preview, not signed in'
  const avatar: string | undefined = meta.avatar_url ?? meta.picture

  // Leave first: once the session is gone, RequireAuth would send this page to /login instead.
  const leave = async () => {
    navigate('/', { replace: true })
    await signOut()
  }

  return (
      <div className="flex items-center gap-2.5 border-t border-edge bg-lavender-soft px-4 py-4">
      {avatar ? (
        <img src={avatar} alt="" width={32} height={32} referrerPolicy="no-referrer" className="size-8 shrink-0 rounded-control border border-edge" />
      ) : (
        <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-control border border-edge bg-signal text-small font-bold">
          {name.slice(0, 1).toUpperCase() || '?'}
        </span>
      )}
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-small font-medium">{name}</p>
        {user?.email && name !== user.email && <p className="truncate text-micro text-ink-3">{user.email}</p>}
      </div>
      <button
        type="button"
        onClick={leave}
        aria-label="Sign out"
        title="Sign out"
        className="grid size-8 shrink-0 place-items-center rounded-control text-ink-2 hover:bg-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
      >
        <LogoutIcon />
      </button>
    </div>
  )
}
