import type { WhatsAppGroupConfig } from "../config/whatsapp-groups.js";

export type { WhatsAppGroupConfig };

export type ExtractionScope = 'unread' | 'today' | 'yesterday';

export interface WhatsAppScrapeOptions {
    scope: ExtractionScope;
    groups?: WhatsAppGroupConfig[] | undefined;
    sessionDir?: string | undefined;
    headless?: boolean | undefined;
    groupTimeoutMs?: number | undefined;
    signal?: AbortSignal | undefined;
}

export interface GroupScrapeResult {
    groupName: string;
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
    totalGroups: number;
    processedGroups: number;
    skippedGroups: number;
    failedGroups: number;
    groupResults: GroupScrapeResult[];
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
    | { type: 'group_start'; groupName: string; targetDomain: string; index: number; total: number }
    | { type: 'group_progress'; groupName: string; message: string; unreadCount?: number | undefined }
    | { type: 'group_complete'; groupName: string; result: GroupScrapeResult }
    | { type: 'done'; result: WhatsAppImportResult }
    | { type: 'error'; message: string; fatal: boolean };

export type WhatsAppEventCallback = (event: WhatsAppSSEEvent) => void;
