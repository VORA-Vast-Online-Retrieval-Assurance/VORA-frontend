/**
 * Fetch wrapper for the VORA backend. In dev, calls are same-origin and Vite proxies them
 * (vite.config.ts). VITE_API_BASE_URL points at a backend on another origin, which then needs CORS
 * (the backend's VORA_CORS_ORIGINS). Every call carries the signed-in user's access token.
 */
export const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? ''

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/**
 * How the client learns who is signed in. AuthProvider registers this once; keeping it as a hook (not an
 * import of Supabase) keeps the API layer free of the auth library and easy to test.
 */
export interface AuthHooks {
  /** The current access token; `force` asks for a fresh one (after the server said 401). */
  getToken: (force?: boolean) => Promise<string | null>
  /** The session is no good any more (a fresh token was refused too): send the person to sign in. */
  onUnauthorized: () => void
}

let auth: AuthHooks | null = null

export function configureAuth(hooks: AuthHooks | null): void {
  auth = hooks
}

/** Tell the app the session is no good (used by the live stream, which does its own fetching). */
export function reportUnauthorized(): void {
  auth?.onUnauthorized()
}

/** `Authorization` for one call, or nothing when nobody is signed in. */
export async function authHeaders(force = false): Promise<Record<string, string>> {
  const token = auth ? await auth.getToken(force) : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** FastAPI errors are `{ "detail": "..." }`; fall back to the raw text. */
function detailOf(text: string, status: number): string {
  try {
    const body = JSON.parse(text) as { detail?: unknown }
    if (typeof body.detail === 'string') return body.detail
  } catch {
    // not JSON
  }
  return text || `HTTP ${status}`
}

/** fetch() with the token; a 401 is retried once with a fresh token, then the person is sent to sign in. */
export async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const send = async (force: boolean) =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      // Headers merge after the spread, so a caller's headers never wipe Content-Type (the docs' snippet did).
      headers: { 'Content-Type': 'application/json', ...(await authHeaders(force)), ...(init.headers ?? {}) },
    })
  let res: Response
  try {
    res = await send(false)
    if (res.status === 401 && auth) {
      res = await send(true)
      if (res.status === 401) auth.onUnauthorized()
    }
  } catch {
    throw new ApiError(0, 'Can’t reach the VORA server. Is the backend running?')
  }
  return res
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await authedFetch(path, init)
  if (res.status === 204) return undefined as T
  const text = await res.text()
  // The backend (FastAPI) always answers errors in JSON. A non-JSON 404/405/501 comes from a static host that has
  // no /api route (Cloudflare answers POSTs with 405), so it means "not connected", never "chat deleted".
  const json = (res.headers.get('content-type') ?? '').includes('json')
  if (!res.ok && !json && [404, 405, 501].includes(res.status)) throw new ApiError(502, NOT_CONNECTED)
  if (!res.ok) throw new ApiError(res.status, detailOf(text, res.status))
  // A static host with no /api route answers with the site's own index.html (status 200). Say so plainly
  // instead of surfacing a JSON parse error.
  if (text.trimStart().startsWith('<')) throw new ApiError(502, NOT_CONNECTED)
  try {
    return (text ? JSON.parse(text) : undefined) as T
  } catch {
    throw new ApiError(502, NOT_CONNECTED)
  }
}

export const NOT_CONNECTED =
  'The VORA server isn’t connected to this site yet, so web requests can’t run here. Uploaded files and the sample run still work.'
