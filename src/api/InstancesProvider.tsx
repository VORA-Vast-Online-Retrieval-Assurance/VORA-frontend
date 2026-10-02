import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { vora } from './vora.ts'
import { apiTime } from './dates.ts'
import { InstancesContext } from './instancesContext.ts'
import type { Instances } from './instancesContext.ts'
import type { InstanceSummary } from './types.ts'

const REFRESH_MS = 20_000

const byUpdated = (a: InstanceSummary, b: InstanceSummary) => apiTime(b.updated_at) - apiTime(a.updated_at)

/**
 * The chat list for the sidebar, history and projects report. It loads once, then refreshes every 20 s
 * and whenever the tab regains focus, because other tabs and the backend's live cycles change it.
 */
export function InstancesProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<InstanceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const deleted = useRef(new Set<string>())

  const refresh = useCallback(async () => {
    try {
      const next = await vora.listInstances()
      setList(next.filter((item) => !deleted.current.has(item.id)))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load chats')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // The first load happens in the timer's first tick, so no state is set synchronously in the effect.
    const first = window.setTimeout(refresh, 0)
    const timer = window.setInterval(refresh, REFRESH_MS)
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh])

  const upsert = useCallback((item: InstanceSummary) => {
    const summary: InstanceSummary = {
      id: item.id,
      title: item.title,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }
    setList((prev) => [summary, ...prev.filter((i) => i.id !== item.id)].sort(byUpdated))
  }, [])

  const remove = useCallback(
    async (id: string) => {
      await vora.deleteInstance(id)
      deleted.current.add(id)
      setList((prev) => prev.filter((i) => i.id !== id))
    },
    [],
  )

  const value = useMemo<Instances>(
    () => ({ list, loading, error, refresh, upsert, remove }),
    [list, loading, error, refresh, upsert, remove],
  )

  return <InstancesContext.Provider value={value}>{children}</InstancesContext.Provider>
}
