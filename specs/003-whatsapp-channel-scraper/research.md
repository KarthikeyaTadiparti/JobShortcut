# Technical Research & Architecture Decisions: WhatsApp Channels Integration

**Feature**: WhatsApp Channels Job Link Extraction (`003-whatsapp-channel-scraper`)  
**Date**: 2026-09-27  
**Status**: Completed

---

## 1. Unified Source Configuration & Type Safety

### Decision
Unify WhatsApp scraping sources into a tagged configuration schema `WhatsAppSourceConfig` with `type: 'group' | 'channel'`, while providing typed defaults `DEFAULT_WHATSAPP_SOURCES`, `DEFAULT_WHATSAPP_GROUPS`, and `DEFAULT_WHATSAPP_CHANNELS`.

```typescript
export type WhatsAppSourceType = 'group' | 'channel';

export interface WhatsAppSourceConfig {
    type: WhatsAppSourceType;
    name: string; // Unified name (maps to groupName or channelName)
    targetDomain: string;
    allowedDomains?: string[];
    enabled?: boolean;
}
```

### Rationale
- Complies with User Clarification Q3 to combine groups and channels into a single unified array tagged by source type (`type: 'group' | 'channel'`).
- Preserves full backward compatibility for existing code calling `DEFAULT_WHATSAPP_GROUPS` and `WhatsAppGroupConfig`.
- Enables the unified scraper loop in `whatsapp_scraper.ts` to iterate through any combination of groups and channels seamlessly.

### Alternatives Considered
- *Separate standalone channel scraper module*: Rejected per user requirement: "not a separate automation. so the channels job link extraction also should be done in the workflow."
- *Separate group vs channel arrays passed in options*: Rejected in favor of a clean unified sources pipeline that can easily be filtered or iterated in order.

---

## 2. WhatsApp Web Channel Navigation Strategy

### Decision
Navigate to the dedicated **Channels / Updates** navigation tab in WhatsApp Web's sidebar rail before locating each channel, utilizing multi-level resilient locators for the Channels tab and channel list items.

```text
1. Check if active view is already Channels tab.
2. If in Chats view, click Channels tab icon in the left navigation rail:
   - Locator candidates:
     - `button[aria-label="Channels"]`
     - `button[aria-label="Updates"]`
     - `span[data-icon="newsletter"]`
     - `span[data-icon="updates"]`
     - `[data-testid="menu-bar-chats-channels"]`
3. Wait for Channels list sidebar panel to settle.
4. Locate the target channel by name in the followed channels list (or filter search inside Channels view).
5. Click to open channel message feed in `#main`.
```

### Rationale
- Confirmed during Clarification Q2 (Option B: "Always navigate directly via the Channels / Updates sidebar tab and select from followed channels").
- WhatsApp Web categorizes broadcast newsletters under the Channels rail item. Direct navigation prevents chat list clutter from obscuring broadcast channels.

### Alternatives Considered
- *Global search bar lookup*: May match non-followed public directory results or external contacts instead of the user's subscribed channels.

---

## 3. Active Search & Filter Input State Sanitization

### Decision
Ensure any active search or filter input is cleared **immediately prior to typing** a new group or channel name:
1. Press `Escape` to dismiss any active search popup or clear query.
2. If clear button (`Cancel search` / `[data-icon="x"]`) is visible, click it.
3. Call `fill('')` on the search input locator (with fallback to select-all `Backspace`).

```typescript
export async function clearActiveSearchInput(page: Page): Promise<void> {
    // 1. Press Escape to dismiss active search overlays or clear search box
    await page.keyboard.press('Escape');
    await randomJitter(150, 300);

    // 2. Locate and click any search clear button (Cancel search / clear text icon)
    const clearBtn = page.locator('button[aria-label="Cancel search"], [data-icon="x"], [data-icon="x-alt"], [data-testid="search-cancel"]');
    if (await clearBtn.first().isVisible({ timeout: 500 }).catch(() => false)) {
        await clearBtn.first().click().catch(() => {});
    }

    // 3. If a search input still contains text, select all and delete
    const searchInputs = page.locator('[data-testid="chat-list-search"], [contenteditable="true"][data-tab="3"], input[type="text"][aria-label*="Search"]');
    if (await searchInputs.first().isVisible({ timeout: 500 }).catch(() => false)) {
        await searchInputs.first().fill('').catch(async () => {
            await searchInputs.first().focus().catch(() => {});
            await page.keyboard.press('ControlOrMeta+A').catch(() => {});
            await page.keyboard.press('Backspace').catch(() => {});
        });
    }
}
```

### Rationale
- Prevents text concatenation errors (e.g. searching `"Jobcode 37Fresher Openings"`) caused by retained search box strings.
- Guarantees search input isolation before each item is looked up.

---

## 4. Broadcast Message Feed Extraction & Virtualization

### Decision
Adapt the proven `evaluateConversationMessages` and `collectAllScopeMessages` virtualization collector from `whatsapp_scraper.ts` for channel broadcast feeds:
1. Channels use identical message bubble container selectors (`[data-testid="msg-container"]`, `div[role="row"]`, `.message-in`, `.copyable-text`).
2. Extract all hyperlinks from message bodies, text nodes, and rich preview anchors (`a[href]`), normalizing relative links and filtering against `allowedDomains`.
3. Read-only channel safety: Channels do not have message composition bars; locators must not rely on `#main footer` or chat input boxes.

### Rationale
- Confirmed from live WhatsApp Web UI: channels render numeric unread message badges (green circular badge with count) identical to group chats.
- Ensures 100% extraction parity between group and channel feeds: in `unread` mode, the exact badge count $N$ is read, and the last $N$ unread messages are harvested.
- Handles virtualization (scrolling up/down to capture multi-message batches under `Today`, `Yesterday`, or `Unread` scopes).
- Complies with Constitution Principle I (strict domain whitelisting and direct apply link preservation) and Principle II (resilient headless extraction).

---

## 5. Unified Real-Time SSE Progress & Event Streaming

### Decision
Extend the Server-Sent Events (SSE) contract in `whatsapp-types.ts` to emit granular source events while preserving backward-compatible event listeners:
- `source_start` / `group_start`: indicates current source name, type (`group` | `channel`), target domain, index, and total count.
- `source_progress` / `group_progress`: real-time log messages and unread/message count indicators.
- `source_complete` / `group_complete`: per-source result summary (extracted links, status, warnings).
- `done`: aggregated final result containing total sources, groups breakdown, channels breakdown, and unified deduplicated URLs list.

### Rationale
- Frontend Admin Scraper UI immediately displays live progress as it processes groups followed by channels in a single import run.
- Deduplicates URLs across all sources so the textarea receives only unique, clean job URLs.
