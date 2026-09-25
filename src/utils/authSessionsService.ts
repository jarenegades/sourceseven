import { getNeonAuthSessionId, neonAuthClient } from './neonAuthClient';

export interface AuthSessionSummary {
  id: string;
  createdAt: string;
  expiresAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  current: boolean;
}

type RawSession = {
  id: string;
  token: string;
  createdAt: string | Date;
  expiresAt: string | Date;
  ipAddress?: string | null;
  userAgent?: string | null;
};

const sessionTokens = new Map<string, string>();

function betterAuthClient() {
  if (!neonAuthClient) throw new Error('Neon Auth is not configured');
  return neonAuthClient.getBetterAuthInstance() as unknown as {
    listSessions: () => Promise<{ data: RawSession[] | null; error: { message?: string } | null }>;
    getSession: () => Promise<{ data: { session: { id: string } } | null; error: { message?: string } | null }>;
    revokeSession: (input: { token: string }) => Promise<{ error: { message?: string } | null }>;
  };
}

export const authSessionsService = {
  async list(): Promise<AuthSessionSummary[]> {
    const auth = betterAuthClient();
    const [{ data, error }, currentSessionId] = await Promise.all([auth.listSessions(), getNeonAuthSessionId()]);
    if (error) throw new Error(error.message || 'Could not load active sessions');
    const sessions = data ?? [];
    sessionTokens.clear();
    return sessions.map((session) => {
      sessionTokens.set(session.id, session.token);
      return {
        id: session.id,
        createdAt: new Date(session.createdAt).toISOString(),
        expiresAt: new Date(session.expiresAt).toISOString(),
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        current: session.id === currentSessionId,
      };
    });
  },

  async revoke(sessionId: string): Promise<void> {
    const token = sessionTokens.get(sessionId);
    if (!token) throw new Error('Session list expired. Reload the list and try again.');
    const { error } = await betterAuthClient().revokeSession({ token });
    if (error) throw new Error(error.message || 'Could not revoke session');
    sessionTokens.delete(sessionId);
  },
};
