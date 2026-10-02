# VORA frontend — Vast Online Retrieval & Assurance

The landing page and the signed-in web app. It talks to the VORA backend (`../Vora`), which does the research; this
app plans requests with the user, shows runs live, and turns the rows into tables, charts and exports.

Stack: React 19, React Router, Vite, Tailwind CSS 4, Motion and Lenis (animation and smooth scrolling), Supabase JS
(Google sign-in).

## Run it

```bash
npm ci
npm run dev        # http://localhost:5173  (/api and /health are proxied to http://127.0.0.1:8000)
npm run build      # type check + production build into dist/
npm run preview    # serve dist/ locally
npm test           # analytics and API unit tests (node --test)
npm run lint
```

Point the dev proxy at another backend with `VORA_API=http://host:port npm run dev`.

## Environment

Create `.env.local` (git-ignored) from `.env.example`:

| Variable | Meaning |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key: public by design, safe in the browser |
| `VITE_API_BASE_URL` | Backend address in production, e.g. `https://<user>-vora-api.hf.space`. Leave empty in dev (the proxy is used) |

The backend must list this site in `VORA_CORS_ORIGINS`.

## Layout (`src/`)

| Folder | What it holds |
|---|---|
| `landing/` | The public site: hero, the five-step carousel, sections, the particle call-to-action |
| `app/` | The signed-in app: chats, live runs, dashboard, review/sources/graphs/activity tabs, exports |
| `api/` | Backend client, WebSocket + SSE live stream, row merging |
| `analytics/` | Column profiling, exact decimal maths, aggregation, outlier handling, chart choice |
| `product/`, `ui/` | Shared components: logo, buttons, charts, toasts, motion helpers |
| `domain/` | Types and the fictional sample data used on the landing page |

## Behaviour worth knowing

- **Live results** stream over a WebSocket (SSE and polling are fallbacks). The conversation and the data table follow
  new results unless you scroll up; a "New reply" / "New rows" button brings you back.
- **Numbers are exact** (decimal maths, no floating-point drift). Values far outside their column (by the median and
  median absolute deviation) are left out of totals, averages and charts and shown struck through with the reason.
- **Loading**: the landing page loads only React and the animation libraries; sign-in, the app and the Excel library
  load when needed. Libraries are split into separately cached files.

## Deploy (Cloudflare Pages)

`.github/workflows/deploy.yml` lints, tests, builds and publishes `dist/` to Cloudflare Pages. Set the repository
variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_API_BASE_URL`, and the secrets the workflow
names for the Cloudflare API token and account id. `public/_redirects` sends every route to the app;
`public/_headers` sets security and caching headers.

Brand assets: `public/vora-logo*.webp`, favicons and `og-image.jpg` were generated from `design/vora-logo-source.png`.
