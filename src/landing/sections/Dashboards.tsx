import { useRef } from 'react'
import { chartFor } from '../../domain/charts.ts'
import { sampleByKey } from '../../domain/fixtures/index.ts'
import type { SampleRun } from '../../domain/fixtures/index.ts'
import { Container } from '../../ui/Container.tsx'
import { useSeen } from '../../ui/useSeen.ts'
import { ChartTile, ExportTile, MonitorTile } from '../dashboards/Tiles.tsx'
import { Section, SectionHead } from '../SectionHead.tsx'

const specOf = (s: SampleRun, key: string) => {
  const column = s.dataset.columns.find((c) => c.key === key)
  return column ? chartFor(column, s.dataset.rows) : null
}

// One chart of each kind the charts rule picks, each from a different sample.
const CHARTS = [
  { sample: sampleByKey.leads, key: 'round_date' },
  { sample: sampleByKey.sponsors, key: 'tier' },
  { sample: sampleByKey.market, key: 'brand' },
]

/**
 * Three columns on desktop: charts and export lead, with a two-row monitor rail on the right.
 */
export function Dashboards() {
  const gridRef = useRef<HTMLDivElement>(null)
  const seen = useSeen(gridRef, 0.25)
  const [line, donut, bars] = CHARTS.map(({ sample, key }) => ({ spec: specOf(sample, key), label: sample.label }))

  return (
    <Section labelledBy="use-title">
      <Container>
        <SectionHead
          id="use-title"
          index="05"
          kicker="Dashboards and monitors"
          title="Use it today. Keep it current."
          lede="Charts picked by column type, exports that keep every receipt, and monitors that re-run and list what changed."
        />

        <div ref={gridRef} className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-6 md:mt-12 lg:mt-8 md:grid-cols-2 lg:grid-cols-3">
          {line.spec && <ChartTile spec={line.spec} sample={line.label} />}
          {donut.spec && <ChartTile spec={donut.spec} sample={donut.label} />}
          {bars.spec && <ChartTile spec={bars.spec} sample={bars.label} />}
          <ExportTile />
          <MonitorTile seen={seen} className="md:col-span-2 lg:col-start-3 lg:row-start-1 lg:row-span-2" />
        </div>
      </Container>
    </Section>
  )
}
