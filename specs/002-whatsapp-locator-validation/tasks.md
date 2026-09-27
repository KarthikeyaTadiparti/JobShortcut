# Tasks: WhatsApp Locator Validation & Health Check Test Suite

**Input**: Implementation plan from `specs/002-whatsapp-locator-validation/plan.md`  
**Prerequisites**: `spec.md`, `plan.md`, `data-model.md`, `contracts/`, `research.md`, `quickstart.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Configure Playwright test environment, package dependencies, and script entry points.

- [X] T001 Configure `@playwright/test` dependency in `backend/package.json` and add locator test npm scripts (`test:locators`, `test:locators:auth`, `test:locators:chat`, `test:locators:report`) to `backend/package.json` and root `package.json`
- [X] T002 [P] Create Playwright configuration file with screenshot, video, trace (`trace: 'on'`), and HTML reporting settings in `backend/playwright.config.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core locator definitions, highlighting utilities, and diagnostic report formatters required by all test suites.

- [X] T003 [P] Create centralized WhatsApp Web locator registry and TypeScript schema in `backend/src/config/whatsapp_locators.ts` mapping all elements (`qrCanvas`, `loginInstructions`, `chatListSearchInput`, `chatListSearchClearBtn`, `chatListContainer`, `chatListRow`, `chatRowTitle`, `chatRowUnreadBadge`, `conversationHeader`, `conversationChatTitle`, `conversationPanelMessages`, `messageContainer`, `copyableText`, `dateDividerSpan`, `messageAnchorLink`) with primary and fallback selectors
- [X] T004 [P] Implement DOM element highlight injector with high-contrast glowing outline (`3px solid #00E676; box-shadow: 0 0 12px #00E676`) and 300ms visual dwell in `backend/tests/helpers/dom-highlighter.ts`
- [X] T005 Implement terminal diagnostic report generator and health summary table formatter in `backend/tests/helpers/reporter-formatter.ts`

**Checkpoint**: Foundation ready - locator catalog, highlighting helpers, and test configuration are fully set up.

---

## Phase 3: User Story 1 - Centralized Locator Definitions & Single-Element Health Validation (Priority: P1) 🎯 MVP

**Goal**: Validate individual UI locators for presence and visibility across both unauthenticated (QR/login screen) and authenticated sessions.

**Independent Test**: Run `npm run test:locators:auth` on a fresh session to verify QR canvas and login card, and `npm run test:locators:chat` on persistent profile to verify chat list, search, conversation headers, messages, date dividers, and links.

### Implementation for User Story 1

- [X] T006 [P] [US1] Implement primary locator evaluation runner with timeout and visibility checks in `backend/tests/helpers/locator-tester.ts`
- [X] T007 [P] [US1] Implement unauthenticated authentication locator test suite in `backend/tests/auth-locators.spec.ts` verifying `qrCanvas` and `loginInstructions` on fresh browser context
- [X] T008 [US1] Implement authenticated chat UI locator test suite in `backend/tests/chat-locators.spec.ts` launching persistent profile `backend/.whatsapp_session` and verifying search inputs, chat list rows, conversation headers, message containers, copyable text, date dividers, and embedded links

**Checkpoint**: At this point, User Story 1 (MVP) is fully functional and can validate working primary selectors across WhatsApp Web.

---

## Phase 4: User Story 2 - Fallback Cascade & Change Diagnostic Reporting (Priority: P2)

**Goal**: When a primary locator fails, sequentially evaluate defined fallback locators, report whether any fallback works, and mark the element status as degraded/changed.

**Independent Test**: Temporarily simulate a modified primary selector in test execution; verify that fallback selectors are tested sequentially, working alternatives are identified, and the diagnostic health table outputs `DEGRADED` status.

### Implementation for User Story 2

- [X] T009 [US2] Implement sequential fallback evaluation cascade in `backend/tests/helpers/locator-tester.ts` triggered only when primary selector fails
- [X] T010 [US2] Add diagnostic status resolution (`OPERATIONAL`, `DEGRADED`, `BROKEN`, `SKIPPED`) and fallback attempt telemetry in `backend/tests/helpers/locator-tester.ts`
- [X] T011 [US2] Integrate diagnostic health summary table output at the conclusion of test runs in `backend/tests/chat-locators.spec.ts` and `backend/tests/auth-locators.spec.ts`

**Checkpoint**: At this point, User Stories 1 and 2 work together, providing automated fallback discovery and actionable selector drift diagnostics.

---

## Phase 5: User Story 3 - Visual Inspection, Step Traces, Element Highlighting & Artifacts (Priority: P3)

**Goal**: Provide structured step descriptions (`test.step`), visual element highlighting before assertion, and recorded screenshots, videos, and trace files.

**Independent Test**: Execute test run and inspect the generated Playwright trace viewer (`npm run test:locators:report`) to verify step annotations, glowing green element snapshots, video playback, and screenshot captures.

### Implementation for User Story 3

- [X] T012 [P] [US3] Integrate `test.step` descriptive wrappers and pre-assertion `highlightElement` calls for all element checks in `backend/tests/helpers/locator-tester.ts`
- [X] T013 [US3] Verify artifact capture (traces with action snapshots, video recordings, screenshots) in `backend/playwright.config.ts` and `backend/tests/chat-locators.spec.ts`

**Checkpoint**: All three user stories are complete, producing comprehensive visual artifacts, highlights, and step annotations.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation, safety verification, and quickstart end-to-end execution.

- [X] T014 [P] Verify strict isolation: confirm zero changes or imports are added to `backend/src/scraper/whatsapp_scraper.ts` and `backend/src/scraper/whatsapp_session.ts`
- [X] T015 Execute quickstart end-to-end validation scenarios per `specs/002-whatsapp-locator-validation/quickstart.md` using `npm run test:locators`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion (T001, T002) - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion (T003, T004, T005)
- **User Story 2 (Phase 4)**: Depends on User Story 1 completion (T006, T007, T008)
- **User Story 3 (Phase 5)**: Depends on User Story 2 completion (T009, T010, T011)
- **Polish (Phase 6)**: Depends on all user stories being complete

### Parallel Opportunities

- `T002` [P] (playwright.config.ts) can run in parallel with `T001` (package.json scripts)
- `T003` [P] (whatsapp_locators.ts) and `T004` [P] (dom-highlighter.ts) can run in parallel in Phase 2
- `T006` [P] (locator-tester.ts) and `T007` [P] (auth-locators.spec.ts) can run in parallel in Phase 3
- `T012` [P] (step wrappers & highlight integration) can run in parallel in Phase 5
- `T014` [P] (isolation check) can run in parallel in Phase 6

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1 (Setup: T001, T002)
2. Complete Phase 2 (Foundational: T003, T004, T005)
3. Complete Phase 3 (User Story 1: T006, T007, T008)
4. **VALIDATE**: Run `npm run test:locators:auth` and `npm run test:locators:chat` to verify all primary locators resolve and report pass/fail.

### Incremental Delivery
1. Setup + Foundational → Base test framework ready
2. Add US1 (T006-T008) → Primary locator validation functional (MVP)
3. Add US2 (T009-T011) → Fallback cascade and diagnostic report table active
4. Add US3 (T012-T013) → Step annotations, glowing green highlights, and visual artifacts active
5. Polish (T014-T015) → Isolation verified and quickstart validated
