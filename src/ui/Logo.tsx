type Props = {
  /** Rendered size in pixels (the emblem is square). */
  size?: number
  /** Light artwork for dark backgrounds. */
  tone?: 'ink' | 'light'
  /** Show the "VORA" wordmark beside the emblem. The emblem carries the name too, so this is for wide headers. */
  wordmark?: boolean
  className?: string
}

/** The VORA emblem: the topographic wave mark (public/vora-logo*.webp, made from design/vora-logo-source.png). */
export function Logo({ size = 40, tone = 'ink', wordmark = false, className = '' }: Props) {
  const file = tone === 'light' ? 'vora-logo-light' : 'vora-logo'
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src={size > 96 ? `/${file}-512.webp` : `/${file}.webp`}
        width={size}
        height={size}
        alt={wordmark ? '' : 'VORA'}
        decoding="async"
        draggable={false}
        className="shrink-0 select-none transition-transform duration-500 ease-soft group-hover:rotate-[8deg]"
      />
      {wordmark && <span className="font-display font-wide text-h3 font-bold tracking-tight">VORA</span>}
    </span>
  )
}
