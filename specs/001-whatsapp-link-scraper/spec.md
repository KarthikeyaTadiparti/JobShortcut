# Feature Specification: WhatsApp Job Link Scraper

**Feature Branch**: `001-whatsapp-link-scraper`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "WhatsApp Job Link Scraper — Visual admin flow with Import button populating URL input, session QR verification, search bar group lookup, scope selection (Today/Yesterday/Unread), and virtualization-safe link extraction."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One-Click WhatsApp Import to Admin Scraper Box (Priority: P1)

An administrator visiting the Admin Scraper page clicks the dedicated "Import from WhatsApp" button, selecting their desired extraction scope (Unread, Today, or Yesterday). Clicking this button immediately launches the end-to-end extraction workflow: the system connects to WhatsApp Web (using an existing session or prompting for QR authentication), searches configured groups via the search bar, extracts valid job links matching configured domains, and automatically populates the extracted links into the URLs input/description textarea box for immediate verification and batch scraping.

**Why this priority**: Core end-to-end user experience. Replaces manual copy-pasting of links from multiple WhatsApp groups into the scraper dashboard with a single automated workflow triggered by a single button click.

**Independent Test**: Can be tested by clicking the "Import from WhatsApp" button on the Admin Scraper page with an active WhatsApp session, selecting "Unread", and verifying that all target domain job links from unread messages in configured groups are extracted and automatically pasted into the URL input textarea.

**Acceptance Scenarios**:

1. **Given** an authenticated admin is on the Scraper page, **When** they click the "Import from WhatsApp" button with scope "Unread", **Then** the extraction workflow executes across configured groups and automatically populates the resulting unique URLs directly into the URL input box.
2. **Given** no active WhatsApp Web session exists, **When** the admin clicks the "Import from WhatsApp" button, **Then** the system presents the WhatsApp QR code login interface, allowing the admin to scan and authenticate before proceeding with extraction.
3. **Given** the extraction finishes with 8 unique job links, **When** the workflow concludes, **Then** the URL textarea is filled with all 8 newline-separated URLs ready for scraping, accompanied by a success notification.

---

### User Story 2 - Configurable Timeframe & Scope Filtering (Today, Yesterday, Unread) (Priority: P2)

An administrator needs flexibility to harvest job postings based on different operational scenarios: daily batch runs (extracting all links from "Today"), weekend catch-ups ("Yesterday"), or real-time incremental pulls ("Unread" only).

**Why this priority**: Provides essential operational flexibility beyond strict unread counts, enabling admins to re-fetch today's or yesterday's postings even after messages have already been viewed or marked as read.

**Independent Test**: Can be tested by selecting "Today" or "Yesterday" filter mode on a group with existing historical messages and verifying that links are extracted accurately from messages within that designated date boundary.

**Acceptance Scenarios**:

1. **Given** the admin selects "Today", **When** extraction runs, **Then** the scraper inspects messages sent during the current calendar day and extracts all matching job URLs.
2. **Given** the admin selects "Yesterday", **When** extraction runs, **Then** the scraper inspects messages sent during the previous calendar day and extracts all matching job URLs.
3. **Given** the admin selects "Unread", **When** extraction runs, **Then** only messages within the detected unread count window ($N$ last messages) are processed.

---

### User Story 3 - Resilient Group Search & Virtualization Handling (Priority: P3)

An administrator has dozens of chat groups in their WhatsApp account. Instead of relying on groups being visible in the top chat list viewport, the system searches each group name using the WhatsApp search bar, opens the conversation, navigates message history, and safely handles message virtualization without missing unread items or crashing.

**Why this priority**: Ensures robust operation regardless of chat list order, active conversations, or large volume message virtualization in the web client.

**Independent Test**: Can be tested with configured groups located deep in the chat archive by verifying the search bar accurately finds and opens each group, and confirming that virtualization checks validate rendered message counts before harvesting.

**Acceptance Scenarios**:

1. **Given** a configured group is not visible in the initial chat viewport, **When** the scraper searches the group name in the search bar, **Then** the search result is located, selected, and opened.
2. **Given** a group has high unread volume exceeding initially rendered messages, **When** evaluated, **Then** the system scrolls to render the full required message window or logs a clear warning without extracting partial/incorrect data.
3. **Given** multiple configured groups are processed, **When** one group encounters a search or loading error, **Then** the system logs the issue and seamlessly continues to the next configured group.

---

### Edge Cases

