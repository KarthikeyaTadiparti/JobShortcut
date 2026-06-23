const BASE_URL = import.meta.env.VITE_API_URL + '/api' || 'http://localhost:3000/api';

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: any;
}

export async function apiClient<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { body, ...customConfig } = options;
  const headers = { 'Content-Type': 'application/json', ...customConfig.headers };

  const config: RequestInit = {
    method: customConfig.method || (body ? 'POST' : 'GET'),
    ...customConfig,
    headers,
    credentials: 'include',
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}
