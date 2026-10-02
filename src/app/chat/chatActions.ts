export async function changeTracking(id: string, enabled: boolean, api: (id: string, enabled: boolean) => Promise<{ live_enabled: boolean }>, confirm: (enabled: boolean) => void): Promise<void> {
  const state = await api(id, enabled)
  confirm(state.live_enabled)
}

export async function deleteChat(id: string, remove: (id: string) => Promise<void>, navigate: () => void): Promise<void> {
  await remove(id)
  navigate()
}
