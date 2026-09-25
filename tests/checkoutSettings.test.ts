import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCheckoutPaymentMethods } from '../src/server/checkoutSettings.ts';
import { recoverPaidCheckout } from '../src/server/checkoutRecovery.ts';
import { paymentIntentIdempotencyKey } from '../src/server/checkoutIdempotency.ts';

const validMethods = [
  { code: 'card', name: 'Card Payment', description: 'Pay securely online.', is_active: true, display_order: 10 },
  { code: 'cash-on-delivery', name: 'Cash on Delivery', description: null, is_active: false, display_order: 20 },
  { code: 'bank-transfer', name: 'Bank Transfer', description: 'Instructions follow.', is_active: false, display_order: 30 },
];

test('accepts and normalizes all supported payment settings', () => {
  const result = parseCheckoutPaymentMethods(validMethods);
  assert.deepEqual(result?.map((method) => method.code), ['card', 'cash-on-delivery', 'bank-transfer']);
  assert.equal(result?.[0].name, 'Card Payment');
});

test('rejects a missing method or duplicate method code', () => {
  assert.equal(parseCheckoutPaymentMethods(validMethods.slice(0, 2)), null);
  assert.equal(parseCheckoutPaymentMethods([validMethods[0], validMethods[1], validMethods[1]]), null);
});

test('rejects unsupported methods and unknown setting fields', () => {
  assert.equal(parseCheckoutPaymentMethods([
    validMethods[0], validMethods[1], { ...validMethods[2], code: 'paypal' },
  ]), null);
  assert.equal(parseCheckoutPaymentMethods([
    validMethods[0], validMethods[1], { ...validMethods[2], admin: true },
  ]), null);
});

test('rejects invalid names, descriptions, flags, and sort orders', () => {
  for (const invalid of [
    { ...validMethods[0], name: ' ' },
    { ...validMethods[0], description: 42 },
    { ...validMethods[0], is_active: 'true' },
    { ...validMethods[0], display_order: -1 },
  ]) {
    assert.equal(parseCheckoutPaymentMethods([invalid, validMethods[1], validMethods[2]]), null);
  }
});

test('paid-order recovery keeps an order already committed and does not refund it', async () => {
  let refunds = 0;
  const result = await recoverPaidCheckout({
    findOrder: async () => ({ id: 'saved-order' }),
    refund: async () => { refunds += 1; },
  });
  assert.deepEqual(result, { outcome: 'order-exists', order: { id: 'saved-order' } });
  assert.equal(refunds, 0);
});

test('paid-order recovery refunds only after confirming that no order was saved', async () => {
  const steps: string[] = [];
  const result = await recoverPaidCheckout({
    findOrder: async () => { steps.push('lookup'); return null; },
    refund: async () => { steps.push('refund'); },
  });
  assert.deepEqual(result, { outcome: 'refunded' });
  assert.deepEqual(steps, ['lookup', 'refund']);
});

test('paid-order recovery does not refund when order reconciliation is unavailable', async () => {
  let refunds = 0;
  await assert.rejects(recoverPaidCheckout({
    findOrder: async () => { throw new Error('database unavailable'); },
    refund: async () => { refunds += 1; },
  }), /database unavailable/);
  assert.equal(refunds, 0);
});

test('PaymentIntent idempotency is stable for one checkout attempt and changes for a retry', () => {
  const input = {
    profileId: 'profile-1',
    attemptId: 'attempt-00000000-0000-4000-8000-000000000001',
    cartFingerprint: 'cart-fingerprint',
    email: 'Customer@Example.com',
    name: 'Customer Name',
  };
  assert.equal(paymentIntentIdempotencyKey(input), paymentIntentIdempotencyKey({ ...input, email: ' customer@example.com ' }));
  assert.notEqual(paymentIntentIdempotencyKey(input), paymentIntentIdempotencyKey({ ...input, attemptId: 'attempt-00000000-0000-4000-8000-000000000002' }));
});
