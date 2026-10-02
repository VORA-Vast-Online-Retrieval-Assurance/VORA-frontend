import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { InstancesProvider } from '../../api/InstancesProvider.tsx'
import { MenuIcon, PlusIcon, SidebarIcon } from '../../ui/appIcons.tsx'
import { ToastProvider } from '../../ui/toast/ToastHost.tsx'
import { useMediaQuery } from '../../ui/useMediaQuery.ts'
import { Sidebar } from './Sidebar.tsx'
import { Logo } from '../../ui/Logo.tsx'

const COLLAPSED_KEY = 'vora.sidebar.collapsed'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * The signed-in workspace: a research canvas with its chat archive on the left. The app owns its own scroll areas,
 * so the root is a fixed full-height frame and Lenis leaves it alone (data-lenis-prevent).
 */
export default function Layout() {
  const wide = useMediaQuery('(min-width: 768px)')
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [drawer, setDrawer] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0')
    } catch {
      // storage blocked: the sidebar just forgets
    }
  }, [collapsed])

  // Escape closes the mobile drawer.
  useEffect(() => {
    if (!drawer) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawer])

  const showSidebar = wide && !collapsed

  return (
    <InstancesProvider>
      <ToastProvider>
      <div className="flex h-dvh flex-col overflow-hidden bg-canvas text-ink" data-lenis-prevent>
        <header className="z-20 flex h-16 shrink-0 items-center gap-4 border-b border-edge bg-surface px-4 sm:px-6">
          <button
            type="button"
            onClick={() => (wide ? setCollapsed((value) => !value) : setDrawer(true))}
            aria-label={showSidebar ? 'Close archive' : 'Open archive'}
            aria-expanded={showSidebar || drawer}
            className="neo-button grid size-9 shrink-0 place-items-center border border-edge bg-surface transition-[translate,box-shadow] duration-200 ease-soft"
          >
            {wide ? <SidebarIcon /> : <MenuIcon />}
          </button>
          <Link to="/" aria-label="VORA home" className="group rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"><Logo size={38} /></Link>
          <div className="ml-auto flex items-center gap-3">
            <Link to="/app" aria-label="New chat" className="neo-button flex h-9 items-center gap-2 border border-edge bg-cta text-on-ink px-3 text-small font-bold transition-[translate,box-shadow] duration-200 ease-soft">
              <PlusIcon /><span className="hidden sm:inline">New chat</span>
            </Link>
          </div>
        </header>
        {!wide && drawer && (
          <div className="fixed inset-0 z-40 flex" role="dialog" aria-modal="true" aria-label="Chats">
            <Sidebar onCollapse={() => setDrawer(false)} onNavigate={() => setDrawer(false)} />
            <button type="button" aria-label="Close menu" className="flex-1 bg-ink/40" onClick={() => setDrawer(false)} />
          </div>
        )}

        <div className="flex min-h-0 flex-1">
          {showSidebar && <Sidebar onCollapse={() => setCollapsed(true)} />}
          {/* Keyed by path so each chat and view starts at the top with fresh state. */}
          <main id="main" key={pathname} className="min-w-0 flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
      </ToastProvider>
    </InstancesProvider>
  )
}
