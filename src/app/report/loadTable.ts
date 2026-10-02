import { vora } from '../../api/vora.ts'
import type { DatasetTable } from '../../api/types.ts'
import { getLocal } from '../files/localProjects.ts'

/** Pauses or resumes a web project, then reads its status back (PATCH /live doesn't push an SSE event). */
export async function setLiveAndSnapshot(id: string, enabled: boolean) {
  await vora.setLive(id, enabled)
  return vora.getLive(id)
}

/** A project's table: from the backend's dashboard endpoint for a web request, from this browser for a file. */
export async function loadTable(kind: 'web' | 'file', id: string): Promise<DatasetTable | null> {
  if (kind === 'file') return (await getLocal(id))?.table ?? null
  return (await vora.getDashboard(id)).table
}
