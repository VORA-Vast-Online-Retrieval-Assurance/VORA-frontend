import { useCallback, useEffect, useRef, useState } from 'react'

export interface Async<T> {
  data: T | null
  error: string | null
  loading: boolean
  /** Load again (after a change); the current data stays visible meanwhile. */
  reload: () => void
}

/**
 * Loads something once when the component appears, and again when `reload()` is called or `key` changes.
 * The loader is read through a ref, so callers can pass an inline function without re-triggering the load.
 */
export function useAsync<T>(load: () => Promise<T>, key: string | number = ''): Async<T> {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true })
  const [tick, setTick] = useState(0)
  const loader = useRef(load)
  useEffect(() => {
    loader.current = load
  })

  useEffect(() => {
    let live = true
    loader
      .current()
      .then((data) => live && setState({ data, error: null, loading: false }))
      .catch((err: unknown) => live && setState((s) => ({ data: s.data, error: err instanceof Error ? err.message : String(err), loading: false })))
    return () => {
      live = false
    }
  }, [key, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { ...state, reload }
}
