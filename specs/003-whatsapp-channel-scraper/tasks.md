# Tasks: WhatsApp Channels Job Link Extraction

**Feature**: WhatsApp Channels Job Link Extraction (`003-whatsapp-channel-scraper`)  
**Input**: Plan from [`specs/003-whatsapp-channel-scraper/plan.md`](plan.md), Spec from [`specs/003-whatsapp-channel-scraper/spec.md`](spec.md)  
**Status**: Ready for Implementation  

---

## Phase 1: Setup (Shared Infrastructure & Source Configs)

**Purpose**: Establish unified configuration presets for groups and channels.

- [X] T001 [P] Create unified WhatsApp source configuration in `backend/src/config/whatsapp-sources.ts` exporting `DEFAULT_WHATSAPP_SOURCES`, `DEFAULT_WHATSAPP_GROUPS`, and `DEFAULT_WHATSAPP_CHANNELS` (with `'Found The Job Alerts'`, `'Freshershunt'`, `'Job Update With FoundtheJob'`).
- [X] T002 [P] Re-export unified sources and maintain backward compatibility in `backend/src/config/whatsapp-groups.ts`.

---

## Phase 2: Foundational (Type Schemas & Helper Utilities)

**Purpose**: Core data types, SSE schemas, and search input sanitization utilities required before user story implementation.

- [X] T003 [P] Update `backend/src/scraper/whatsapp-types.ts` to add `WhatsAppSourceType`, `WhatsAppSourceConfig`, `WhatsAppChannelConfig`, `SourceScrapeResult`, updated `WhatsAppImportResult` (tracking `totalSources`, `totalGroups`, `totalChannels`), and typed SSE events (`source_start`, `source_progress`, `source_complete`).
- [X] T004 [P] Implement pre-search state sanitization helper `clearActiveSearchInput(page)` in `backend/src/scraper/whatsapp_scraper.ts` to clear search inputs via Escape, clear button, or select-all backspace before typing.

**Checkpoint**: Foundation ready — User story implementation can now proceed.

---

## Phase 3: User Story 1 - Unified Group & Channel Automated Import (Priority: P1) 🎯 MVP

**Goal**: Run sequential group and channel scraping in a single import run, aggregate deduplicated URLs from both sources, and populate them via API and SSE events into the Admin Scraper UI.

**Independent Test**: Trigger WhatsApp import in CLI or Admin UI with both groups and channels enabled, verify that groups execute first followed by channels in a single run, and all unique job URLs are aggregated and returned.

### Implementation for User Story 1
- [X] T005 [US1] Refactor `scrapeWhatsAppJobLinks` in `backend/src/scraper/whatsapp_scraper.ts` to accept unified `sources` (`WhatsAppSourceConfig[]`), sequence group and channel extraction, and aggregate deduplicated URLs into `allJobLinks`.
- [X] T006 [US1] Update `backend/src/controllers/admin.controller.ts` to support unified `sources` in POST `/api/admin/whatsapp/scrape` and GET `/api/admin/whatsapp/scrape/stream`.
- [X] T007 [US1] Update CLI runner `backend/src/scraper/whatsapp_cli.ts` to display unified group and channel progress and aggregated link statistics.
- [X] T008 [US1] Update Frontend Admin Scraper UI in `frontend/src/pages/admin/Scraper.tsx` to display real-time progress for both group and channel sources from the SSE stream and populate the URL input box upon completion.

**Checkpoint**: User Story 1 (MVP) is fully functional and delivers unified end-to-end extraction across groups and channels.

---

## Phase 4: User Story 2 - Resilient WhatsApp Channel Navigation & Message Harvesting (Priority: P2)

**Goal**: Navigate to the Channels / Updates sidebar tab in WhatsApp Web, find and open followed channels, safely extract message links matching allowedDomains, and isolate errors per channel.

**Independent Test**: Run scraping with only channels enabled, verifying that the scraper switches to the Channels tab, opens each channel from the list, navigates message history, applies domain filtering, and extracts clean job URLs.

### Implementation for User Story 2
- [X] T009 [US2] Implement channel navigation helper `navigateToChannelsTab(page)` in `backend/src/scraper/whatsapp_scraper.ts` to switch to the Channels / Updates sidebar rail view.
- [X] T010 [US2] Implement followed channel locator and selection helper `openFollowedChannel(page, channelName)` in `backend/src/scraper/whatsapp_scraper.ts` using `clearActiveSearchInput` before typing or filtering channel names.
- [X] T011 [US2] Implement broadcast message extraction and domain whitelisting helper `extractChannelBroadcastLinks(page, channelConfig)` in `backend/src/scraper/whatsapp_scraper.ts` to parse broadcast message bubbles, rich preview links, and normalize URLs against `allowedDomains`.
- [X] T012 [US2] Add error isolation and channel skipping logic in `backend/src/scraper/whatsapp_scraper.ts` so that un-followed, missing, or empty channels log a non-fatal warning and continue to the next source without terminating the batch.

**Checkpoint**: User Stories 1 AND 2 work reliably with dedicated Channel tab navigation and fault isolation.

---

## Phase 5: User Story 3 - Scope-Aware Channel Message Filtering (Priority: P3)

**Goal**: Support `Unread`, `Today`, and `Yesterday` message filtering logic for broadcast channel feeds.

**Independent Test**: Run extraction under `today` and `yesterday` scopes on channels with multi-day post history to verify date boundary compliance, and `unread` scope badge detection.

### Implementation for User Story 3
- [X] T013 [US3] Add channel-specific timeframe and numeric unread badge count evaluation in `backend/src/scraper/whatsapp_scraper.ts` to extract badge count $N$ from channel list items and filter messages by date headers.
- [X] T014 [US3] Update `collectAllScopeMessages` in `backend/src/scraper/whatsapp_scraper.ts` to ensure channel virtualization scrolling properly halts at the scope boundary for channels.

**Checkpoint**: All 3 user stories are complete and handle timeframe scoping across all ingestion sources.

---

## Phase 6: Polish & Verification

**Purpose**: End-to-end validation, testing, and documentation alignment.

- [X] T015 [P] Update Playwright locator validation tests in `backend/tests/` to verify Channels sidebar tab and broadcast message container locators.
- [X] T016 Run full quickstart validation via `npm run scrape:whatsapp -- --scope=today` and `npm run test:locators:report` in `backend/`.

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — blocks User Stories.
- **User Stories (Phases 3-5)**: Depend on Foundational phase. Sequenced in priority order: P1 (MVP) → P2 (Channel Navigation) → P3 (Scope Filtering).
- **Polish (Phase 6)**: Depends on all user stories being complete.

### Parallel Opportunities
- `T001` and `T002` in Setup can run in parallel.
- `T003` and `T004` in Foundational can run in parallel.
- `T015` in Polish can run in parallel with documentation checks.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1: Setup (`T001`, `T002`).
2. Complete Phase 2: Foundational (`T003`, `T004`).
3. Complete Phase 3: User Story 1 (`T005` - `T008`).
4. **Validate MVP**: Test unified group + channel pipeline via CLI and Admin UI.

### Incremental Delivery
1. Setup + Foundation complete.
2. Deliver US1 (Unified Group + Channel pipeline).
3. Deliver US2 (Dedicated Channels tab navigation & locator resilience).
4. Deliver US3 (Accurate scope filtering: Today, Yesterday, Unread).
5. Complete Polish & locator reporting (`T015`, `T016`).
