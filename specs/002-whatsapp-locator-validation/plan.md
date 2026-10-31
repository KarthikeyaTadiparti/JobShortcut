# Implementation Plan: WhatsApp Locator Validation & Health Check Test Suite

**Branch**: `002-whatsapp-locator-validation` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-whatsapp-locator-validation/spec.md`

## Summary

Build an automated, resilient Playwright test validation suite and a centralized locator catalog (`backend/src/config/whatsapp_locators.ts`) for WhatsApp Web UI automation. The suite evaluates primary selectors first, triggers sequential fallback evaluations upon primary selector failure, highlights inspected DOM elements (`3px solid #00E676` outline with 300ms visual dwell), and persists comprehensive execution artifacts (traces, videos, screenshots, and step-level annotations). The test suite is divided into two distinct executions (`auth-locators.spec.ts` for fresh login/QR states and `chat-locators.spec.ts` for persistent profile chat UI states) without modifying existing scraper modules in this phase.

## Technical Context

**Language/Version**: TypeScript 5.9+ executed via Node.js ESM (v20+)
**Primary Dependencies**: `@playwright/test` (^1.50+), `playwright` (^1.61.0), `chalk` (^5.6.2)
**Storage**: File-based persistent browser storage (`backend/.whatsapp_session`) and generated artifact directories (`backend/playwright-report`, `backend/test-results`)
**Testing**: `@playwright/test` test runner with custom step decorators and DOM highlight injector
**Target Platform**: Node.js runtime / Chromium headless & headed browser automation on Windows/Linux/macOS
**Project Type**: Automated Test Suite & Centralized Configuration Library
**Performance Goals**: Full suite health check completed in <60 seconds for active session
**Constraints**: Zero modifications or runtime dependencies wired into `whatsapp_scraper.ts` or `whatsapp_session.ts` during this phase
**Scale/Scope**: 15+ centralized UI locator definitions with primary and multi-tier fallbacks across auth, search, chat list, headers, messages, date dividers, and links

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Principle II (Resilient Scraper Architecture & Multi-Level Fallback Standard)**: PASSED. Centralized catalog and test runner explicitly test primary-first and sequential fallback cascades to detect DOM selector drift early.
- [x] **Principle III (Layered Backend & Strict Type Safety)**: PASSED. All locator schemas and test helper modules are strictly typed with TypeScript ESM interfaces in `backend/src/config/whatsapp_locators.ts` and `backend/tests/`.
- [x] **Quality Gates (Zero Type Errors & Scraper Verification Standard)**: PASSED. Standalone CLI and npm test commands (`npm run test:locators`, `npm run test:locators:auth`, `npm run test:locators:chat`) are defined.
- [x] **Architecture Boundaries**: PASSED. No production scraper logic is modified; testing infrastructure remains cleanly isolated.

## Project Structure

### Documentation (this feature)

```text
specs/002-whatsapp-locator-validation/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── locator-registry-contract.ts
│   └── diagnostic-report-contract.md
├── checklists/
│   └── requirements.md  # Spec quality validation checklist
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
backend/
├── playwright.config.ts                     # Playwright test configuration (traces, video, screenshots, reporters)
├── src/
│   └── config/
│       ├── db.ts
│       ├── whatsapp-groups.ts
│       └── whatsapp_locators.ts             # Centralized WhatsApp locator catalog (primary + fallbacks)
├── tests/
│   ├── helpers/
│   │   ├── locator-tester.ts                # Primary-first evaluation with fallback cascade and DOM highlighter
│   │   └── reporter-formatter.ts            # Terminal health table diagnostic generator
│   ├── auth-locators.spec.ts                # Unauthenticated suite (QR code, login screen cards, reload prompt)
│   └── chat-locators.spec.ts                # Authenticated suite (Search, chat list, headers, messages, date, links)
└── package.json                             # Added @playwright/test devDependency and test scripts
```

**Structure Decision**: The centralized locator definitions reside in `backend/src/config/whatsapp_locators.ts` alongside group configurations. Test suites and test helpers are organized inside `backend/tests/` with root and backend npm scripts orchestrating execution.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| None | N/A | N/A (Standard Playwright test configuration adhering to project architecture) |
