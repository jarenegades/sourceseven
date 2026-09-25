export type PaidCheckoutRecovery<T> =
  | { outcome: 'order-exists'; order: T }
  | { outcome: 'refunded' };

/**
 * Reconcile an already-paid intent after order persistence reports an error.
 * The order lookup must run after the write transaction has rolled back.
 */
export async function recoverPaidCheckout<T>(input: {
  findOrder: () => Promise<T | null>;
  refund: () => Promise<void>;
}): Promise<PaidCheckoutRecovery<T>> {
  const order = await input.findOrder();
  if (order) return { outcome: 'order-exists', order };
  await input.refund();
  return { outcome: 'refunded' };
}
