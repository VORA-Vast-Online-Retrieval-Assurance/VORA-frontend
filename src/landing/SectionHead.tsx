import type { ReactNode } from 'react'

type SectionProps = {
  id?: string
  labelledBy: string
  /** Fill one screen below the nav on desktop and centre the content in it. Off for pinned sections. */
  fit?: boolean
  className?: string
  children: ReactNode
}

/**
 * Every landing section's frame. On desktop a fitted section is at least one screen tall (minus the
 * nav) with its content centred, so each section reads as one view. On phones it just flows.
 */
export function Section({ id, labelledBy, fit = true, className = '', children }: SectionProps) {
  const frame = fit ? 'lg:flex lg:min-h-[calc(100dvh-4rem)] lg:flex-col lg:justify-center lg:py-8' : ''
  return (
    <section id={id} aria-labelledby={labelledBy} className={`scroll-mt-16 py-16 md:py-24 ${frame} ${className}`}>
      {children}
    </section>
  )
}

type HeadProps = {
  id: string
  /** Two-digit section number, e.g. "02". */
  index: string
  kicker: string
  title: ReactNode
  lede?: ReactNode
  /**
   * split: headline and lede follow the section content's columns.
   * stack: everything in one column, for a heading that lives in a side column.
   */
  layout?: 'split' | 'stack'
  columns?: 'eight-four' | 'seven-five' | 'balanced'
  className?: string
}

/** Every landing section opens with a numbered label, a headline and a short explanation. */
export function SectionHead({ id, index, kicker, title, lede, layout = 'split', columns = 'eight-four', className = '' }: HeadProps) {
  const split = layout === 'split'
  const grid = !split ? '' : {
    'eight-four': 'lg:grid-cols-12 lg:gap-x-12',
    'seven-five': 'lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-x-12',
    balanced: 'lg:grid-cols-[minmax(0,1fr)_6rem_minmax(0,1fr)] lg:gap-x-0',
  }[columns]
  const left = split && columns === 'eight-four' ? 'lg:col-span-8' : ''
  const right = !split ? '' : columns === 'eight-four' ? 'lg:col-span-4' : columns === 'balanced' ? 'lg:col-start-3' : ''

  return (
    <div className={`grid gap-y-5 ${grid} ${className}`}>
      <div className={left}>
        <p className="flex flex-wrap items-baseline gap-x-2 font-mono text-micro font-semibold uppercase tracking-wider text-ink-2">
          <span className="shrink-0 whitespace-nowrap text-ink-3">{index} /</span>
          <span>{kicker}</span>
        </p>
        <h2 id={id} className="mt-3 max-w-[28ch] font-display font-wide text-section font-extrabold">{title}</h2>
      </div>
      {lede && <p className={`max-w-[52ch] text-lead text-ink-2 ${split ? 'lg:pt-8' : ''} ${right}`}>{lede}</p>}
    </div>
  )
}
