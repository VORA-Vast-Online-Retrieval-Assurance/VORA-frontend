import { createContext, useContext } from 'react'
import type { InstanceSummary } from './types.ts'

export type Instances = {
  /** Every chat, most recently updated first (the backend's order). */
  list: InstanceSummary[]
  /** True until the first list arrives. */
  loading: boolean
  /** The last load error, e.g. the backend is down. Cleared by the next good load. */
  error: string | null
  refresh: () => Promise<void>
  /** Adds or updates one chat in the list without waiting for a refresh. */
  upsert: (item: InstanceSummary) => void
  /** Deletes on the backend; removes the chat from the list only after success. */
  remove: (id: string) => Promise<void>
}

export const InstancesContext = createContext<Instances | null>(null)

export function useInstances(): Instances {
  const value = useContext(InstancesContext)
  if (!value) throw new Error('useInstances must be used inside <InstancesProvider>')
  return value
}
