# Research: WhatsApp Job Link Scraper

## 1. Playwright Browser Context & WhatsApp Web Session Management

### Decision
Use Playwright's `chromium.launchPersistentContext(userDataDir, ...)` pointing to a dedicated local directory (e.g. `backend/.whatsapp_session/` configured in `.gitignore`).

### Rationale
- **Persistent Context**: Storing the browser session directly in a dedicated profile directory preserves IndexedDB, local storage, cookies, and service workers across runs, preventing frequent WhatsApp Web session logouts and eliminating the need to scan QR codes on every run.
- **Authentication State Detection**: When navigating to `https://web.whatsapp.com`, the scraper monitors for either:
  1. `[data-testid="chat-list"]` (authenticated and ready)
  2. `canvas[aria-label="Scan me!"]` or `[data-testid="qrcode"]` / QR container (unauthenticated, requires QR scan)
- **QR Code Streaming**: If unauthenticated, capture a screenshot / base64 image of the QR container and stream it via Server-Sent Events (SSE) to the admin UI, polling/waiting until `[data-testid="chat-list"]` appears (or timeout).

### Alternatives Considered
- `storageState.json`: Only saves cookies and local storage, but WhatsApp Web relies heavily on IndexedDB for cryptographic session keys, which causes `storageState.json` to fail or quickly invalidate.
- Third-party wrapper libraries (like `whatsapp-web.js` / Baileys): Violate project guidelines to use Playwright headless scraping and introduce unstable Node.js protocol reverse-engineering dependencies that frequently break with WhatsApp protocol updates.

---

## 2. WhatsApp Web DOM Selectors & Group Lookup

### Decision
Rely strictly on semantic locators, `data-testid` prefixes, and exact visible text, avoiding dynamic/generated CSS classes (such as `.x1n2onr6`, `.x78zum5`).

### DOM Locators & Search Pattern
1. **Search Bar**:
   - Locator: `[data-testid="chat-list-search"]` or `[role="textbox"][contenteditable="true"]` in search container.
   - Action: Click search bar, type `groupName`, wait for search results in `[data-testid="chat-list"]` or search results container.
   - Selection: `page.locator('[data-testid="chat-list"] [role="row"]').filter({ has: page.getByText(groupName, { exact: true }) })`.
   - Cleanup: Click search clear button `[data-testid="x-alt"]` or press Escape to reset search state between groups.

2. **Unread Count Detection**:
   - Locator: `groupRow.getByTestId('icon-unread-count')`.
   - Extraction: Read `aria-label` attribute (e.g., `"5 unread messages"` or `"1 unread message"`).
   - Parsing: Regular expression `/\d+/` to extract numeric count $N$.
   - Skip rule: If `unreadIndicator.count() === 0`, skip group in `Unread` mode.

3. **Conversation Message Panel & Virtualization**:
   - Container: `page.getByTestId('conversation-panel-wrapper')`.
   - Scroll Area: `conversation.getByTestId('conversation-panel-messages')`.
   - Individual Messages: `conversation.locator('[data-testid^="conv-msg-"]')`.

### Alternatives Considered
- Direct chat URL navigation (`https://web.whatsapp.com/accept?code=...` or phone link): WhatsApp Web does not provide reliable deep-linking URLs for existing groups by name without phone IDs. Search bar lookup provides 100% fidelity.

---

## 3. Scope Filtering Strategies (Unread, Today, Yesterday)

### Decision
Implement three distinct scope filtering algorithms:

1. **`Unread` Scope**:
   - Detect unread count $N$ from chat list.
   - Open chat and scroll `conversation-panel-messages` down until bottom reached (`scrollTop + clientHeight >= scrollHeight - 5`).
   - Validate rendered messages: `messageCount = await messages.count()`. If `messageCount < N`, log warning and do not process partial data.
   - Process last $N$ messages: slice index from `messageCount - N` to `messageCount - 1`.

2. **`Today` Scope**:
   - Open chat and scroll down to latest messages.
   - Inspect messages starting from newest backwards.
   - Identify message timestamp / date header (WhatsApp groups messages under date divider banners or contains time metadata like `"10:45 AM"` for today).
   - Collect all messages belonging to the current calendar day until encountering a date divider for yesterday/earlier dates.

3. **`Yesterday` Scope**:
   - Inspect messages starting from yesterday's date divider banner (`[data-testid="date-divider"]` containing `"YESTERDAY"` or yesterday's date format).
   - Collect messages within yesterday's date boundary up to today's date divider.

### Alternatives Considered
- Always fetching full group history: Wasteful, triggers heavy DOM virtualization issues, and risks scraping stale job links that are expired.

---

## 4. Hyperlink Extraction, Domain Matching & Deduplication

### Decision
1. For each identified message locator in scope:
   - Search matching anchor tags: `message.locator('a[href]')`.
   - Filter links: Check if `href` includes configured domain `groupDomain` (e.g., `href.includes('jobcode.in/')` or matches hostname).
   - Normalize: Resolve relative paths to absolute URLs using `new URL(href, 'https://' + domain).href`.
2. Deduplicate using a JavaScript `Set<string>`.
3. Return a clean array `string[]` of unique URLs.

---

## 5. Layered Backend & SSE API Architecture

### Decision
Follow JobShortcut Constitution principles:
- **Route**: `POST /api/scraper/whatsapp` in `backend/src/routes/scraper-routes.ts` (guarded by `ensureAuthentication`).
- **Controller**: `backend/src/controllers/whatsapp-scraper-controller.ts` with `wrapAsync`.
- **Service/Module**: `backend/src/scraper/whatsapp_scraper.ts` implementing Playwright automation with status callback emitting SSE events.
- **SSE Events**:
  - `status`: General status message (e.g., `"Connecting to WhatsApp Web..."`, `"Searching group Jobcode 37..."`).
  - `qr`: Base64 QR code image when authentication is needed.
  - `progress`: Group-level summary (unread count, messages processed, links found).
  - `done`: Final aggregated unique URLs `string[]` and operation summary.
  - `error`: Error details if execution encounters fatal failure.

---

## 6. Frontend Admin Integration & UX

### Decision
1. **AdminScraper Page Integration**:
   - Add an **"Import from WhatsApp"** button in the header / actions bar next to "Job URLs" in `AdminScraper.tsx`.
   - Clicking opens a modal:
     - Scope selector: Radio/tabs for `Unread` (default), `Today`, `Yesterday`.
     - Group configuration overview (displaying target groups and domain mappings).
     - Action button: "Start WhatsApp Import".
2. **Live Feedback & QR Dialog**:
   - Modal displays live extraction progress and event log.
   - If a `qr` SSE event is received, render the QR code with instruction "Scan with WhatsApp on your phone".
3. **Auto-population**:
   - On `done` event, combine newly extracted URLs with any existing URLs (or replace if empty), format as comma/newline separated string into `urlInput`, and show success toast (e.g., `"Imported 8 job links from WhatsApp"`).
