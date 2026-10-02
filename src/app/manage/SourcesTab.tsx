import { useState } from 'react'
import { backend } from '../../api/backend.ts'
import type { FileRow, SourceRow } from '../../api/backend.ts'
import { Button } from '../../ui/Button.tsx'
import { useToast } from '../../ui/toast/toastContext.ts'
import { bytes, duration, hostOf, message } from './format.ts'
import { Chip, Section, Stat, State } from './parts.tsx'
import { useAsync } from './useAsync.ts'

const statusTone = (s: string) => (s === 'complete' ? 'good' : ['blocked', 'failed', 'error'].includes(s) ? 'bad' : 'default')

/** Where the rows came from: every page read, the files found beside them, and the sites to favour next time. */
export function SourcesTab({ id, refreshKey }: { id: string; refreshKey: string | number }) {
  const key = `${id}:${refreshKey}`
  const sources = useAsync(() => backend.sources(id), key)
  const files = useAsync(() => backend.files(id), key)
  const preferred = useAsync(() => backend.preferred(id), id)
  const { toast } = useToast()
  const [extracting, setExtracting] = useState<string | null>(null)

  const favourites = preferred.data?.domains ?? []
  const setFavourites = async (domains: string[]) => {
    try {
      await backend.setPreferred(id, domains)
      preferred.reload()
    } catch (err) {
      toast({ title: 'Couldn’t save the site list', description: message(err), tone: 'error' })
    }
  }
  const toggleFavourite = (domain: string) =>
    void setFavourites(favourites.includes(domain) ? favourites.filter((d) => d !== domain) : [...favourites, domain])

  const extract = async (f: FileRow) => {
    setExtracting(f.id)
    try {
      await backend.extractFile(id, f.id)
      toast({ title: `Read ${f.name}`, tone: 'success' })
      files.reload()
      sources.reload()
    } catch (err) {
      toast({ title: 'Couldn’t read that file', description: message(err), tone: 'error' })
    } finally {
      setExtracting(null)
    }
  }

  const s = sources.data
  return (
    <div className="flex flex-col gap-8">
      <Section title="Where the data came from" note="Every page this chat read, and what came of it.">
        <State loading={sources.loading && !s} error={sources.error} onRetry={sources.reload} empty={s && s.sources.length === 0 ? 'No pages read yet.' : undefined}>
          {s && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Pages considered" value={s.candidate_count} />
                <Stat label="Accepted rows" value={s.accepted_count} />
                <Stat label="Partial" value={s.partial_count} />
                <Stat label="Rejected" value={s.rejected_count} />
              </div>
              <div className="overflow-auto rounded-panel border border-edge" style={{ maxHeight: 520 }} data-lenis-prevent>
                <table className="w-full min-w-max text-small">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="border-b border-edge text-left">
                      <th className="px-3 py-2 font-medium">Site</th>
                      <th className="px-3 py-2 font-medium">Result</th>
                      <th className="px-3 py-2 text-right font-medium">Found</th>
                      <th className="px-3 py-2 text-right font-medium">Kept</th>
                      <th className="px-3 py-2 text-right font-medium">Time</th>
                      <th className="px-3 py-2 font-medium">Note</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {s.sources.map((r: SourceRow) => (
                      <tr key={r.id} className="border-b border-line align-top">
                        <td className="max-w-[40ch] px-3 py-2">
                          <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">
                            {r.domain || hostOf(r.url)}
                          </a>
                          <span className="block truncate text-micro text-ink-3" title={r.title}>
                            {r.title}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <Chip tone={statusTone(r.status)}>{r.status}</Chip>
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{r.extracted}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{r.accepted}</td>
                        <td className="px-3 py-2 text-right font-mono text-ink-2 tabular-nums">{duration(r.elapsed_seconds)}</td>
                        <td className="max-w-[36ch] px-3 py-2 text-ink-2">{r.reason}</td>
                        <td className="px-3 py-2 text-right">
                          <button type="button" onClick={() => toggleFavourite(r.domain)} className="text-small underline underline-offset-2" aria-pressed={favourites.includes(r.domain)}>
                            {favourites.includes(r.domain) ? 'Unfavour' : 'Favour site'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </State>
      </Section>

      <Section title="Favoured sites" note="Read first in every run of this chat, ahead of search results. Your account-wide list is under Tools.">
        <State loading={preferred.loading && !preferred.data} error={preferred.error} onRetry={preferred.reload}>
          <DomainEditor domains={favourites} onSave={(d) => void setFavourites(d)} inherited={preferred.data?.global ?? []} />
        </State>
      </Section>

      <Section title="Files found" note="Files linked from those pages are kept as references. Spreadsheets and PDFs can be read into rows on request.">
        <State loading={files.loading && !files.data} error={files.error} onRetry={files.reload} empty={files.data && files.data.files.length === 0 ? 'No files found.' : undefined}>
          <ul className="flex flex-col gap-2">
            {(files.data?.files ?? []).filter((f) => f.file_type !== 'media').slice(0, 60).map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-2 rounded-panel border border-line p-3">
                <div className="min-w-0 flex-1">
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="break-all font-semibold underline underline-offset-2">
                    {f.title || f.name}.{f.extension}
                  </a>
                  <p className="text-micro text-ink-3">
                    from {hostOf(f.linked_from)} · {f.file_type} · {bytes(f.size_bytes)} · {f.reason || f.status}
                  </p>
                </div>
                <Chip>{f.status}</Chip>
                {f.extractable && f.status !== 'extracted' && (
                  <Button variant="secondary" loading={extracting === f.id} onClick={() => void extract(f)}>
                    Read into rows
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {files.data && Object.entries(files.data.counts).length > 0 && (
            <p className="font-mono text-micro text-ink-3">{Object.entries(files.data.counts).map(([k, v]) => `${v} ${k}`).join(' · ')}</p>
          )}
        </State>
      </Section>
    </div>
  )
}

/** A list of site names with add/remove, saved as one list. */
export function DomainEditor({ domains, onSave, inherited = [] }: { domains: string[]; onSave: (d: string[]) => void; inherited?: string[] }) {
  const [text, setText] = useState('')
  const add = () => {
    const next = text
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean)
    if (next.length === 0) return
    onSave([...new Set([...domains, ...next])])
    setText('')
  }
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-2">
        {domains.length === 0 && <li className="text-small text-ink-3">None yet.</li>}
        {domains.map((d) => (
          <li key={d} className="flex items-center gap-1 rounded-control border border-edge px-2 py-0.5 font-mono text-micro">
            {d}
            <button type="button" aria-label={`Remove ${d}`} onClick={() => onSave(domains.filter((x) => x !== d))} className="px-1 hover:text-blocked">
              ×
            </button>
          </li>
        ))}
        {inherited.filter((d) => !domains.includes(d)).map((d) => (
          <li key={`g-${d}`} className="rounded-control border border-line-strong px-2 py-0.5 font-mono text-micro text-ink-3" title="From your account-wide list">
            {d}
          </li>
        ))}
      </ul>
      <form
        className="flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="example.org" aria-label="Add a site" className="h-10 min-w-0 flex-1 rounded-control border border-line px-3 text-small focus:border-edge focus:outline-none" />
        <Button type="submit" variant="secondary">
          Add
        </Button>
      </form>
    </div>
  )
}
