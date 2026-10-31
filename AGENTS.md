# JobShortcut

Job aggregation portal. Scrapes cluttered third-party job blogs (and WhatsApp groups/channels that announce them), extracts company/role/experience/location plus the one direct apply link, and lets admins review and publish clean listings for job seekers.

## Stack

- **Backend** (`backend/`): Node.js ESM, Express 5, TypeScript (`tsx` in dev, `tsc` for prod), Drizzle ORM on Postgres (Neon), Playwright for scraping, zod for validation, JWT in HTTP-only cookies.
- **Frontend** (`frontend/`): React 19, Vite, TypeScript, Tailwind v4, shadcn/Radix, Redux Toolkit (client state only), TanStack Query (server state). `@/` aliases `frontend/src/`.

## Key Directories

- `backend/src/{routes,middlewares,controllers,services,schema}/` -- layered API
- `backend/src/automations/scraper/` -- one module per job site, routed by `index.ts`
- `backend/src/automations/whatsapp/` -- WhatsApp Web scraper: main workflow (`whatsapp_scraper.ts`), browser session and lock (`whatsapp_session.ts`), CLI, auth script, shared types
- `backend/src/automations/whatsapp/helpers/` -- everything except the main workflow in `whatsapp_scraper.ts`: finding/opening chats and channels (`whatsapp_open_chat.ts`), reading messages (`whatsapp_messages.ts`) via the scroll-and-merge scan engine (`whatsapp_harvester.ts`), link filtering and extraction (`whatsapp_links.ts`), navigation (`whatsapp_navigation.ts`), name matching and search candidates (`whatsapp_search.ts`), result reporting (`whatsapp_scope_report.ts`), and the pure message-merge/date logic (`whatsapp_message_merge.ts`)
- `backend/src/automations/whatsapp/config/` -- `whatsapp_sources.ts` (which groups/channels to scrape) and `whatsapp_locators.ts` (WhatsApp DOM selectors)
- `backend/tests/locator/` -- selector health checks; `backend/tests/logic/` -- scraper logic tests; `backend/tests/helpers/` -- shared helpers
- `frontend/src/{pages,components,api,redux}/` -- UI, fetch client, auth store
- `specs/NNN-*/` and `.specify/memory/constitution.md` -- Spec Kit feature specs and the project constitution
- `docs/` -- see Additional Documentation

## Commands

Run from the repo root (they proxy to `backend/` or `frontend/`) unless noted.

```bash
npm run server                  # backend dev server (port 3000)
npm run client                  # frontend dev server (port 5173)
npm run studio                  # Drizzle Studio
npm run whatsapp -- today        # WhatsApp scrape; scope: unread | today | yesterday
npm run whatsapp:auth             # one-time QR login, saves session to backend/.whatsapp_session/
npm run scrape                     # interactive multi-URL scraper CLI
npm run typecheck                  # tsc --noEmit for src and tests (backend "lint" is the same)
npm run test:locators              # Playwright vs live WhatsApp Web
npm run test:logic                 # Playwright vs live WhatsApp Web (npm run test:report opens the HTML report)
cd backend && npm run db:generate && npm run db:migrate   # schema change -> migration
cd frontend && npm run lint && npm run build              # eslint, then tsc -b + vite build
```

## Conventions That Cause Bugs If Missed

- Backend imports use the `@/` alias for `backend/src/` (`import { x } from "@/automations/whatsapp/whatsapp_scraper.js"`) instead of `../` paths, including from `tests/`; same-folder imports stay `./x.js`. Backend is `module: nodenext`, so every import **must end in `.js`**, and type-only imports need `import type`. `npm run build` runs `tsc-alias` to rewrite `@/` in `dist/`.
- `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` are on: optional props are typed `T | undefined`, and indexed access returns `T | undefined`.
- Layering is Routes -> Middlewares -> Controllers -> Services -> Drizzle. Controllers never query the DB; they call `services/`. Async handlers are wrapped in `wrapAsync` and throw `ExpressError(status, message)`.
- API responses use the envelope `{ status: boolean, data?, message? }`.
- A job has exactly one `applyLink`: normalize with `normalizeJobUrl`, unique in the DB. Never persist link arrays or aggregator landing pages.
- A scraper failing on one URL must return `null`, not throw, so batch runs continue. Long-running scrapes stream progress over SSE (`utils/sse-stream.ts`).
- Do not use Redux for server data or React Query for auth/session state.
- Schema changes go through Drizzle Kit migrations, never manual SQL.
- `/api/scrapers` and `/api/scraper` are both mounted on the same router.

## Workflows

**Add a job-site scraper:** create `backend/src/automations/scraper/<site>_scraper.ts` exporting `extractJobLinks(url)` returning `ScrapedJob`, add a hostname branch in `scrapeUrl` in `automations/scraper/index.ts`, then verify against a live URL with `npm run scrape` before finishing.

**Add or change a WhatsApp source:** edit `automations/whatsapp/config/whatsapp_sources.ts` (set `type`, exact `name`, `targetDomain`, `allowedDomains`; add `jobPathPattern` only if the site has a stable job URL shape). Homepages and non-job paths like `/whatsapp` are dropped automatically in `helpers/whatsapp_links.ts`. If selectors break, update `automations/whatsapp/config/whatsapp_locators.ts` and re-run `test:locators`.

**Schema change:** edit `backend/src/schema/*.ts`, `npm run db:generate`, review the SQL in `backend/drizzle/`, then `db:migrate`.

## Notes

- WhatsApp tests and scrapes hit live WhatsApp Web and need a logged-in session; they are slow (90s timeout, 1 worker) and can break when WhatsApp changes its DOM. Don't run them unprompted.
- Only one automation can use the WhatsApp session at a time: `launchWhatsAppContext` takes a lock (`backend/.whatsapp_session/automation.lock`), so a second launch (CLI, server request, or test run) fails with `WhatsAppSessionBusyError` instead of kicking the first one out of WhatsApp Web.
- The `unread` scope is one-shot: opening a chat marks its messages read in WhatsApp, so if a run fails after opening a chat, those messages will not be unread next time. Re-run with `today` to recover them.
- The scraper browser session lives in `backend/.whatsapp_session/` (gitignored). Never commit it or `.env` files.
- Dev machine is Windows; use forward-slash-safe, cross-platform commands in scripts.

## Additional Documentation

Read only what the task needs. These may be partly out of date; verify against the code.

- Architecture rules and quality gates: `.specify/memory/constitution.md`
- Feature specs, data models, API contracts: `specs/00*-*/` (WhatsApp scraper, locator validation, channel scraper)
- Endpoint reference: `docs/api.md`
- Project history and per-scraper extraction logic: `docs/PROJECTCONTEXT.md`
- Local setup: `docs/SETUP_GUIDE.md`
- WhatsApp flow diagrams: `docs/diagrams/`
