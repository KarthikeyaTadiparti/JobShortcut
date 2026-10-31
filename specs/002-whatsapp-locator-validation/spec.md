# Feature Specification: WhatsApp Locator Validation & Health Check Test Suite

**Feature Branch**: `002-whatsapp-locator-validation`

**Created**: 2026-09-26

**Status**: Draft

**Input**: User description: "the whatsapp automation feature is working fine. But for the future purpose i want a playwrigth testing that tests if each locator that is being used by @[backend/src/scraper/whatsapp_scraper.ts] and @[backend/src/scraper/whatsapp_session.ts] are working or whatsapp has changed the locators. This test should help me identify the changed locators. and I want the tests to run for primary locator only and when primary locator is failed then the fallback locators are used to tested. so that i can switch to fallback locators if they are working. I want the testcases to executes with screenshot, video, traces. and i want the trace steps to be clear and also highlight the element in the testcases. and also use step to describe the what are we verifying. Create a centralized file which holds all locator and along with fallback locator and use these centralized locators only in the tests. right don't wire these locators to the whatsapp scraper. we can do it later"

## Clarifications

### Session 2026-09-26

- Q: Where should the centralized WhatsApp locator registry file be located within the codebase? → A: `backend/src/config/whatsapp_locators.ts`
- Q: How should the locator validation test suite handle WhatsApp Web authentication when executing tests? → A: Separate into two distinct test suites: `auth-locators.spec.ts` (fresh unauthenticated session testing QR/login screen) and `chat-locators.spec.ts` (persistent authenticated session testing chat list, search, headers, messages, and links)
- Q: How should DOM element highlighting be visually rendered before performing assertions during test execution? → A: Inject a temporary high-contrast glowing outline (3px solid #00E676 with box-shadow) and 300ms visual dwell before assertion for crisp trace and video visibility

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Centralized Locator Definitions & Single-Element Health Validation (Priority: P1)

As an engineer maintaining WhatsApp automation pipelines, I want a centralized locator registry at `backend/src/config/whatsapp_locators.ts` and automated validation test suites that verify individual UI locators across WhatsApp Web pages, so that I can immediately detect when WhatsApp Web changes its DOM selectors before scraper jobs fail in production.

**Why this priority**: WhatsApp Web frequently updates its internal DOM attributes and classes. Having a structured catalog of primary and fallback locators verified independently is the foundational requirement for long-term automation stability.

**Independent Test**: Can be tested by running the validation suites against unauthenticated and authenticated WhatsApp Web sessions, verifying that every primary locator defined in the catalog is evaluated and reported with clear pass/fail status per element.

**Acceptance Scenarios**:

1. **Given** an unauthenticated session displaying the login screen, **When** running `auth-locators.spec.ts`, **Then** the QR code canvas, instruction headers, and login screen container locators are verified and reported.
2. **Given** an authenticated session with active chats, **When** running `chat-locators.spec.ts`, **Then** search inputs, chat list rows, conversation headers, message containers, copyable text, date dividers, and embedded links are verified.
3. **Given** a centralized registry in `backend/src/config/whatsapp_locators.ts`, **When** any locator definition is evaluated, **Then** the primary locator is checked for presence and visibility without throwing uncaught test execution crashes.

---

### User Story 2 - Fallback Cascade & Change Diagnostic Reporting (Priority: P2)

As a developer troubleshooting UI breakage, I want the test runner to test fallback selectors only when a primary selector fails, reporting which specific selector failed and which fallback worked, so that I can quickly switch production code to an active alternative.

**Why this priority**: When WhatsApp updates markup, knowing immediately if a configured fallback selector already works saves hours of reverse-engineering and reduces system downtime.

**Independent Test**: Can be tested by simulating or encountering a modified primary selector; the test logs the primary failure, triggers fallback verification, and outputs a diagnostic summary identifying valid fallback replacements.

**Acceptance Scenarios**:

1. **Given** a primary locator that matches an element on the screen, **When** the locator validation step executes, **Then** the primary locator passes and fallback locators for that element are skipped to optimize test execution time.
2. **Given** a primary locator that fails to resolve or is detached, **When** the validation step detects the failure, **Then** the test sequentially attempts each defined fallback locator for that element, records whether any fallback successfully matched, and marks the primary status as drifted/changed.
3. **Given** both primary and all fallback locators fail for an element, **When** validation completes, **Then** the test reports that element as broken with zero working selectors.

---

### User Story 3 - Visual Inspection, Step Traces, Element Highlighting & Artifacts (Priority: P3)

As a QA or automation engineer reviewing test results, I want detailed test step logs with clear descriptions, visual element highlighting before assertion, and recorded screenshots, videos, and execution traces, so that I can visually verify element targeting and debug failures.

**Why this priority**: Visual traces and element highlighting make it effortless to confirm whether a matched selector actually targeted the intended user-visible component or an unintended overlapping container.

**Independent Test**: Can be tested by executing the test suite and inspecting the generated test artifacts directory for screenshot captures, video recordings, trace archives, and step-by-step descriptions showing highlighted elements.

**Acceptance Scenarios**:

1. **Given** a running validation test, **When** each verification step begins, **Then** a descriptive step label clearly states what element and capability are being verified (e.g., "Verifying Search Input Box", "Verifying Unread Count Badge").
2. **Given** an element located on the page, **When** it is being asserted, **Then** the element is visually highlighted on screen with a high-contrast glowing outline (`3px solid #00E676`) and held for a 300ms visual dwell so that the action is vividly captured in screenshots, video, and trace recordings.
3. **Given** a completed test run, **When** inspecting the test output artifacts, **Then** full execution traces, screenshots of inspected elements, and video recordings are persisted for subsequent analysis.

---

### Edge Cases

- **Authentication State Divergence**: If `chat-locators.spec.ts` is launched without a valid authenticated session in `backend/.whatsapp_session`, the test must fail fast with an actionable diagnostic message instructing the user to authenticate first, rather than hanging indefinitely.
- **Dynamic Content & Virtual Lists**: WhatsApp Web virtualizes chat and message lists, rendering DOM elements only when visible. If an element (like an unread badge or date divider) is absent due to data conditions rather than broken selectors, the test must differentiate between "structural selector missing" vs. "conditional test data not present".
- **Search Result Latency & Debounce**: WhatsApp Web filters search results asynchronously. Tests validating search result items must wait for debounce and network/render settlement before declaring locator failure.
- **Production Isolation**: The locator definitions created in this feature MUST remain self-contained in `backend/src/config/whatsapp_locators.ts` and test files without modifying or prematurely binding to live scraper production code in `backend/src/scraper/whatsapp_scraper.ts` or `whatsapp_session.ts`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a centralized catalog at `backend/src/config/whatsapp_locators.ts` defining all WhatsApp Web UI locators, organizing each item by component group (Authentication, Navigation/Search, Chat List, Conversation Header, Message History, Date Headers, Links, Search Clear Controls).
- **FR-002**: For each catalog item, the system MUST define a `primary` locator and an ordered array of `fallback` locators.
- **FR-003**: The test framework MUST provide two dedicated test suites: `auth-locators.spec.ts` (using isolated fresh browser context) and `chat-locators.spec.ts` (using persistent browser profile `backend/.whatsapp_session`).
- **FR-004**: The validation test runner MUST evaluate the `primary` locator first for every element under test.
- **FR-005**: If and only if a `primary` locator fails to resolve or is not visible, the test suite MUST sequentially evaluate each defined `fallback` locator.
- **FR-006**: The test suite MUST generate a clear diagnostic summary indicating the status of each element: `Operational (Primary)`, `Degraded (Primary Failed, Fallback Operational)`, or `Broken (All Failed)`.
- **FR-007**: Each test verification block MUST be structured with descriptive step labels explaining the specific UI element and behavior being verified.
- **FR-008**: When testing an element, the test runner MUST visually highlight the targeted DOM node on the active page (via a high-contrast glowing outline `3px solid #00E676` with a 300ms visual dwell) before performing assertions, ensuring visual prominence in recorded artifacts.
- **FR-009**: The test execution MUST produce full visual artifacts including screenshots, video recordings, and step-level execution traces with network and DOM snapshot capabilities.
- **FR-010**: The test suite and centralized locator catalog MUST NOT modify or wire into the production scraper modules (`whatsapp_scraper.ts` or `whatsapp_session.ts`) during this phase.
- **FR-011**: The test suite MUST support both headless and headed execution modes for flexible CI/local debugging.

### Key Entities

- **LocatorDefinition**: Represents a target UI component on WhatsApp Web. Contains `name`, `category`, `description`, `primary` selector/strategy, `fallbacks` list of selectors/strategies, and `isOptional` or `requiresState` metadata.
- **LocatorValidationResult**: Represents the health status of a single `LocatorDefinition` after test execution. Contains `name`, `primaryStatus` (passed/failed), `activeSelector` (the one that worked), `testedFallbacks` details, and `status` (`healthy` | `degraded` | `failed`).
- **ValidationRunSummary**: Aggregates overall suite execution results, listing total locators tested, count of healthy primary selectors, count of degraded selectors requiring selector updates, and count of critical broken selectors.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the UI locators currently referenced in WhatsApp session and scraper modules are cataloged into `backend/src/config/whatsapp_locators.ts` with designated primary and fallback selectors.
- **SC-002**: Test suite executes a full locator health check in under 60 seconds when run against an active session.
- **SC-003**: In the event of a simulated primary selector change, the test suite detects the breakage and identifies a working fallback within 5 seconds without crashing the entire test suite.
- **SC-004**: 100% of test runs produce consumable trace files, videos, and screenshots demonstrating element highlights and step descriptions.
- **SC-005**: Zero modifications are introduced to existing production scraper behavior or runtime dependencies during this test suite implementation.

## Assumptions

- **Session Availability**: The test suite assumes access to either a persistent authenticated WhatsApp profile in `backend/.whatsapp_session` for `chat-locators.spec.ts` or a standard unauthenticated state for `auth-locators.spec.ts`.
- **Test Runner Framework**: The test suite utilizes standard Playwright test runner capabilities (`@playwright/test`) with trace, video, screenshot, and step annotations configured.
- **Independent Execution**: Tests can be triggered via a dedicated npm script without starting or affecting the backend web server or database.
- **Future Wiring**: The centralized locator definitions in `backend/src/config/whatsapp_locators.ts` will be imported and consumed by the production scraper modules in a subsequent dedicated refactor task.
