import { Link } from 'react-router'
import { Container } from '../ui/Container.tsx'
import { Mark } from '../ui/Mark.tsx'
import { Logo } from '../ui/Logo.tsx'

// Same-page anchors, so Lenis glides to them (the footer only renders on the landing page).
const links = [
  { href: '#how', label: 'How it works' },
  { href: '#sources', label: 'Sources' },
  { href: '#faq', label: 'FAQ' },
]

const focusRing = 'rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink'

export function Footer() {
  return (
    <footer className="border-t border-edge bg-surface">
      <Container className="grid gap-10 py-12 md:grid-cols-12 md:gap-8 md:py-16">
        <div className="md:col-span-3">
          <p className="font-mono text-small font-bold uppercase tracking-widest text-ink">The research desk</p>
          <p className="mt-3 text-small text-ink-2">01 / Ask<br />02 / Inspect<br />03 / Use</p>
        </div>
        <div className="md:col-span-6">
          <Logo size={96} />
          <p className="mt-4 font-display font-wide text-h2 font-extrabold text-ink">Vast Online Retrieval &amp; Assurance</p>
          <p className="mt-3 max-w-[36ch] text-lead text-ink-2">Describe the data. Get a dataset you can check.</p>
        </div>
        <nav aria-label="Footer" className="md:col-span-3 md:border-l-2 md:border-edge md:pl-6">
          <ul className="flex flex-col gap-3 text-body font-medium">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className={`group text-ink ${focusRing}`}>
                  <Mark on={false} className="group-hover:mark-on group-focus-visible:mark-on">
                    {l.label}
                  </Mark>
                </a>
              </li>
            ))}
            <li>
              <Link to="/app" className={`group text-ink ${focusRing}`}>
                <Mark on={false} className="group-hover:mark-on group-focus-visible:mark-on">
                  Open the app
                </Mark>
              </Link>
            </li>
          </ul>
        </nav>
      </Container>
      <Container className="flex flex-wrap justify-between gap-x-6 gap-y-2 border-t border-edge py-6 text-small text-ink-2">
        <p>Sample runs on this page use fictional companies on .example domains.</p>
        <p className="flex gap-6">
          <Link to="/privacy" className={`group text-ink-2 active:text-ink ${focusRing}`}>
            <Mark on={false} className="group-hover:mark-on group-focus-visible:mark-on">
              Privacy
            </Mark>
          </Link>
          <span>© 2026 VORA</span>
        </p>
      </Container>
    </footer>
  )
}
