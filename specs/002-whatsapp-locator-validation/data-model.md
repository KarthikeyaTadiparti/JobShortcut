# Data Model: WhatsApp Locator Validation & Health Check

## 1. Domain Entities & Type Definitions

### 1.1 `ElementCategory` (Enum / String Union)
Categorizes WhatsApp Web UI components into logical functional groups.

```typescript
export type ElementCategory =
  | "auth"                 // Login cards, QR canvas, reload button
  | "navigation_search"    // Search input, search container, clear search button
  | "chat_list"            // Chat list pane, chat row, title span, unread badge
  | "conversation_header"  // Active conversation header container, chat title, back button
  | "messages"             // Message container, message list panel, copyable text, selectable text
  | "date_headers"         // Date divider spans (Today, Yesterday, date formats)
  | "links";               // Hyperlink anchors (a[href]), plain URL regex pattern
```

---

### 1.2 `LocatorDefinition`
Defines the primary selector and prioritized fallback selectors for a single WhatsApp Web UI component.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Unique camelCase or snake_case identifier (e.g. `chatListSearchInput`) |
| `name` | `string` | Yes | Human-readable label for step reporting (e.g. "Chat List Search Input Box") |
| `category` | `ElementCategory` | Yes | Functional group for catalog organization |
| `description` | `string` | Yes | Purpose and context of the element in scraper workflows |
| `primary` | `string` | Yes | Current primary Playwright selector string |
| `fallbacks` | `string[]` | Yes | Ordered list of alternative fallback selector strings |
| `isOptional` | `boolean` | No | If true, absence is treated as warning/skip rather than hard test failure |
| `requiresParent` | `string` | No | Optional parent container selector scope (e.g. `#side` or `#main`) |

---

### 1.3 `LocatorValidationResult`
Captures the execution outcome of validating a single `LocatorDefinition`.

| Field | Type | Required | Description |
|---|---|---|---|
| `locatorId` | `string` | Yes | Reference to `LocatorDefinition.id` |
| `locatorName` | `string` | Yes | Reference to `LocatorDefinition.name` |
| `status` | `'OPERATIONAL' \| 'DEGRADED' \| 'BROKEN' \| 'SKIPPED'` | Yes | Result status |
| `workingSelector` | `string \| null` | Yes | The selector that successfully resolved and passed visibility check |
| `primaryPassed` | `boolean` | Yes | Whether the primary selector passed |
| `testedFallbacks` | `Array<{ selector: string; passed: boolean; durationMs: number }>` | Yes | Telemetry of fallback selector attempts |
| `executionTimeMs` | `number` | Yes | Duration taken to validate the locator |
| `error` | `string` | No | Failure message if broken |

---

### 1.4 `ValidationRunSummary`
Aggregates overall health statistics across all tested locators in a suite execution.

| Field | Type | Required | Description |
|---|---|---|---|
| `suite` | `'auth' \| 'chat' \| 'all'` | Yes | Executed test suite |
| `timestamp` | `string` | Yes | ISO 8601 execution timestamp |
| `totalLocators` | `number` | Yes | Total locator definitions evaluated |
| `operationalCount` | `number` | Yes | Count of locators passing via primary selector |
| `degradedCount` | `number` | Yes | Count of locators where primary failed but fallback succeeded |
| `brokenCount` | `number` | Yes | Count of locators where all selectors failed |
| `skippedCount` | `number` | Yes | Count of optional locators skipped |
| `results` | `LocatorValidationResult[]` | Yes | Detailed array of individual results |

---

## 2. Complete Locator Catalog Mapping

| Category | Locator ID | Primary Selector | Key Fallback Selectors |
|---|---|---|---|
| **Auth** | `qrCanvas` | `canvas[aria-label*="Scan"]` | `[data-testid="qrcode"]`, `div[data-ref] canvas`, `canvas` |
| **Auth** | `loginInstructions` | `[data-testid="intro-title"]` | `h1`, `div[data-testid="qrcode"] + div` |
| **Search** | `chatListSearchInput` | `#side div[data-testid="chat-list-search-container"] [contenteditable="true"]` | `#side div[data-testid="chat-list-search-container"] input`, `#side [data-tab="3"]`, `#side [role="textbox"]` |
| **Search** | `chatListSearchClearBtn` | `#side [data-testid="chat-list-search-container"] button` | `#side button[aria-label="End icon button"]`, `#side button[aria-label="Cancel search"]`, `#side [data-testid="search-cancel-btn"]` |
| **Chat List** | `chatListContainer` | `#pane-side` | `[data-testid="chat-list"]`, `[aria-label*="Chat list"]` |
| **Chat List** | `chatListRow` | `#pane-side [role="row"]` | `[data-testid="chat-list"] [role="row"]`, `[data-testid^="list-item-"]` |
| **Chat List** | `chatRowTitle` | `[data-testid="cell-frame-title"] span` | `span[title]`, `[data-testid="cell-frame-title"]` |
| **Chat List** | `chatRowUnreadBadge` | `[data-testid="icon-unread-count"]` | `span[role="status"]`, `span.x140p0ai` |
| **Header** | `conversationHeader` | `#main header` | `#main [data-testid="conversation-header"]` |
| **Header** | `conversationChatTitle` | `#main [data-testid="conversation-info-header-chat-title"]` | `#main [data-testid="conversation-header"] h2`, `#main header span[title]` |
| **Messages** | `conversationPanelMessages` | `#main [data-testid="conversation-panel-messages"]` | `#main [data-testid="conversation-panel-body"] [tabindex="0"]`, `#main .copyable-area [tabindex="0"]`, `#main .copyable-area` |
| **Messages** | `messageContainer` | `#main div[data-testid="msg-container"]` | `#main div[data-testid^="conv-msg-"]`, `#main div.copyable-text` |
| **Messages** | `copyableText` | `#main div.copyable-text` | `#main [data-pre-plain-text]`, `#main [data-testid="selectable-text"]` |
| **Date** | `dateDividerSpan` | `#main div[tabindex='-1'] span[dir='auto']` | `#main span[dir='auto']` |
| **Links** | `messageAnchorLink` | `#main [data-testid="msg-container"] a[href]` | `#main div.copyable-text a[href]`, `#main a[href]` |
