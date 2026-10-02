/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** https://<project-ref>.supabase.co */
  readonly VITE_SUPABASE_URL: string
  /** sb_publishable_…: a public client key; Row Level Security protects the data. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
  /** Optional VORA backend origin. Unset in dev: calls go to same-origin /api, which Vite proxies. */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
