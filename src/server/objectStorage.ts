import { createHash, createHmac } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from './auth.js';

const service = 's3';
const region = process.env.AWS_REGION || 'us-east-2';
const endpoint = process.env.AWS_ENDPOINT_URL_S3 || process.env.NEON_OBJECT_STORAGE_ENDPOINT;
const bucket = process.env.AWS_S3_BUCKET || process.env.NEON_OBJECT_STORAGE_BUCKET;
const accessKey = process.env.AWS_ACCESS_KEY_ID;
const secretKey = process.env.AWS_SECRET_ACCESS_KEY;

function sign(key: Buffer | string, value: string) { return createHmac('sha256', key).update(value).digest(); }
function requestUrl(path: string) {
  const base = new URL(endpoint!);
  base.pathname = `${base.pathname.replace(/\/$/, '')}/${bucket}${path.startsWith('/') ? path : `/${path}`}`;
  return base;
}

async function signedRequest(method: string, path: string, body?: Buffer, contentType?: string) {
  const url = requestUrl(path);
  const amzDate = new Date().toISOString().replace(/[-:]|\.\d{3}/g, '').replace('Z', 'Z');
  const date = amzDate.slice(0, 8);
  const payloadHash = createHash('sha256').update(body || '').digest('hex');
  const headers: Record<string, string> = { host: url.host, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate };
  if (contentType) headers['content-type'] = contentType;
  const signedHeaders = Object.keys(headers).sort().join(';');
  const canonicalHeaders = Object.keys(headers).sort().map((key) => `${key}:${headers[key].trim()}\n`).join('');
  const canonicalRequest = [method, url.pathname, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const scope = `${date}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');
  const signingKey = sign(sign(sign(sign(`AWS4${secretKey!}`, date), region), service), 'aws4_request');
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  headers.authorization = `AWS4-HMAC-SHA256 Credential=${accessKey!}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return fetch(url, { method, headers, body: body ? new Uint8Array(body) : undefined });
}

export default async function objectStorage(req: VercelRequest, res: VercelResponse) {
  if (!endpoint || !bucket || !accessKey || !secretKey) return res.status(503).json({ error: 'Neon Object Storage is not configured' });
  const auth = await authenticateRequest(req);
  if (auth.authorized === false) return res.status(auth.status).json({ error: auth.message });
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body as Record<string, unknown> : null;
  const path = typeof body?.path === 'string' ? body.path.replace(/^\/+/, '').replace(/\.\./g, '') : '';
  if (!path || path.length > 512) return res.status(400).json({ error: 'A valid object path is required' });
  if (req.method === 'POST') {
    const data = typeof body?.data === 'string' ? body.data : '';
    const contentType = typeof body?.contentType === 'string' ? body.contentType : 'application/octet-stream';
    if (!data || data.length > 14_000_000 || !/^[\w.+-]+\/[\w.+-]+$/.test(contentType)) return res.status(400).json({ error: 'Invalid image payload' });
    const response = await signedRequest('PUT', `/${path}`, Buffer.from(data, 'base64'), contentType);
    if (!response.ok) return res.status(502).json({ error: 'Object upload failed' });
    return res.status(200).json({ url: requestUrl(`/${path}`).toString() });
  }
  if (req.method === 'DELETE') {
    const response = await signedRequest('DELETE', `/${path}`);
    if (!response.ok && response.status !== 404) return res.status(502).json({ error: 'Object delete failed' });
    return res.status(204).end();
  }
  res.setHeader('Allow', 'POST, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
