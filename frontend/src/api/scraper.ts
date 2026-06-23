interface ScrapeCallbacks {
  onStatus: (url: string, message: string) => void;
  onProgress: (url: string, result: any) => void;
  onDone: (results: Record<string, any>) => void;
}

export async function startScraperStream(urls: string, callbacks: ScrapeCallbacks) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
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
