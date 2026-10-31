# Data Model & Schema Design: WhatsApp Channels Integration

**Feature**: WhatsApp Channels Job Link Extraction (`003-whatsapp-channel-scraper`)  
**Date**: 2026-09-27  
**Status**: Completed

---

## 1. Core Types & Entities

### 1.1 WhatsApp Source Configuration (`WhatsAppSourceConfig`)

Represents an ingestion source (either a chat group or broadcast channel) configured for automated job link harvesting.

```typescript
export type WhatsAppSourceType = 'group' | 'channel';

export interface WhatsAppSourceConfig {
    /** Discriminator indicating whether the source is a regular group chat or a broadcast channel */
    type: WhatsAppSourceType;
    /** Exact display name of the group or channel used for search/navigation in WhatsApp Web */
    name: string;
    /** Primary expected target domain (e.g. 'foundthejob.com', 'freshershunt.in') */
    targetDomain: string;
    /** Array of allowed hostnames/domains for extracted hyperlinks; defaults to [targetDomain] */
    allowedDomains?: string[];
    /** Whether this source is active during batch scraping runs (defaults to true) */
    enabled?: boolean;
}
```

### 1.2 Channel-Specific Config Alias (`WhatsAppChannelConfig`)

Backward-compatible alias for explicit channel declarations:

```typescript
export interface WhatsAppChannelConfig {
    channelName: string;
    targetDomain: string;
    allowedDomains?: string[];
    enabled?: boolean;
}
```

### 1.3 Default Channel Presets (`DEFAULT_WHATSAPP_CHANNELS`)

```typescript
export const DEFAULT_WHATSAPP_CHANNELS: WhatsAppChannelConfig[] = [
    {
        channelName: 'Found The Job Alerts',
        targetDomain: 'foundthejob.com',
        allowedDomains: ['foundthejob.com'],
        enabled: true,
    },
    {
        channelName: 'Freshershunt',
        targetDomain: 'freshershunt.in',
        allowedDomains: ['freshershunt.in'],
        enabled: true,
    },
    {
        channelName: 'Job Update With FoundtheJob',
        targetDomain: 'foundthejob.com',
        allowedDomains: ['foundthejob.com'],
        enabled: true,
    },
];
```

### 1.4 Scrape Result Entities

#### `SourceScrapeResult`
```typescript
export interface SourceScrapeResult {
    sourceName: string;
    sourceType: WhatsAppSourceType;
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

#### `WhatsAppImportResult`
```typescript
export interface WhatsAppImportResult {
    success: boolean;
    scope: 'unread' | 'today' | 'yesterday';
    totalSources: number;
    totalGroups: number;
    totalChannels: number;
    processedSources: number;
    processedGroups: number;
    processedChannels: number;
    skippedSources: number;
    failedSources: number;
    sourceResults: SourceScrapeResult[];
    urls: string[];
    totalUrls: number;
    startedAt: string;
    completedAt: string;
    durationMs: number;
}
```

---

## 2. Extraction Pipeline State Machine

```
               ┌──────────────────────┐
               │    Idle / Trigger    │
               └──────────┬───────────┘
                          │
                          ▼
               ┌──────────────────────┐
               │ Session Check & QR?  │
               └──────────┬───────────┘
                          │
                          ▼
               ┌──────────────────────┐
               │  Authenticated State │
               └──────────┬───────────┘
                          │
                          ▼
               ┌──────────────────────┐
               │  Iterate Groups      │  ◄── (Group Search -> Open Chat -> Virtualize -> Extract Links)
               └──────────┬───────────┘
                          │
                          ▼
               ┌──────────────────────┐
               │  Switch to Channels  │  ◄── (Click Channels Tab -> Select Channel -> Virtualize -> Extract Links)
               └──────────┬───────────┘
                          │
                          ▼
               ┌──────────────────────┐
               │ Aggregate & Dedupe   │  ◄── (Merge all group + channel links -> Filter unique URLs)
               └──────────┬───────────┘
                          │
                          ▼
               ┌──────────────────────┐
               │ Complete / Populate  │  ◄── (Emit final result -> Populate Admin Scraper textarea)
               └──────────────────────┘
```

---

## 3. Validation & Invariants

1. **Domain Whitelist Invariant**: An extracted link $L$ from source $S$ is persisted if and only if:
   $$\text{hostname}(L) \in S.\text{allowedDomains} \cup \{S.\text{targetDomain}\}$$
2. **Global Deduplication Invariant**: The final list of imported URLs strictly contains unique strings:
   $$\text{urls} = \text{Array.from}(\text{Set}(\bigcup_{s \in \text{Sources}} \text{extractedLinks}_s))$$
3. **Fault Isolation Invariant**: Any unexpected DOM or timeout error in source $i$ logs a warning and marks source $i$ as `failed` without interrupting source $i+1$.
