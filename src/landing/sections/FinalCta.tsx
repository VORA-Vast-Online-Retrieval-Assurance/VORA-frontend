import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Container } from '../../ui/Container.tsx'
import { ArrowIcon } from '../../ui/icons.tsx'
import { Logo } from '../../ui/Logo.tsx'
import { ParticleField } from '../../ui/ParticleField.tsx'

const PROMISES = [
  { title: 'You approve the plan', text: 'Columns, filters and sources are proposed first. Nothing runs until you say so.' },
  { title: 'Only permitted sources', text: 'Every site is checked before it is read. Ones that refuse or fail are skipped, with the reason.' },
  { title: 'Every value has a receipt', text: 'Each cell links back to the page and sentence it came from, so the dataset can be checked.' },
]

/** The last word, and the only particle field on the site: a dark band with the request field. */
export function FinalCta() {
  const navigate = useNavigate()
  const [text, setText] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const q = text.trim()
    navigate(q ? `/app?q=${encodeURIComponent(q)}` : '/app')
  }

  return (
    <section aria-labelledby="cta-title" className="relative isolate overflow-hidden bg-[#1c1727] text-on-ink">
      <ParticleField />
      {/* A soft vignette keeps the text readable over the dots. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(28,23,39,0.55)_0%,rgba(28,23,39,0.15)_55%,transparent_80%)]" />
      <Container className="relative flex flex-col items-center py-24 text-center md:py-32">
        <Logo size={88} tone="light" />
        <p className="mt-8 font-mono text-micro uppercase tracking-[0.3em] text-wisteria">Vast Online Retrieval &amp; Assurance</p>
        <h2 id="cta-title" className="mt-4 max-w-[18ch] font-display font-wide text-display font-extrabold">
          Describe the data you need.
        </h2>
        <p className="mt-5 max-w-[56ch] text-lead text-on-ink/75">
          One sentence is enough. VORA finds the official sources, reads what they allow, cleans the rows and shows
          where every value came from.
        </p>
        <form onSubmit={submit} className="mt-10 flex w-full max-w-2xl flex-col gap-3 rounded-full bg-white/8 p-2 ring-1 ring-white/15 backdrop-blur-md sm:flex-row">
          <label htmlFor="cta-request" className="sr-only">
            Describe the data you need
          </label>
          <input
            id="cta-request"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Seed-stage fintech startups in India funded in 2026"
            autoComplete="off"
            className="h-13 min-w-0 flex-1 rounded-full bg-transparent px-5 text-body text-on-ink placeholder:text-on-ink/45 focus-visible:outline-none"
          />
          <button
            type="submit"
            className="inline-flex h-13 shrink-0 items-center justify-center gap-2 rounded-full bg-wisteria px-7 text-body font-semibold text-ink hover:-translate-y-px hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-wisteria"
          >
            Plan it <ArrowIcon />
          </button>
        </form>
        <p className="mt-4 text-small text-on-ink/60">Opens the workspace. Nothing runs until you approve the plan.</p>

        <ul className="mt-16 grid w-full max-w-5xl gap-4 text-left sm:grid-cols-3">
          {PROMISES.map((p) => (
            <li key={p.title} className="rounded-panel bg-white/6 p-5 ring-1 ring-white/10 backdrop-blur-sm">
              <p className="font-display text-h3 font-bold">{p.title}</p>
              <p className="mt-2 text-small text-on-ink/70">{p.text}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
