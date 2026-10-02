import { useRef, useState } from 'react'
import type { DragEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { Filter } from '../../analytics/aggregate.ts'
import type { TableProfile } from '../../analytics/profile.ts'
import { CHART_LABEL, typesFor } from '../../analytics/spec.ts'
import type { ChartSpec, ChartType } from '../../analytics/spec.ts'
import { GripIcon, ResizeIcon } from '../../ui/appIcons.tsx'
import { ChartView } from './charts/ChartView.tsx'
import { useResult } from './charts/useResult.ts'
import { PrecisionNote } from './PrecisionNote.tsx'
import { TileMenu } from './TileMenu.tsx'
import { clampH, clampW } from './layout.ts'
import type { Tile as TileState } from './layout.ts'

type Props = {
  tile: TileState
  index: number
  count: number
  profile: TableProfile
  filters: Filter[]
  /** Width of one grid column plus its gap, for snapping a resize. 0 on small screens (no resizing). */
  colPx: number
  /** Height of one page row, and the gap between rows: the page fits one screen, so rows scale with it. */
  rowPx: number
  gap: number
  selected?: Set<string>
  onSelect?: (key: string) => void
  onChange: (spec: ChartSpec) => void
  onResize: (w: number, h: number) => void
  onMove: (to: number) => void
  onRemove: () => void
  onDuplicate: () => void
  onEdit: () => void
  onExport: (spec: ChartSpec) => void
  /** Drag-to-reorder: the dashboard tracks which tile is dragged and where it would land. */
  onDragStart: () => void
  onDragOverTile: () => void
  onDragEnd: () => void
  dropTarget: boolean
}

// Tile chrome, in px: padding + border (24), title bar, and the one-line precision note. Number cards are tighter.
const CHROME_PX = 82
const KPI_CHROME_PX = 62

/** One dashboard tile: title bar (grip, type switch, menu), the chart, and its precision note. */
export function Tile(props: Props) {
  const { tile, index, count, profile, filters, colPx, rowPx, gap, selected, onSelect, onChange, onResize } = props
  const { spec } = tile
  const result = useResult(profile, spec, filters)
  const [live, setLive] = useState<{ w: number; h: number } | null>(null)
  const start = useRef<{ x: number; y: number; w: number; h: number } | null>(null)
  const w = live?.w ?? tile.w
  const h = live?.h ?? tile.h
  const tileH = h * rowPx + (h - 1) * gap
  const kpi = spec.type === 'kpi'
  const bodyH = tileH - (kpi ? KPI_CHROME_PX : CHROME_PX)
  const grouped = spec.query.groupBy !== undefined
  const timeGroup = grouped && profile.columns[spec.query.groupBy!]?.kind === 'period'
  const types: ChartType[] = spec.type === 'scatter' ? ['scatter'] : typesFor(grouped, timeGroup)

  // Corner drag: snap to whole columns and rows while dragging, commit on release.
  const onResizeDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!colPx) return
    e.currentTarget.setPointerCapture(e.pointerId)
    start.current = { x: e.clientX, y: e.clientY, w: tile.w, h: tile.h }
  }
  const onResizeMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const s = start.current
    if (!s) return
    const nw = clampW(s.w + Math.round((e.clientX - s.x) / colPx))
    const nh = clampH(s.h + Math.round((e.clientY - s.y) / (rowPx + gap)))
    setLive({ w: nw, h: nh })
  }
  const onResizeUp = () => {
    if (live) onResize(live.w, live.h)
    start.current = null
    setLive(null)
  }

  return (
    <section
      aria-label={spec.title}
      onDragOver={(e: DragEvent) => {
        e.preventDefault()
        props.onDragOverTile()
      }}
      onDrop={(e) => {
        e.preventDefault()
        props.onDragEnd()
      }}
      className={`relative flex min-w-0 flex-col rounded-panel border bg-surface p-2.5 shadow-soft transition-[border-color,box-shadow] duration-200 ease-soft ${props.dropTarget ? 'border-dashed border-edge shadow-[7px_7px_0_var(--color-wisteria)]' : 'border-edge'}`}
      style={{ gridColumn: colPx ? `span ${w} / span ${w}` : '1 / -1', gridRow: `span ${h} / span ${h}` }}
    >
      <header className={`flex shrink-0 items-center gap-1 ${kpi ? 'h-6' : 'mb-1 h-7'}`}>
        <span
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', spec.id)
            props.onDragStart()
          }}
          onDragEnd={props.onDragEnd}
          title="Drag to move"
          className="grid size-6 shrink-0 cursor-grab place-items-center rounded-control text-ink-3 hover:bg-sunken hover:text-ink active:cursor-grabbing"
        >
          <GripIcon />
        </span>
        <h3 className={`min-w-0 flex-1 truncate font-semibold ${kpi ? 'text-micro text-ink-2' : 'text-small'}`} title={spec.title}>
          {spec.title}
        </h3>
        {types.length > 1 && w >= 5 && (
          <label className="shrink-0">
            <span className="sr-only">Chart type for {spec.title}</span>
            <select
              value={spec.type}
              onChange={(e) => onChange({ ...spec, type: e.target.value as ChartType })}
              className="h-7 rounded-control border border-line bg-surface px-1.5 text-micro hover:border-edge-strong focus-visible:border-edge focus-visible:outline-none"
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {CHART_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
        )}
        <TileMenu
          spec={spec}
          index={index}
          count={count}
          w={tile.w}
          h={tile.h}
          canResize={colPx > 0}
          result={result}
          types={w >= 5 ? [] : types}
          onChange={onChange}
          onResize={onResize}
          onMove={props.onMove}
          onRemove={props.onRemove}
          onDuplicate={props.onDuplicate}
          onEdit={props.onEdit}
          onExport={props.onExport}
        />
      </header>

      <div className="min-h-0 flex-1">
        <ChartView spec={spec} profile={profile} filters={filters} height={Math.max(kpi ? 28 : 72, bodyH)} selected={selected} onSelect={onSelect} />
      </div>

      <footer className={`shrink-0 ${kpi ? '' : 'mt-1 border-t border-line pt-1'} ${colPx > 0 ? 'pr-4' : ''}`}>
        <PrecisionNote profile={profile} result={result} />
      </footer>

      {colPx > 0 && (
        <button
          type="button"
          aria-label={`Resize ${spec.title}`}
          title="Drag to resize"
          onPointerDown={onResizeDown}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeUp}
          onPointerCancel={onResizeUp}
          className="absolute right-0.5 bottom-0.5 grid size-5 cursor-nwse-resize touch-none place-items-center text-ink-3 hover:text-ink"
        >
          <ResizeIcon />
        </button>
      )}
      {live && (
        <span className="pointer-events-none absolute right-6 bottom-1 rounded-sm bg-ink px-1.5 font-mono text-micro text-on-ink">
          {live.w} × {live.h}
        </span>
      )}
    </section>
  )
}
