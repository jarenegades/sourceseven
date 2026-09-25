import { createHash } from 'node:crypto';

export function paymentIntentIdempotencyKey(input: {
  profileId: string;
  attemptId: string;
  cartFingerprint: string;
  email: string;
  name: string;
}): string {
  const digest = createHash('sha256')
    .update(JSON.stringify([
      input.profileId,
      input.attemptId,
      input.cartFingerprint,
      input.email.trim().toLowerCase(),
      input.name.trim(),
    ]))
    .digest('hex');
  return `source7-intent-${digest}`;
}
