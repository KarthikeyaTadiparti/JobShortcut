# Data Model: WhatsApp Job Link Scraper

## Overview
The WhatsApp Job Link Scraper extracts job links from WhatsApp Web conversations and feeds them into the existing JobShortcut scraping pipeline. This document defines the TypeScript models, configuration schemas, runtime state objects, and API data structures.

---

## 1. Entities & Types

### 1.1 ExtractionScope (Enum / Type)
Defines the timeframe / scope criteria for evaluating messages in a chat group.

```typescript
export type ExtractionScope = 'unread' | 'today' | 'yesterday';
```

- **`unread`**: Extracts links strictly from the last $N$ unread messages detected by WhatsApp unread count badges.
- **`today`**: Extracts links from all messages sent during the current calendar day.
- **`yesterday`**: Extracts links from all messages sent during the previous calendar day.

---

### 1.2 WhatsAppGroupConfig
Defines the configuration mapping between a WhatsApp group's exact display name and its target domain filter.

```typescript
export interface WhatsAppGroupConfig {
  /** Exact group name to search for in WhatsApp Web search bar */
  groupName: string;
  /** Primary target domain filter (e.g., "jobcode.in", "freshersrecruitment.co.in") */
  targetDomain: string;
  /** Optional secondary or alias domains */
  allowedDomains?: string[];
  /** Whether this group is active in scraping runs */
  enabled?: boolean;
}
```

**Default Group Mappings**:
```typescript
export const DEFAULT_WHATSAPP_GROUPS: WhatsAppGroupConfig[] = [
  { groupName: 'Jobcode 37', targetDomain: 'jobcode.in' },
  { groupName: 'Fresher Openings - 86', targetDomain: 'freshersrecruitment.co.in', allowedDomains: ['freshersrecruitment.co.in', 'freshersvoice.com', 'fvoice.site', 'fresheropenings.com', 'fresherscareers.co.in'] },
  { groupName: 'Placement Officer (2026 Batch)', targetDomain: 'placement-officer.com', allowedDomains: ['placement-officer.com', 'www.placement-officer.com'] },
  { groupName: 'Freshers Hunt Jobs', targetDomain: 'freshershunt.in' },
  { groupName: 'Daily Pharma Jobs', targetDomain: 'dailypharmajobs.in', allowedDomains: ['dailypharmajobs.in', 'jobs.dailypharmajobs.in'] },
  { groupName: 'Found The Job Alerts', targetDomain: 'foundthejob.com' },
  { groupName: 'Freshers Dunia Updates', targetDomain: 'freshersdunia.in' },
];
```

---

### 1.3 WhatsAppScrapeOptions
Parameters supplied to initiate a WhatsApp scraping session.

```typescript
export interface WhatsAppScrapeOptions {
  /** Scope of extraction: 'unread' | 'today' | 'yesterday' */
  scope: ExtractionScope;
  /** Optional override for groups to scrape; defaults to DEFAULT_WHATSAPP_GROUPS */
  groups?: WhatsAppGroupConfig[];
  /** Session storage directory path for persistent browser context */
  sessionDir?: string;
  /** Headless mode flag (default: true) */
  headless?: boolean;
  /** Timeout in ms per group (default: 30000) */
  groupTimeoutMs?: number;
}
```

---

### 1.4 GroupScrapeResult
Details for an individual group's extraction result during a run.

```typescript
export interface GroupScrapeResult {
  groupName: string;
  targetDomain: string;
  status: 'success' | 'skipped' | 'failed' | 'warning';
  unreadCount?: number;
  messagesRendered?: number;
  messagesProcessed?: number;
  extractedLinks: string[];
  warning?: string;
  error?: string;
}
```

---

### 1.5 WhatsAppImportResult
Aggregated outcome of the complete WhatsApp scraping workflow.

```typescript
export interface WhatsAppImportResult {
  success: boolean;
  scope: ExtractionScope;
  totalGroups: number;
  processedGroups: number;
  skippedGroups: number;
  failedGroups: number;
  groupResults: GroupScrapeResult[];
  /** Final unique list of extracted URLs ready for batch scraping */
  urls: string[];
  totalUrls: number;
  startedAt: string; // ISO 8601
  completedAt: string; // ISO 8601
  durationMs: number;
}
```

---

### 1.6 WhatsAppSSEEvent
Server-Sent Event payload schema streamed from the backend to the frontend client.

```typescript
export type WhatsAppSSEEvent =
  | { type: 'status'; message: string; timestamp: string }
  | { type: 'qr'; qrDataUrl: string; timestamp: string }
  | { type: 'authenticated'; timestamp: string }
  | { type: 'group_start'; groupName: string; targetDomain: string; index: number; total: number }
  | { type: 'group_progress'; groupName: string; message: string; unreadCount?: number }
  | { type: 'group_complete'; groupName: string; result: GroupScrapeResult }
  | { type: 'done'; result: WhatsAppImportResult }
  | { type: 'error'; message: string; fatal: boolean };
```

---

## 2. Validation & Invariants

1. **Domain Match Validation**:
   - Extracted links must strictly match `targetDomain` or `allowedDomains`.
   - Any link not matching the domain pattern must be discarded.
2. **URL Normalization**:
   - All extracted URLs must be well-formed `https://` URLs.
   - Relative paths (e.g. `/job-123`) must be converted to absolute URLs via `new URL(href, 'https://' + targetDomain).href`.
3. **Deduplication Invariant**:
   - The final `urls` array in `WhatsAppImportResult` must contain zero duplicates (enforced via `Set<string>`).
4. **Scope Boundaries**:
   - `unread`: Link extraction index window must satisfy `firstUnreadIndex = messageCount - unreadCount`. If `messageCount < unreadCount`, extraction is skipped and a warning is logged.
