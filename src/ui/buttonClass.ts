export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-control border font-semibold whitespace-nowrap select-none ' +
  'transition-[background-color,border-color,color,translate,box-shadow] duration-200 ease-soft ' +
  'disabled:pointer-events-none disabled:opacity-45 aria-busy:cursor-progress ' +
  'focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ink'

const variants: Record<ButtonVariant, string> = {
  primary: 'neo-button border-edge bg-cta text-on-ink hover:bg-cta-hover',
  secondary: 'neo-button border-edge bg-surface text-ink hover:bg-sunken',
  ghost: 'border-transparent text-ink hover:border-edge-strong hover:bg-lavender-soft',
}

const sizes: Record<ButtonSize, string> = {
  md: 'h-10 px-4 text-small',
  lg: 'h-12 px-6 text-body',
}

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra = '') {
  return [base, variants[variant], sizes[size], extra].join(' ')
}
