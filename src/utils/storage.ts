import { getAuthAccessToken, getNeonAuthSessionId } from './neonAuthClient';

const bucket = 'product-images';

async function storageRequest(body: Record<string, unknown>, method = 'POST') {
  const token = await getAuthAccessToken();
  if (!token) throw new Error('Sign in as an administrator to manage images');
  const sessionId = await getNeonAuthSessionId();
  const response = await fetch('/api/storage', {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(sessionId ? { 'X-Neon-Session-Id': sessionId } : {}), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Storage request failed (${response.status})`);
  return result as { url?: string };
}

export async function uploadImage(file: File, path?: string): Promise<string> {
  const objectPath = path || `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  const result = await storageRequest({ bucket, path: objectPath, contentType: file.type || 'application/octet-stream', data: btoa(binary) });
  if (!result.url) throw new Error('Storage upload returned no URL');
  return result.url;
}

export async function deleteImage(url: string): Promise<void> {
  const marker = `${bucket}/`;
  const index = url.indexOf(marker);
  if (index >= 0) await storageRequest({ bucket, path: url.slice(index + marker.length) }, 'DELETE');
}

export async function listImages(): Promise<string[]> {
  throw new Error('Image listing is not exposed by the Neon Object Storage API');
}

export function getPublicUrl(path: string): string { return path; }
