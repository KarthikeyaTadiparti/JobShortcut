export function normalizeJobUrl(urlString: string): string {
  try {
    const url = new URL(urlString.trim());
    
    // Normalize protocol
    const protocol = url.protocol.toLowerCase();
    
    // Normalize hostname
    let hostname = url.hostname.toLowerCase();
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }
    
    // Normalize path: remove trailing slash if any
    let pathname = url.pathname;
    if (pathname.endsWith('/') && pathname.length > 1) {
      pathname = pathname.slice(0, -1);
    }
    
    // Select and keep only essential query parameters (all lowercase)
    const essentialKeys = ['id', 'jobid', 'job_id', 'jid', 'post', 'p', 'job', 'reqid', 'req_id'];
    const cleanParams = new URLSearchParams();
    
    url.searchParams.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (essentialKeys.includes(lowerKey)) {
        cleanParams.append(lowerKey, value);
      }
    });
    
    // Re-construct the URL without tracking parameters
    const cleanSearch = cleanParams.toString();
    return `${protocol}//${hostname}${pathname}${cleanSearch ? '?' + cleanSearch : ''}`;
  } catch (e) {
    // Fallback if URL is invalid (e.g. not absolute)
    return urlString.trim();
  }
}
