import type {
    WhatsAppSourceType,
    WhatsAppSourceConfig,
    WhatsAppGroupConfig,
    WhatsAppChannelConfig,
} from "./config/whatsapp_sources.js";

export type {
    WhatsAppSourceType,
    WhatsAppSourceConfig,
    WhatsAppGroupConfig,
    WhatsAppChannelConfig,
};

export enum ExtractionScope {
    UNREAD = 'unread',
    TODAY = 'today',
    YESTERDAY = 'yesterday',
}

/**
 * A single conversation message harvested from the WhatsApp Web DOM.
 */
export interface RawMessageData {
    dataId?: string | undefined;
    /** Stable merge key (data-id when available). */
    key?: string | undefined;
    rawLinks: string[];
    text: string;
    prePlainText: string;
    /** Label of the nearest date divider above the message (e.g. "TODAY"). */
    dateSection: string;
    /** Resolved local calendar date as YYYY-MM-DD, when known. */
    date?: string | undefined;
    kind?: 'text' | 'media' | 'other' | undefined;
}

export interface WhatsAppScrapeOptions {
    scope: ExtractionScope;
    /** Unified array of WhatsApp groups and channels to scrape */
    sources?: WhatsAppSourceConfig[] | undefined;
    sessionDir?: string | undefined;
    headless?: boolean | undefined;
    groupTimeoutMs?: number | undefined;
    signal?: AbortSignal | undefined;
}

export interface SourceScrapeResult {
    sourceName: string;
    sourceType: WhatsAppSourceType;
    targetDomain: string;
    status: 'success' | 'skipped' | 'failed' | 'warning';
    unreadCount?: number | undefined;
    messagesRendered?: number | undefined;
    messagesProcessed?: number | undefined;
    extractedLinks: string[];
    warning?: string | undefined;
    error?: string | undefined;
}

export interface WhatsAppImportResult {
    success: boolean;
    scope: ExtractionScope;
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

export type WhatsAppSSEEvent =
    | { type: 'status'; message: string; timestamp: string }
    | { type: 'qr'; qrDataUrl: string; timestamp: string }
    | { type: 'authenticated'; timestamp: string }
    | { type: 'source_start'; sourceType: WhatsAppSourceType; sourceName: string; targetDomain: string; index: number; total: number }
    | { type: 'source_progress'; sourceType: WhatsAppSourceType; sourceName: string; message: string; unreadCount?: number | undefined }
    | { type: 'source_complete'; sourceType: WhatsAppSourceType; sourceName: string; result: SourceScrapeResult }
    | { type: 'done'; result: WhatsAppImportResult }
    | { type: 'error'; message: string; fatal: boolean };

export type WhatsAppEventCallback = (event: WhatsAppSSEEvent) => void;
