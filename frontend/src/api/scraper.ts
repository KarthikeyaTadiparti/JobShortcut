export interface ScrapeCallbacks {
  onStatus: (url: string, message: string) => void;
  onProgress: (url: string, result: any) => void;
  onDone: (results: Record<string, any>) => void;
}

export async function startScraperStream(urls: string, callbacks: ScrapeCallbacks) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const response = await fetch(`${API_URL}/api/scrapers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ urls }),
    credentials: 'include',
  });

  if (!response.ok) {
    const errText = await response.text();
    let errMsg = `Request failed with status ${response.status}`;
    try {
      const errJson = JSON.parse(errText);
      errMsg = errJson.message || errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response stream is not readable.');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('data: ')) {
        try {
          const eventData = JSON.parse(trimmedLine.slice(6));

          if (eventData.type === 'status') {
            callbacks.onStatus(eventData.url, eventData.message);
          } else if (eventData.type === 'progress') {
            callbacks.onProgress(eventData.url, eventData.result);
          } else if (eventData.type === 'done') {
            callbacks.onDone(eventData.results);
          }
        } catch (e) {
          console.error('Failed to parse SSE line:', e);
        }
      }
    }
  }
}

export type ExtractionScope = 'unread' | 'today' | 'yesterday';

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

export interface WhatsAppScrapeCallbacks {
  onStatus?: (message: string) => void;
  onQR?: (qrDataUrl: string) => void;
  onAuthenticated?: () => void;
  onGroupStart?: (groupName: string, targetDomain: string, index: number, total: number) => void;
  onGroupProgress?: (groupName: string, message: string, unreadCount?: number) => void;
  onGroupComplete?: (groupName: string, result: GroupScrapeResult) => void;
  onDone?: (result: WhatsAppImportResult) => void;
  onError?: (message: string) => void;
}

export async function startWhatsAppScraperStream(
  options: { scope: ExtractionScope; headless?: boolean; signal?: AbortSignal },
  callbacks: WhatsAppScrapeCallbacks
) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const { signal, ...bodyOptions } = options;
  const response = await fetch(`${API_URL}/api/scraper/whatsapp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bodyOptions),
    credentials: 'include',
    signal,
  });

  if (!response.ok) {
    const errText = await response.text();
    let errMsg = `Request failed with status ${response.status}`;
    try {
      const errJson = JSON.parse(errText);
      errMsg = errJson.message || errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response stream is not readable.');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('data: ')) {
        try {
          const eventData = JSON.parse(trimmedLine.slice(6));

          switch (eventData.type) {
            case 'status':
              callbacks.onStatus?.(eventData.message);
              break;
            case 'qr':
              callbacks.onQR?.(eventData.qrDataUrl);
              break;
            case 'authenticated':
              callbacks.onAuthenticated?.();
              break;
            case 'group_start':
              callbacks.onGroupStart?.(
                eventData.groupName,
                eventData.targetDomain,
                eventData.index,
                eventData.total
              );
              break;
            case 'group_progress':
              callbacks.onGroupProgress?.(
                eventData.groupName,
                eventData.message,
                eventData.unreadCount
              );
              break;
            case 'group_complete':
              callbacks.onGroupComplete?.(eventData.groupName, eventData.result);
              break;
            case 'done':
              callbacks.onDone?.(eventData.result);
              break;
            case 'error':
              callbacks.onError?.(eventData.message);
              break;
          }
        } catch (e) {
          console.error('Failed to parse WhatsApp SSE line:', e);
        }
      }
    }
  }
}

export async function checkWhatsAppSessionStatus(): Promise<{ authenticated: boolean }> {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const response = await fetch(`${API_URL}/api/scraper/whatsapp/status`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!response.ok) {
    return { authenticated: false };
  }
  const data = await response.json();
  return data.data || { authenticated: false };
}
