import type { HTMLAttributes } from 'react'
import { MARK } from './markInk.ts'
import type { MarkInk } from './markInk.ts'

type Props = HTMLAttributes<HTMLSpanElement> & {
  ink?: MarkInk
  /** Underlined or not. */
  on?: boolean
  /** Milliseconds before the underline appears. */
  delay?: number
}

/** A subtle underline for source values and interactive text. */
export function Mark({ ink = 'yellow', on = true, delay = 0, className = '', style, ...rest }: Props) {
  return (
    <span
      {...rest}
      data-method={ink === 'yellow' ? undefined : ink}
      className={`mark ${MARK[ink]} ${on ? 'mark-on' : 'mark-off'} ${className}`}
      style={delay ? { ...style, transitionDelay: `${delay}ms` } : style}
    />
  )
}
