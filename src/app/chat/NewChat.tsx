import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { vora } from '../../api/vora.ts'
import { useInstances } from '../../api/instancesContext.ts'
import { ChartIcon, DatabaseIcon, FileIcon, ReportIcon, SearchIcon, SparkleIcon } from '../../ui/appIcons.tsx'
import { PlayIcon } from '../../ui/icons.tsx'
import { useToast } from '../../ui/toast/toastContext.ts'
import { PlanPreview } from './PlanPreview.tsx'
import { PromptBox } from '../prompt/PromptBox.tsx'
import { startFromFile } from './startFromFile.ts'

const FILE_INPUT = 'new-chat-files'

const CARDS: { icon: ReactNode; title: string; body: string; prompt?: string }[] = [
  {
    icon: <ChartIcon />,
    title: 'Track a number over time',
    body: 'Indian EV sales every month from 2024 to 2026, kept up to date in the background.',
    prompt: 'Track Indian EV sales every month from 2024 to 2026',
  },
  {
    icon: <SearchIcon />,
    title: 'Compare products across sites',
    body: 'Electric cars under ₹20 lakh with price and range, from several Indian sites.',
    prompt: 'Electric cars under ₹20 lakh in India with price and range',
  },
  {
    icon: <FileIcon />,
    title: 'Dashboard from your own file',
    body: 'Drop in a CSV or Excel file and ask about it. It stays on this device.',
  },
]

/**
 * A new chat, laid out like ChatGPT's start screen: one big prompt box (text, voice, or a data file), a strip
 * of shortcuts under it, and cards to try. A sentence starts a web scrape on the backend; a file becomes a
 * dashboard straight away, in the browser.
 */
export default function NewChat() {
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const { upsert } = useInstances()
  const { toast } = useToast()

  const submit = async (goal: string, attached: File[]) => {
    setBusy(true)
    try {
      if (attached.length > 0) {
        const res = await startFromFile(attached[0], goal)
        if ('error' in res) {
          toast({ title: 'Couldn’t read that file', description: res.error, tone: 'error' })
          setBusy(false)
          return
        }
        navigate(`/app/f/${res.id}`)
        return
      }
      const created = await vora.createInstance()
      const started = await vora.startTracking(created.id, goal)
      upsert(started)
      navigate(`/app/c/${started.id}`)
    } catch (err) {
      setBusy(false)
      toast({ title: 'Couldn’t start that request', description: err instanceof Error ? err.message : String(err), tone: 'error' })
    }
  }

  // Real buttons (keyboard-reachable) that open the prompt box's file picker.
  const pickFile = () => (document.getElementById(FILE_INPUT) as HTMLInputElement | null)?.click()

  const strip = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-ink-2">
      <button type="button" onClick={pickFile} className="flex items-center gap-1.5 hover:text-ink">
        <FileIcon /> Upload a file
      </button>
      <Link to="/app/projects" className="flex items-center gap-1.5 hover:text-ink">
        <ReportIcon /> Projects report
      </Link>
      <Link to="/app/ask" className="flex items-center gap-1.5 hover:text-ink">
        <DatabaseIcon /> Ask database
      </Link>
      <Link to="/app/sample" className="flex items-center gap-1.5 hover:text-ink">
        <PlayIcon /> Watch a sample run
      </Link>
      <span className="ml-auto hidden font-mono text-micro text-ink-3 sm:inline">Web requests refresh every 5 min</span>
    </div>
  )

  return (
    <div className="mx-auto min-h-full max-w-7xl px-5 py-10 sm:px-8 lg:py-16">
      <div className="grid gap-10 xl:grid-cols-12 xl:gap-14">
        <div className="neo-enter flex flex-col items-start xl:col-span-5">
          <span className="mb-5 font-mono text-micro font-bold uppercase tracking-widest text-ink-3">01 / New research</span>
          <h1 className="max-w-[15ch] font-display font-wide text-h1 font-extrabold">What data do you need?</h1>
          <p className="mt-6 max-w-[44ch] text-lead text-ink-2">
            Describe it and VORA finds it on the web, or drop in a file you already have. Either way you get a dashboard you can shape and question.
          </p>
          <div className="mt-10 w-full">
            <p className="mb-4 font-mono text-micro uppercase tracking-wider text-ink-3">Other ways in</p>
            {strip}
          </div>
        </div>

        <div className="neo-enter xl:col-span-7 xl:pt-12">
          <div className="neo-panel p-5 sm:p-7">
            <p className="mb-4 flex items-center justify-between gap-3 font-mono text-micro uppercase tracking-wider">
              <span>Your brief</span><span>Web / File / Voice</span>
            </p>
            <PromptBox
              label="Your data request"
              value={text}
              onChange={setText}
              onSubmit={(t, f) => void submit(t, f)}
              busy={busy}
              size="lg"
              autoFocus
              embedded
              allowFiles
              files={files}
              onFilesChange={(f) => setFiles(f.slice(-1))}
              fileInputId={FILE_INPUT}
              placeholder={files.length ? 'Ask something about this file (optional), then send' : 'e.g. Track Indian EV sales every month from 2024 to 2026'}
            />
          </div>
          {files.length === 0 && <PlanPreview goal={text} />}
        </div>
      </div>

      <section className="mt-16 border-t border-edge pt-5" aria-labelledby="try-heading">
        <h2 id="try-heading" className="flex items-center gap-2 font-display text-h3 font-extrabold">
          <SparkleIcon /> See what VORA can do
        </h2>
        <ul className="mt-6 grid gap-5 xl:grid-cols-12">
          {CARDS.map((c) => (
            <li key={c.title} className="neo-panel neo-lift flex flex-col p-5 xl:col-span-4">
              <div className="flex items-start justify-between">
                <span className="grid size-10 place-items-center border border-edge bg-wisteria">{c.icon}</span>
                {c.prompt ? (
                  <button type="button" onClick={() => setText(c.prompt!)} aria-label={`Try: ${c.title}`} className="neo-button border border-edge bg-cta text-on-ink px-3 py-1 text-small font-bold">
                    Try
                  </button>
                ) : (
                  <button type="button" onClick={pickFile} aria-label={`Try: ${c.title}`} className="neo-button border border-edge bg-cta text-on-ink px-3 py-1 text-small font-bold">
                    Try
                  </button>
                )}
              </div>
              <p className="mt-3 font-semibold">{c.title}</p>
              <p className="mt-1 text-small text-ink-2">{c.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
