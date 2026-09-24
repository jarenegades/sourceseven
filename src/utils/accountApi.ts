import { getAuthAccessToken, getNeonAuthSessionId } from './neonAuthClient';

export async function authenticatedApi<T>(path: string, options: {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  query?: Record<string, string>;
  body?: unknown;
} = {}): Promise<T> {
  const token = await getAuthAccessToken();
  if (!token) throw new Error('Please sign in again to continue.');
  const sessionId = await getNeonAuthSessionId();

  const query = new URLSearchParams(options.query).toString();
  const response = await fetch(`${path}${query ? `?${query}` : ''}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(sessionId ? { 'X-Neon-Session-Id': sessionId } : {}),
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(typeof result?.error === 'string' ? result.error : `Account request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function accountApi<T>(resource: string, options: {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  query?: Record<string, string>;
  body?: unknown;
} = {}): Promise<T> {
  return authenticatedApi(`/api/account/${resource}`, options);
}
