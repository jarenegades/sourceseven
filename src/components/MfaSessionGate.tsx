import { FormEvent, useEffect, useState } from 'react';
import { accountApi } from '../utils/accountApi';

export function MfaSessionGate({ loggedIn }: { loggedIn: boolean }) {
  const [required, setRequired] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setError('');
    if (!loggedIn || !import.meta.env.VITE_NEON_AUTH_URL) {
      setRequired(false);
      return;
    }
    accountApi<{ enabled: boolean; verifiedForThisSession: boolean }>('mfa')
      .then((status) => { if (active) setRequired(status.enabled && !status.verifiedForThisSession); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not check account security.'); });
    return () => { active = false; };
  }, [loggedIn]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await accountApi('mfa', { method: 'POST', body: { action: 'verify', code } });
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Verification failed.');
      setBusy(false);
    }
  };

  if (!required && !(loggedIn && error)) return null;
  if (!required && error) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="alertdialog" aria-modal="true">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <h2 className="mb-2 text-xl text-[#003366]">Account security check unavailable</h2>
          <p className="mb-5 text-sm text-gray-700">{error}</p>
          <p className="mb-5 text-sm text-gray-600">The protected account APIs cannot continue until the Neon security check succeeds. Confirm the latest Neon migrations and Vercel database settings, then retry.</p>
          <button onClick={() => window.location.reload()} className="w-full rounded bg-[#003366] px-4 py-2 font-medium text-white">Retry</button>
        </div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="mfa-gate-title">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 id="mfa-gate-title" className="mb-2 text-xl text-[#003366]">Verify it’s you</h2>
        <p className="mb-5 text-sm text-gray-600">Enter the current six-digit code from your authenticator app to continue.</p>
        <label htmlFor="mfa-session-code" className="mb-2 block text-sm">Authenticator or recovery code</label>
        <input id="mfa-session-code" autoComplete="one-time-code" inputMode="text" maxLength={10} required value={code} onChange={(event) => setCode(event.target.value.replace(/[^a-f0-9]/gi, '').toUpperCase())} className="mb-3 w-full rounded border px-3 py-2 tracking-[0.3em]" />
        {error && <p className="mb-3 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="w-full rounded bg-[#003366] px-4 py-2 font-medium text-white disabled:opacity-60">{busy ? 'Verifying…' : 'Verify and continue'}</button>
      </form>
    </div>
  );
}