- **Session Expiration / Missing Login**: If no active session exists, the system gracefully triggers the QR code authentication view rather than failing with a network or selector error.
- **Group Not Found via Search**: If searching a configured group returns zero matching chats, the system logs a descriptive warning (e.g., `"Group 'Jobcode 37' not found"`) and proceeds with the next group.
- **Zero Messages in Scope**: If a group has no unread messages (in Unread mode) or no messages matching Today/Yesterday, the system skips link extraction for that group and records zero links.
- **Mixed Domain and Irrelevant Links**: If messages contain social media links, image attachments, or cross-domain URLs, only hyperlinks strictly matching the group's configured domain filter are extracted.
- **Duplicate URLs Across Messages/Groups**: Identical job URLs posted across multiple messages or shared in multiple groups are deduplicated so the final input box receives only unique URLs.
- **Long Message Virtualization Delays**: If message rendering is delayed during scroll operations, the system applies safe scroll-settle timeouts before evaluating message locators.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a dedicated "Import from WhatsApp" button on the Admin Scraper page that immediately triggers the automated extraction workflow upon being clicked.
- **FR-002**: System MUST allow administrators to select an extraction scope filter: `Unread`, `Today`, or `Yesterday`.
- **FR-003**: System MUST check for an active WhatsApp Web session prior to scraping.
- **FR-004**: System MUST display or initiate a QR code authentication flow if no active session is detected, allowing the admin to scan and authenticate.
- **FR-005**: System MUST maintain a configurable mapping of target group names to their respective domain filters in project configuration/constants.
- **FR-006**: System MUST search each configured group name using the WhatsApp Web search bar to locate and open the target chat.
- **FR-007**: System MUST support extraction based on the selected scope:
  - In `Unread` mode: detect the unread message count $N$, scroll to bottom, and extract links exclusively from the last $N$ unread messages.
  - In `Today` mode: identify and extract links from all messages sent on the current date.
  - In `Yesterday` mode: identify and extract links from all messages sent on the previous date.
- **FR-008**: System MUST safely handle message virtualization by verifying rendered message count against the required scope before link extraction.
- **FR-009**: System MUST filter hyperlinks to include only those matching the group's designated domain filter.
- **FR-010**: System MUST normalize all extracted relative paths into well-formed absolute URLs.
- **FR-011**: System MUST deduplicate all harvested job URLs into a single unique array.
- **FR-012**: System MUST automatically copy/populate the aggregated unique URLs into the URLs input/description textarea on the Admin Scraper page upon completion.
- **FR-013**: System MUST isolate failures per group, ensuring search or extraction issues in one group do not terminate the entire multi-group workflow.
- **FR-014**: System MUST provide real-time status feedback and logs to the admin UI throughout the authentication, search, and extraction lifecycle.

### Key Entities *(include if feature involves data)*

- **Extraction Scope Filter**: Enumeration representing the target message timeframe (`Unread`, `Today`, `Yesterday`).
- **WhatsApp Group Mapping**: Configuration entity pairing `groupName` (exact search string) with `targetDomain` (allowed domain filter string, e.g., `jobcode.in`).
- **Message Extraction Window**: Set of messages identified within a group matching the selected scope criteria.
- **Extracted Job Link**: A verified, absolute, deduplicated job URL ready for batch scraping.
- **Import Session Result**: Operational result containing status, processed groups count, skipped groups count, warnings/errors encountered, and the final list of extracted URLs.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of extracted URLs match their respective group's configured domain filter.
- **SC-002**: 100% of harvested links are automatically populated into the Admin Scraper URL input box upon workflow completion.
- **SC-003**: 0% extraction of links outside the selected scope window (no read messages in Unread mode, no out-of-date messages in Today/Yesterday modes).
- **SC-004**: 100% duplicate elimination across the final imported link list.
- **SC-005**: Groups with zero matching messages in scope are evaluated and skipped in under 3 seconds per group.
- **SC-006**: When no active session exists, QR login prompt appears within 5 seconds of clicking Import.
- **SC-007**: Individual group search failures or virtualization mismatches log actionable diagnostics without terminating remaining group imports.

## Assumptions

- Admin operates from a desktop browser with access to the Admin Scraper dashboard.
- Configured group names match exact search terms recognized by the WhatsApp Web search engine.
- WhatsApp Web session storage or persistent browser context can be utilized to maintain login state across scraping sessions.
- Target job postings use standard web hyperlinks within message text or previews.
