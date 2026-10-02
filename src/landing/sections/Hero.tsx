import { ButtonLink } from '../../ui/Button.tsx'
import { Container } from '../../ui/Container.tsx'
import { ArrowIcon } from '../../ui/icons.tsx'
import { HeroRun } from '../hero/HeroRun.tsx'

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="pt-10 pb-20 md:pt-16 md:pb-28">
      <Container className="grid gap-x-8 gap-y-8 lg:grid-cols-12 lg:items-start">
        <h1 id="hero-title" className="neo-enter font-display font-wide text-display font-extrabold lg:col-span-8">
          <span className="block">Describe the data.</span>
          <span className="block">Get a dataset you can check.</span>
        </h1>
        <div className="neo-enter flex flex-col gap-6 lg:col-span-4 lg:mt-1">
          <p className="text-lead text-ink-2">
            VORA plans the collection, reads only permitted sources, cleans the results and links every value back to
            the sentence it came from.
          </p>
          <div className="flex flex-col items-start gap-5">
            <ButtonLink to="/app" size="lg">Start a request <ArrowIcon /></ButtonLink>
            <a href="#how" className="group text-body font-semibold text-ink underline decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">
              See how it works
            </a>
          </div>
        </div>
      </Container>

      <Container className="mt-14 grid lg:grid-cols-12">
        <div className="min-w-0 border border-edge bg-surface p-4 sm:p-6 lg:col-span-12 lg:p-8">
          <div className="mb-4 flex items-center justify-between gap-4 font-mono text-micro uppercase tracking-wider">
            <span>Inside a research run</span><span>Interactive sample / 01</span>
          </div>
          <HeroRun />
        </div>
      </Container>
    </section>
  )
}
