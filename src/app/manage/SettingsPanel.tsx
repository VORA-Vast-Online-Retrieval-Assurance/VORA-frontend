import { useState } from 'react'
import { useNavigate } from 'react-router'
import { backend } from '../../api/backend.ts'
import type { InstanceDetail } from '../../api/types.ts'
import { useInstances } from '../../api/instancesContext.ts'
import { vora } from '../../api/vora.ts'
import { Button } from '../../ui/Button.tsx'
import { FuseButton } from '../../ui/micro/FuseButton.tsx'
import { useToast } from '../../ui/toast/toastContext.ts'
import { message } from './format.ts'
import { Section } from './parts.tsx'

const field = 'h-10 min-w-0 flex-1 rounded-control border border-line px-3 text-small focus:border-edge focus:outline-none'

/** Rename, pause, copy, empty or delete one chat. */
export function SettingsPanel({ chat, liveEnabled, onChanged, onLive }: { chat: InstanceDetail; liveEnabled: boolean; onChanged: () => void; onLive: (on: boolean) => Promise<void> }) {
  const [title, setTitle] = useState(chat.title)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()
  const { refresh, upsert } = useInstances()
  const { toast } = useToast()
  const dirty = title.trim() !== '' && title.trim() !== chat.title

  const run = async (label: string, fn: () => Promise<void>) => {
    try {
      await fn()
    } catch (err) {
      toast({ title: `Couldn’t ${label}`, description: message(err), tone: 'error' })
    }
  }
  const rename = async () => {
    setSaving(true)
    await run('rename', async () => {
      await backend.updateInstance(chat.id, { title: title.trim() })
      await refresh()
      onChanged()
      toast({ title: 'Renamed', tone: 'success' })
    })
    setSaving(false)
  }
  const copy = () =>
    run('copy this chat', async () => {
      const raw = await backend.duplicate(chat.id)
      const detail = await vora.getInstance(raw.id)
      upsert(detail)
      navigate(`/app/c/${raw.id}`)
    })
  const archive = () =>
    run('archive', async () => {
      await backend.updateInstance(chat.id, { archived: true })
      await refresh()
      navigate('/app', { replace: true })
    })

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <Section title="Name">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (dirty) void rename()
          }}
        >
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} aria-label="Chat name" className={field} />
          <Button type="submit" variant="secondary" disabled={!dirty} loading={saving}>
            Save
          </Button>
        </form>
      </Section>

      <Section title="Live tracking" note="A tracked chat looks again every few minutes and adds what is new. Pausing keeps everything found so far.">
        <div>
          <Button variant={liveEnabled ? 'secondary' : 'primary'} onClick={() => void onLive(!liveEnabled)}>
            {liveEnabled ? 'Pause tracking' : 'Resume tracking'}
          </Button>
        </div>
      </Section>

      <Section title="This chat">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void copy()}>
            Make a copy
          </Button>
          <Button variant="secondary" onClick={() => void archive()}>
            Archive
          </Button>
        </div>
      </Section>

      <Section title="Danger zone" note="These cannot be undone.">
        <div className="flex flex-wrap gap-2">
          <FuseButton
            label="Empty the dataset"
            undoLabel="Undo"
            doneLabel="Emptied"
            tone="danger"
            size="sm"
            onCommit={() =>
              void run('empty the dataset', async () => {
                await backend.clearDataset(chat.id)
                onChanged()
              })
            }
          />
        </div>
      </Section>
    </div>
  )
}
