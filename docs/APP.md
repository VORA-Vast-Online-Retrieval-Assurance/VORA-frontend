# VORA app (`/app`)

The signed-in app, built on the VORA backend (FastAPI, the private VORA repository). Where VORA answers differently
from what the screens draw, `src/api/adapt.ts` translates; screens never see raw responses.

## Screens and routes

| Route | Screen | Main files |
|---|---|---|
| `/app` | New chat: prompt box (text, voice, file), shortcut strip, Try cards | `src/app/chat/NewChat.tsx`, `src/app/prompt/PromptBox.tsx` |
| `/app/c/:id` | A web request. Tabs (`?tab=`): **Results** (thread, live run, dashboard, questions), **Review rows** (accepted, partial, rejected, raw, with why), **Sources** (pages, favoured sites, files), **Graphs** (by parameter), **Activity** (runs, timeline, stop/repeat), **Settings** (rename, pause, copy, archive, empty) | `src/app/chat/ChatPage.tsx`, `LiveRun.tsx`, `src/app/manage/*` |
| `/app/tools` | Service status and browser pool, searching, favoured sites, site reputation, saved results, webhooks, extraction methods | `src/app/tools/ToolsPage.tsx` |
| `/app/f/:id` | An uploaded file: dashboard and questions | `src/app/chat/FilePage.tsx`, `src/app/files/*` |
| `/app/projects` | Projects report | `src/app/report/*` |
| `/app/ask` | Ask database | `src/app/ask/AskPage.tsx`, `ProjectAsk.tsx` |
| `/app/dev` | Dev builds only: component gallery and the dashboard on sample tables | `src/app/dev/DevPreview.tsx` |

The sidebar (`src/app/workspace/`) lists every web request and uploaded file, grouped by day, with search and
delete (FuseButton, with a few seconds to undo).

## How data flows

1. **Signing in.** Google through Supabase (PKCE). Every backend call carries the access token
   (`Authorization: Bearer`, `src/api/client.ts`; a 401 refreshes the token once, then signs out). The backend
   verifies it and shows each person only their own chats.
2. **New web request.** As you type, `POST /api/v1/goals/analyze?mode=fast` shows how the request is read (answer
   shape, subject, window, named source). Sending it does `POST /api/v1/instances`, then
   `POST /api/v1/instances/{id}/messages` (the sentence, as `content`), then turns live tracking on. The backend
   researches in the background; progress arrives as `status` events on `/live/stream`, read with `fetch()` because
   `EventSource` cannot send the token (`src/api/sse.ts`, `useLiveStream.ts`).
3. **Rows arrive** by fetching `GET /dashboard` whenever the row count changes or a run ends:
   `{ columns: string[], rows: string[][] }`. Every cell is text.
3. **`profileTable()`** (`src/analytics/profile.ts`) reads each column as number, money, percent, period, category,
   URL or text. It parses every cell exactly (BigInt decimals: Indian and Western grouping, ₹/$/€/£, lakh/crore,
   K/M/B, units, "N/A" as missing, never 0) and lists each cell it couldn't read, with the reason.
4. **`runQuery()`** (`src/analytics/aggregate.ts`) powers every chart, answer and export: filter, group,
   count/sum/avg/median/min/max/distinct, sort, top N plus Other. Averages round half-to-even at a stated scale.
5. **Questions** (`src/analytics/ask.ts`, `answer.ts`) turn plain English into a query and a sentence. They never
   call the backend: `POST /messages` would replace the goal and wipe the dataset.
6. **Uploads** (`src/app/files/readFile.ts`): CSV, TSV, JSON and XLSX are read in the browser into the same table shape
   and kept in IndexedDB (`localProjects.ts`). PDF and Word tables are refused with a clear reason.

## Dashboard page and sources

- The Report tab is one screen: a 12 × 6 grid sized to the viewport (number cards on top, up to six charts). Tiles resize
  in page rows and columns; "Fit to one screen" re-packs them. Data and Sources are separate tabs.
- Charts place time by real time (gaps show), group dates by month, quarter or year, and label exact values where they fit.
- The Results tab's sources strip comes from the bot's report (`src/analytics/runReport.ts`), the rows' `source_url`
  column and the stream's `current_source`. The **Sources** tab uses the backend's own `/sources` and `/files`.

## Backend facts the app depends on (checked against the code)

- One goal per instance: a new message replaces the goal and starts a run. So there's one request per chat, and follow-ups stay in the browser.
- Times come without a timezone (SQLite drops it). Always use `apiDate()` from `src/api/dates.ts`.
- `GET /api/v1/instances` has no status. The report polls `/live` per project, six at a time, every 15 s.
- `PATCH /live` doesn't push a stream event. The UI reads `/live` back after pausing or resuming.
- The backend's phases (planning, discovery, rendering, extracting, scoring, merging) map onto the five pipeline
  steps drawn (`phaseOf` in `src/api/adapt.ts`).
- Auth and CORS: the backend needs `VORA_AUTH=supabase`, `SUPABASE_URL` and this site in `VORA_CORS_ORIGINS`.
  In dev, Vite proxies `/api` and `/health` (`vite.config.ts`), so none of that is needed locally.
- Exports are fetched with the token and saved as a blob (a plain link could not carry it).
- Real research needs a Chromium build on the backend machine (`VORA_BROWSER_BINARY`); `/ready` says when it's missing.

## Kept in this browser (localStorage / IndexedDB)

| Key | What |
|---|---|
| `vora.dashboard.<id>` | A chat's tiles and layout (`file-<id>` for uploads) |
| `vora.answers.<id>` | Questions asked; the numbers are recomputed from the current table on every load |
| `vora.alerts` | Which projects alert on new rows, and the row count last seen |
| `vora.sidebar.collapsed` | Sidebar state |
| IndexedDB `vora/projects` | Uploaded files' tables |

## Checks

```bash
npm run test             # exactness tests for parsing, queries, answers and CSV, plus the backend adapters and stream parser
npm run build
npm run lint
npm run dev:agent        # http://localhost:5174, /app without Google sign-in (dev only)
```
