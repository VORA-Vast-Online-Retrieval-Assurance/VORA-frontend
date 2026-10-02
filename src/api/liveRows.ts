import type { DatasetTable } from './types.ts'

export interface RowBatch {
  columns: string[]
  rows: (string | number | null)[][]
  records: { id: string }[]
}

export class LiveRows {
  private rows = new Map<string, Record<string, string | number | null>>()
  private columns: string[] = []

  merge(batch: RowBatch): boolean {
    let changed = false
    for (const column of batch.columns) if (!this.columns.includes(column)) {
      this.columns.push(column)
      changed = true
    }
    batch.rows.forEach((row, index) => {
      const id = batch.records[index]?.id
      if (!id || this.rows.has(id)) return
      this.rows.set(id, Object.fromEntries(batch.columns.map((column, i) => [column, row[i] ?? null])))
      changed = true
    })
    return changed
  }

  replace(batch: RowBatch): void {
    this.rows.clear()
    this.columns = []
    this.merge(batch)
  }

  table(): DatasetTable {
    return {
      columns: this.columns,
      rows: [...this.rows.values()].map((row) => this.columns.map((column) => row[column] ?? null)),
      row_count: this.rows.size,
    }
  }

  get size(): number { return this.rows.size }
}
