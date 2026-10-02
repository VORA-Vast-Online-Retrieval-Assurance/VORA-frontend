import { useSearchParams } from 'react-router'

export const CHAT_TABS = [
  { id: 'results', label: 'Results' },
  { id: 'review', label: 'Review rows' },
  { id: 'sources', label: 'Sources' },
  { id: 'graphs', label: 'Graphs' },
  { id: 'activity', label: 'Activity' },
  { id: 'settings', label: 'Settings' },
] as const

export type ChatTab = (typeof CHAT_TABS)[number]['id']

/** The open tab, kept in the address (`?tab=review`) so a reload or a shared link lands in the same place. */
export function useChatTab(): [ChatTab, (t: ChatTab) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab = CHAT_TABS.some((t) => t.id === raw) ? (raw as ChatTab) : 'results'
  const set = (next: ChatTab) =>
    setParams(
      (prev) => {
        const q = new URLSearchParams(prev)
        if (next === 'results') q.delete('tab')
        else q.set('tab', next)
        return q
      },
      { replace: false },
    )
  return [tab, set]
}
