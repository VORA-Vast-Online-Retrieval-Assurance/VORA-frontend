import { CHAT_TABS } from './chatTab.ts'
import type { ChatTab } from './chatTab.ts'

export function ChatTabs({ value, onChange }: { value: ChatTab; onChange: (t: ChatTab) => void }) {
  return (
    <nav aria-label="Chat sections" className="flex flex-wrap gap-1">
      {CHAT_TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-current={value === t.id ? 'page' : undefined}
          onClick={() => onChange(t.id)}
          className={`h-10 border px-4 text-small font-bold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${value === t.id ? 'border-edge bg-wisteria text-ink' : 'border-transparent bg-surface text-ink-2 hover:bg-lavender-soft hover:text-ink'}`}
        >
          {t.label}
        </button>
      ))}
    </nav>
  )
}
