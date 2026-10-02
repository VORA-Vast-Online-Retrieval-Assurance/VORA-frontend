import type { ReactNode } from 'react'

/** The title row at the top of a workspace view (projects report, ask database). */
export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="neo-panel flex flex-wrap items-end justify-between gap-4 bg-wisteria p-5 sm:p-7">
      <div>
        <p className="font-mono text-micro font-bold uppercase tracking-widest text-ink-2">{eyebrow} / VORA</p>
        <h1 className="mt-3 font-display font-wide text-h1 font-extrabold">{title}</h1>
      </div>
      {children}
    </header>
  )
}
