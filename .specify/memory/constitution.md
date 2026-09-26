<!--
# Sync Impact Report
- Version change: Initial Draft -> 1.0.0
- List of modified principles:
  - [PRINCIPLE_1_NAME] -> I. Clean Aggregation & Direct Apply Shortcut (Domain Integrity)
  - [PRINCIPLE_2_NAME] -> II. Resilient, Modular Scraper Architecture (Headless Extraction Standard)
  - [PRINCIPLE_3_NAME] -> III. Layered Backend Architecture & Strict Type Safety
  - [PRINCIPLE_4_NAME] -> IV. Modern React & State Segregation (Frontend Discipline)
  - [PRINCIPLE_5_NAME] -> V. Secure Authentication & API Contract Consistency
- Added sections:
  - Architecture & Technology Constraints
  - Development Workflow & Quality Gates
- Removed sections: None
- Follow-up TODOs: None
-->

# JobShortcut Constitution

## Core Principles

### I. Clean Aggregation & Direct Apply Shortcut (Domain Integrity)
JobShortcut's primary mission is eliminating clutter, ads, and multi-step registration walls from third-party job postings to provide verified, clean metadata with direct application shortcuts. Every job entity MUST maintain a single, normalized direct application URL (`applyLink`). Multi-link arrays or raw aggregator landing pages MUST NOT be persisted as direct apply links. Database records MUST enforce unique direct apply links to prevent duplicate postings.

### II. Resilient, Modular Scraper Architecture (Headless Extraction Standard)
All web scraping logic MUST be decoupled into domain-specific scraper modules within `backend/src/scraper/` and orchestrated via a universal scraper router (`backend/src/scraper/index.ts`). Scrapers MUST utilize Playwright headlessly, implementing multi-level fallback extraction strategies (e.g., table selectors, heading text analysis, and semantic regex parsing). Scrapers MUST fail gracefully on individual URLs without crashing batch execution pipelines, and streaming endpoints MUST emit real-time Server-Sent Events (SSE) for client progress tracking.

### III. Layered Backend Architecture & Strict Type Safety
The backend MUST enforce strict separation of concerns across layers: Routes -> Middlewares -> Controllers -> Services -> Drizzle ORM Schema -> PostgreSQL. Controllers MUST NOT execute direct database queries or raw SQL; all data operations MUST be delegated to dedicated service modules. Async controller handlers MUST be wrapped in centralized error-handling utilities (`wrapAsync`) throwing typed `ExpressError` instances. All backend code MUST run on Node.js ESM with strict TypeScript types.

### IV. Modern React & State Segregation (Frontend Discipline)
The frontend MUST strictly separate client-side state from server-side asynchronous state:
- Redux Toolkit MUST be used exclusively for global client state (e.g., user authentication and session persistence).
- TanStack Query (React Query) MUST be used for all server state, data fetching, mutations, caching, and SSE stream life-cycle hooks.
- Styling MUST adhere to Tailwind CSS (v4) paired with accessible Radix UI/Shadcn primitives, responsive grid layouts, and consistent light/dark theme variables.

### V. Secure Authentication & API Contract Consistency
Administrative operations MUST be guarded by secure JWT authentication delivered through HTTP-only, SameSite-compliant cookies and verified via middleware. Passwords MUST be hashed using `bcrypt` before persistence. All REST API endpoints MUST return uniform JSON envelopes (`{ status: boolean, data?: ..., message?: ... }`) with accurate HTTP status codes (e.g., 200, 201, 400, 401, 403, 404, 409, 500).

## Architecture & Technology Constraints

The system architecture MUST strictly adhere to the following stack boundaries:
- **Backend:** Node.js (ESM), Express 5, TypeScript executed via `tsx` in development and compiled via `tsc` for production.
- **Database:** PostgreSQL (Neon Serverless) managed through Drizzle ORM schemas (`backend/src/schema/`) and migrations managed via `drizzle-kit`.
- **Scraping Engine:** Playwright browser automation with pre-installed headless binaries (Chromium, Firefox, WebKit).
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Redux Toolkit, and TanStack Query.
- **Security & Networking:** CORS restricted to configured `FRONTEND_URL` with credentials enabled (`credentials: 'include'`).

## Development Workflow & Quality Gates

All development and code reviews MUST enforce the following quality gates:
- **Type Checking:** All TypeScript builds (`tsc` in backend and frontend) MUST pass with zero type errors.
- **Code Quality:** Frontend linting (`npm run lint`) MUST pass cleanly before pull requests are merged.
- **Database Migrations:** Schema changes MUST be executed via Drizzle Kit (`db:generate`, `db:migrate`, or `db:push`); manual schema alterations in production are prohibited.
- **Scraper Verification:** New or modified scraping modules MUST be validated against sample live URLs via their respective CLI scripts (`npm run scrape` or `npm run scrape:<target>`) to guarantee extraction accuracy before deploying scraper updates.

## Governance

This Constitution represents the supreme technical governance for the JobShortcut project. All features, pull requests, refactors, and architectural decisions MUST comply with these principles.

- **Amendment Process:** Changes to this constitution require a documented rationale, version bump, and team review.
- **Versioning Policy:**
  - **MAJOR** version bumps for breaking architectural redefinitions or principle removals.
  - **MINOR** version bumps for added principles, sections, or materially expanded guidelines.
  - **PATCH** version bumps for clarifications, grammatical refinements, or minor corrections.
- **Compliance Enforcement:** Code reviews and automated tools MUST verify alignment with these core principles before merging code into main branches.

**Version**: 1.0.0 | **Ratified**: 2026-09-25 | **Last Amended**: 2026-09-25
