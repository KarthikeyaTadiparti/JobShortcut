# Feature Specification: WhatsApp Channels Job Link Extraction

**Feature Branch**: `003-whatsapp-channel-scraper`

**Created**: 2026-09-27

**Status**: Draft

**Input**: User description: "Like the whatsapp group job links automation, i want the same for whatsapp channels. but not a separate automation. so the channels job link extraction also should be done in the workflow. and here is the details of the channel. export const DEFAULT_WHATSAPP_CHANNELS = [{ channelName: 'Found The Job Alerts', targetDomain: 'foundthejob.com', allowedDomains: ['foundthejob.com'], enabled: true }, { channelName: 'Freshershunt', targetDomain: 'freshershunt.in', allowedDomains: ['freshershunt.in'], enabled: true }, { channelName: 'Job Update With FoundtheJob', targetDomain: 'foundthejob.com', allowedDomains: ['foundthejob.com'], enabled: true }]"

## Clarifications

### Session 2026-09-27
- Q: How should the "Unread" extraction scope determine which messages to process in WhatsApp Channels? → A: Confirmed from WhatsApp Web UI inspection: channels display numeric unread message count badges (green circular badge) identical to groups. In "Unread" mode, extract the numeric count $N$ from the channel badge and harvest the last $N$ messages.
- Q: How should the scraper locate and open WhatsApp Channels within WhatsApp Web? → A: Always navigate directly via the Channels / Updates sidebar tab and select from followed channels.
- Q: How should WhatsApp channel configuration presets be organized in the backend codebase relative to the existing group configurations? → A: Combine groups and channels into a single unified array tagged by source type (`type: 'group' | 'channel'`).
- Q: How should search inputs be handled between group or channel lookups? → A: Clear any active search or filter input before typing the group or channel name (using Escape key, clear button, or select-all backspace).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unified Group & Channel Automated Import (Priority: P1)

An administrator visits the Admin Scraper dashboard and triggers the "Import from WhatsApp" workflow with their chosen extraction scope (Unread, Today, or Yesterday). As part of this single consolidated run, the system automatically processes both configured WhatsApp groups and configured WhatsApp channels sequentially, extracting all matching job links from both sources without requiring a separate automation or manual navigation, and aggregates all unique URLs into the scraper input box for direct batch processing.

**Why this priority**: Core user journey that extends the existing WhatsApp link import pipeline to support broadcast channels seamlessly within the same unified workflow, saving operational time and eliminating disconnected tools.

**Independent Test**: Can be tested by triggering the WhatsApp import workflow with both groups and channels configured and enabled, verifying that job links from both groups and channels are extracted, combined, deduplicated, and populated into the admin URL input box upon completion.

**Acceptance Scenarios**:

1. **Given** configured WhatsApp groups and channels are enabled, **When** the admin starts the WhatsApp import workflow, **Then** the workflow executes group extraction followed by channel extraction in a single continuous run.
2. **Given** both groups and channels contain valid job links within the chosen scope, **When** the workflow finishes, **Then** all harvested links from both sources are aggregated, deduplicated, and automatically populated into the URLs input textarea.
3. **Given** live progress tracking is active, **When** the workflow switches from group processing to channel processing, **Then** real-time status updates clearly display the current channel name and extraction progress.

---

### User Story 2 - Resilient WhatsApp Channel Navigation & Message Harvesting (Priority: P2)

An administrator has subscribed to multiple job alert channels. The system navigates to the dedicated Channels / Updates sidebar tab in WhatsApp Web, locates each followed channel (e.g., 'Found The Job Alerts', 'Freshershunt', 'Job Update With FoundtheJob'), opens the broadcast message feed, handles message virtualization, and extracts hyperlinks strictly matching the channel's allowed domain whitelist.

**Why this priority**: Ensures robust navigation and data integrity specifically tuned to WhatsApp Web broadcast channel layouts by accessing channels directly through the Channels sidebar section.

**Independent Test**: Can be tested by running the workflow with only channels enabled, verifying that the scraper switches to the Channels tab, opens each channel from the list, navigates message history, applies domain filtering, and extracts clean job URLs.

**Acceptance Scenarios**:

1. **Given** the scraper begins processing channels, **When** it transitions to channel extraction, **Then** it navigates directly to the Channels / Updates sidebar tab in WhatsApp Web and selects the target channel from followed channels.
2. **Given** a channel broadcast contains messages with mixed external links (e.g., telegram links, social media, ads) and allowed job portal links, **When** extraction occurs, **Then** only URLs matching the channel's configured allowed domains (e.g., `foundthejob.com`, `freshershunt.in`) are harvested.
3. **Given** a channel is empty, not found, or contains no new posts in scope, **When** processed, **Then** the system logs a non-fatal notification and proceeds smoothly to the next channel without stopping the overall workflow.

---

### User Story 3 - Scope-Aware Channel Message Filtering (Priority: P3)

An administrator needs consistent timeframe filtering across channels just like groups: extracting only new unread channel broadcasts (`Unread`), all posts from today (`Today`), or previous day's alerts (`Yesterday`).

**Why this priority**: Provides consistent filtering semantics across all ingestion sources so admins can perform predictable incremental or daily batch imports.

**Independent Test**: Can be tested by running extraction under "Today" or "Yesterday" scope on a channel with multi-day post history, verifying that only broadcast posts within that specific date boundary are evaluated for links.

**Acceptance Scenarios**:

