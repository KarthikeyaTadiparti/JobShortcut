# Implementation Plan: WhatsApp Job Link Scraper

**Branch**: `001-whatsapp-link-scraper` | **Date**: 2026-09-26 | **Spec**: [spec.md](file:///c:/Karthikeya/Programming/Web%20development/Projects/JobShortcut/specs/001-whatsapp-link-scraper/spec.md)

**Input**: Feature specification from `specs/001-whatsapp-link-scraper/spec.md`

---

## Summary

Implement an automated WhatsApp Web scraper and visual administrative import flow in JobShortcut. The feature enables administrators to click an "Import from WhatsApp" button on the Admin Scraper dashboard, select an extraction scope (`Unread`, `Today`, or `Yesterday`), handle QR authentication if needed, search configured groups via the WhatsApp search bar, scroll conversation panels downward, validate message rendering against virtualization bounds, extract domain-filtered job hyperlinks from messages in scope, deduplicate links, and automatically populate them directly into the scraper URL input textarea for batch job processing.

---

## Technical Context

**Language/Version**: Node.js (ESM), TypeScript 5+, React 19

**Primary Dependencies**:
- **Backend**: Playwright (`chromium`), Express 5, `tsx`, `drizzle-orm`, `jsonwebtoken`, `bcrypt`
- **Frontend**: React 19, Vite, Tailwind CSS (v4), TanStack Query (v5), Redux Toolkit, Lucide React, Sonner (toast), Radix UI / Shadcn primitives

**Storage**:
- Neon PostgreSQL (existing database for jobs and admins)
- Dedicated local persistent browser profile directory (`backend/.whatsapp_session/`) for WhatsApp Web session persistence

**Testing**:
- CLI validation scripts (`npm run scrape:whatsapp`)
- Unit/integration verification of DOM locators, scope filters, and URL deduplication
- Browser-based end-to-end admin import validation

**Target Platform**: Node.js backend (Windows/Linux) + Desktop web browser (Chrome, Edge, Firefox)

**Project Type**: Fullstack Web Application (Express REST/SSE Backend + React SPA Frontend + Headless Playwright Scraper Engine)

**Performance Goals**:
- Group evaluation & skip < 3 seconds per group with 0 unread messages
- Initial QR prompt rendered < 5 seconds when unauthenticated
- Real-time SSE streaming status updates with < 100ms UI latency

**Constraints**:
- Absolute prohibition against using WhatsApp dynamic/generated CSS classes (e.g. `.x1n2onr6`, `.x78zum5`)
- Strict reliance on `data-testid`, semantic attributes (`role`, `aria-label`), and exact visible text
- Message virtualization safety checks before extracting URLs (rendered count $\ge N$)
- Graceful error isolation per group (one group failure must not terminate the batch import)

**Scale/Scope**:
- Default configuration covering 5+ active WhatsApp job notification groups
- 10-100 unread messages per group per extraction cycle

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement / Constraint | Status | Notes |
|---|---|---|---|
| **I. Clean Aggregation & Direct Apply Shortcut** | Single normalized direct apply links; no multi-link arrays in database; unique URLs. | **PASS** | Extracted WhatsApp job links are domain-filtered and deduplicated before feeding into the single apply link extraction pipeline. |
| **II. Resilient, Modular Scraper Architecture** | Decoupled domain scrapers in `backend/src/scraper/`; headless Playwright; fallback extraction; graceful URL error handling; SSE streaming. | **PASS** | `whatsapp_scraper.ts` is modularized in `backend/src/scraper/`, uses Playwright persistent context, handles group failures gracefully, and streams live progress via SSE. |
| **III. Layered Backend Architecture & Strict Type Safety** | Routes -> Middlewares -> Controllers -> Services -> Drizzle ORM; `wrapAsync` + `ExpressError`; strict TypeScript ESM. | **PASS** | `scraper-routes.ts` -> `ensureAuthentication` -> `whatsapp-scraper-controller.ts` -> `scraper/whatsapp_scraper.ts`. Full TypeScript ESM typing. |
| **IV. Modern React & State Segregation** | Redux Toolkit for auth/global state; TanStack Query for server state/mutations/SSE; Tailwind CSS v4 styling. | **PASS** | Admin import flow uses TanStack Query mutations/SSE stream hooks and Tailwind CSS v4 modal components. |
| **V. Secure Authentication & API Contract Consistency** | Guarded by JWT auth in HTTP-only cookies; uniform JSON/SSE response envelopes. | **PASS** | WhatsApp scrape endpoints require admin auth via `ensureAuthentication` and return standardized SSE events and JSON responses. |

**Quality Gates Status**: All gates **PASSED** with zero violations.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-whatsapp-link-scraper/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── whatsapp-scraper-api.yaml
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── config/
│   │   └── whatsapp-groups.ts          # Default WhatsApp groups & domain filter mappings
│   ├── controllers/
│   │   ├── scraper-controller.ts       # Batch scrape controller
│   │   └── whatsapp-scraper-controller.ts # WhatsApp scrape & session controller
│   ├── middlewares/
│   │   ├── auth.ts                     # Admin JWT authentication middleware
│   │   └── scraper-validation.ts       # Scraper request validator
│   ├── routes/
│   │   └── scraper-routes.ts           # Scraper routes (POST /, POST /whatsapp, GET /whatsapp/status)
│   ├── scraper/
│   │   ├── index.ts                    # Universal scraper entry point
│   │   ├── whatsapp_scraper.ts         # WhatsApp Web Playwright automation engine
│   │   ├── jobcode_scraper.ts          # Existing job scrapers
│   │   └── ...
│   ├── utils/
│   │   └── wrap-async.ts
│   ├── app.ts                          # Route registrations
│   └── server.ts
└── package.json                        # Backend scripts (npm run scrape:whatsapp)

frontend/
├── src/
│   ├── api/
│   │   ├── index.ts
│   │   ├── scraper.ts                  # startScraperStream & startWhatsAppScraperStream
│   ├── components/
│   │   ├── WhatsAppImportModal.tsx     # Scope selector, QR display, and live log modal
│   │   └── ...
│   ├── pages/
│   │   └── AdminScraper.tsx            # Scraper dashboard with "Import from WhatsApp" button
│   └── redux/
│       └── store.ts
```

**Structure Decision**: Standard layered web application structure adhering strictly to JobShortcut's existing backend (Express + Playwright + TypeScript) and frontend (React 19 + Vite + Tailwind CSS v4) conventions.

---

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*No violations or unnecessary complexity identified.*
