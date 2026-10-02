import { samples } from '../../domain/fixtures/index.ts'
import { METHOD, PERMISSION } from '../../product/meta.ts'
import { Container } from '../../ui/Container.tsx'
import { BanIcon } from '../../ui/icons.tsx'
import { Section, SectionHead } from '../SectionHead.tsx'

// docs/PRODUCT.md, "What VORA does not do".
const RULED_OUT = ['Get past a sign-in', 'Solve a CAPTCHA or work around a block', 'Read a path robots.txt disallows', 'Fill a missing value with a guess']

// The robots.txt example is the Sales leads sample's own skipped source.
const ledgerbase = samples.flatMap((s) => s.plan.sources).find((s) => s.id === 'ledgerbase')!

export function PermittedSources() {
  return (
    <Section id="sources" labelledBy="sources-title">
      <Container>
        <div className="border border-edge bg-surface p-5 sm:p-7 lg:p-8">
          <SectionHead
            id="sources-title"
            index="06"
            kicker="Permitted sources only"
            title="It reads only what it’s allowed to read."
            lede="VORA checks robots.txt and sign-in walls before a run. Sources it may not read are skipped, with the reason."
          />

          <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="flex min-w-0 flex-col gap-8 lg:col-span-5">
              <figure className="bg-lavender-soft p-4 sm:p-5">
                <figcaption className="font-mono text-micro text-ink-2">{ledgerbase.domain}/robots.txt</figcaption>
                <pre className="mt-3 font-mono text-small whitespace-pre-wrap text-ink">{'User-agent: *\nDisallow: /companies/'}</pre>
                <div className="mt-4 flex flex-col gap-2">
                  <p className="font-mono text-small break-all text-ink-2">{ledgerbase.domain}/companies/paisaloop</p>
                  <p className="inline-flex items-start gap-2 text-small text-ink">
                    <BanIcon className="mt-0.5 shrink-0 text-blocked" />
                    Skipped. {ledgerbase.note}
                  </p>
                </div>
              </figure>

              <div>
                <h3 className="text-small font-semibold text-ink">Ruled out, by design</h3>
                <ul className="mt-3 grid gap-3">
                  {RULED_OUT.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-body text-ink-2">
                      <BanIcon className="mt-1 shrink-0 text-blocked" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <SourceLedger />
          </div>
        </div>
      </Container>
    </Section>
  )
}

/** Every source from the four sample runs, two by two: allowed ones by method, the rest with a reason. */
function SourceLedger() {
  return (
    <div className="grid content-start gap-x-8 gap-y-8 md:grid-cols-2 lg:col-span-7">
      {samples.map((sample) => (
        <div key={sample.key} className="min-w-0">
          <h3 className="flex items-baseline justify-between gap-3 text-small font-semibold text-ink">
            {sample.label}
            <span className="font-mono text-micro font-normal text-ink-3">sample run</span>
          </h3>
          <ul className="mt-2">
            {sample.plan.sources.map((source) => {
              const skipped = source.permission !== 'allowed'
              return (
                <li
                  key={source.id}
                  title={skipped ? source.note : undefined}
                  className="flex min-h-9 items-center justify-between gap-3 py-1 text-small"
                >
                  <span className={`min-w-0 truncate font-mono ${skipped ? 'text-ink-3' : 'text-ink'}`}>{source.domain}</span>
                  <span className={`shrink-0 text-right text-micro ${skipped ? 'font-semibold text-ink' : 'text-ink-2'}`}>
                    {skipped ? PERMISSION[source.permission] : METHOD[source.method].label}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