1. **Given** the scope is set to "Today", **When** a channel is parsed, **Then** only broadcast messages timestamped with the current date are evaluated for job links.
2. **Given** the scope is set to "Yesterday", **When** a channel is parsed, **Then** only broadcast messages timestamped with the previous day are evaluated for job links.
3. **Given** the scope is set to "Unread", **When** a channel has unread message indicators, **Then** only messages within the unread window are processed.

---

### Edge Cases

- **Channel Not Found or Not Followed**: If a configured channel cannot be located in the Channels / Updates list, the system logs a descriptive warning (e.g., `"Channel 'Freshershunt' not found under Channels list"`) and continues to the remaining channels without crashing.
- **Broadcast Channel Read-Only View**: Unlike groups, channels do not have a message compose bar or group info panel. The locator and message extraction logic must adapt gracefully to channel-specific feed containers and message bubble structures.
- **Embedded Forwarded Links & Previews**: If channel updates contain link previews, rich cards, or shortened redirect links, the system extracts the canonical destination hyperlink or raw anchor href that matches the allowed domain list.
- **Overlapping Target Domains Across Channels & Groups**: If multiple channels or groups post links to the exact same job URL, duplicate links are deduplicated across the entire run so the final imported list contains unique URLs.
- **Zero New Broadcasts**: If all enabled channels have zero posts within the selected scope, the workflow completes normally with zero channel links added and reports a clear status summary.
- **Lingering Search / Filter Text**: If search or filter inputs retain characters from a prior item, the system forcefully clears the input buffer before and after searching to prevent query corruption.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST integrate WhatsApp channel link extraction directly into the existing WhatsApp import workflow rather than creating a separate disconnected process.
- **FR-002**: System MUST structure WhatsApp ingestion sources into a unified source list supporting both groups and channels tagged by source type (`type: 'group' | 'channel'`), including default channels:
  - `Found The Job Alerts` (type: `channel`, targetDomain: `foundthejob.com`, allowedDomains: `['foundthejob.com']`, enabled: `true`)
  - `Freshershunt` (type: `channel`, targetDomain: `freshershunt.in`, allowedDomains: `['freshershunt.in']`, enabled: `true`)
  - `Job Update With FoundtheJob` (type: `channel`, targetDomain: `foundthejob.com`, allowedDomains: `['foundthejob.com']`, enabled: `true`)
- **FR-003**: System MUST allow individual sources (groups or channels) to be enabled or disabled via configuration.
- **FR-004**: System MUST apply the user-selected extraction scope (`Unread`, `Today`, or `Yesterday`) consistently to both groups and channels during the workflow execution.
- **FR-005**: System MUST navigate directly to the Channels / Updates sidebar tab in WhatsApp Web to locate and open configured followed channels.
- **FR-006**: System MUST safely collect broadcast messages within the active scope, accounting for message feed virtualization and progressive loading.
- **FR-007**: System MUST validate and extract hyperlinks from channel messages strictly matching the channel's designated `allowedDomains` whitelist.
- **FR-008**: System MUST normalize all extracted channel links to canonical absolute URLs.
- **FR-009**: System MUST deduplicate all extracted links across both group and channel sources into a single unified URL list.
- **FR-010**: System MUST automatically populate the aggregated unique URLs from both groups and channels into the Admin Scraper URL input area upon workflow completion.
- **FR-011**: System MUST provide unified real-time progress events and logs detailing the progress of both group and channel extraction steps.
- **FR-012**: System MUST isolate errors per source item, ensuring failure to find or parse one channel or group does not interrupt the extraction of remaining sources.
- **FR-013**: System MUST clear any active search bar input or filter text before typing a new group or channel lookup (using Escape key, clear button, or select-all backspace) to ensure a clean search state.

### Key Entities *(include if feature involves data)*

- **WhatsApp Source Configuration**: Unified configuration entity with `type` (`'group' | 'channel'`), `name` / `channelName` / `groupName` (exact lookup name), `targetDomain` (primary domain), `allowedDomains` (whitelist of accepted link domains), and `enabled` (boolean toggle).
- **Source Scrape Result**: Operational summary containing source name, `type` (`group` or `channel`), `status` (`success`, `skipped`, `failed`), `messagesProcessed`, `extractedLinks` (list of URLs), and optional error message.
- **Unified WhatsApp Import Result**: Complete aggregation containing overall execution status, processed groups count, processed channels count, breakdown of per-source results, and the combined deduplicated list of URLs.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of links extracted from configured channels match their respective channel's allowed domain whitelist.
- **SC-002**: 100% of unique links extracted from both groups and channels are aggregated and automatically populated into the Admin Scraper URL input box upon workflow completion.
- **SC-003**: 100% deduplication of overlapping URLs across all group and channel sources in the final imported list.
- **SC-004**: Channel extraction executes within the existing single-click import workflow without requiring secondary user actions.
- **SC-005**: Failure or absence of an individual channel resolves within 5 seconds with an informative log and does not prevent remaining channels or groups from being processed.
- **SC-006**: 0% extraction of broadcast messages outside the specified timeframe scope (`Unread`, `Today`, `Yesterday`).
- **SC-007**: 0% search lookup failures caused by stale search text retention across sequential group or channel transitions.

## Assumptions

- The WhatsApp Web user account is already following/subscribed to the target broadcast channels so they appear in the Channels / Updates sidebar tab.
- Channel messages contain standard text hyperlinks or hyperlinked preview cards pointing to target job domains.
- The existing WhatsApp session management (QR authentication, persistent browser context) is reused across both group and channel scraping operations.
- Administrators can continue to run the import workflow from the Admin Scraper page under the existing UI flow.
