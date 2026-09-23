/**
 * CORS policy shared by Supabase Edge Functions.
 *
 * Add any new browser origins as a comma-separated ALLOWED_ORIGINS Edge Function
 * secret. This variable is server-side only; it must never use a VITE_ prefix.
 */
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://maxbearingsja.vercel.app',
  'https://maxbearingsja-git-main-chads-projects-03349a29.vercel.app',
  'https://sourceseven.vercel.app',
];

const configuredOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins]);

export const isAllowedOrigin = (request: Request): boolean => {
  const origin = request.headers.get('origin');

  // Non-browser callers do not send Origin and are authenticated separately by
  // each function where required. Browser callers must match the allowlist.
  return origin === null || allowedOrigins.has(origin);
};

export const createCorsHeaders = (
  request: Request,
  allowedMethods = 'POST, OPTIONS',
): Record<string, string> => {
  const origin = request.headers.get('origin');

  return {
    ...(origin !== null && allowedOrigins.has(origin)
      ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
      : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': allowedMethods,
  };
};
