export const paymentMethodCodes = ['card', 'cash-on-delivery', 'bank-transfer'] as const;

export type CheckoutPaymentMethodSetting = {
  code: typeof paymentMethodCodes[number];
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
};

export function parseCheckoutPaymentMethods(value: unknown): CheckoutPaymentMethodSetting[] | null {
  if (!Array.isArray(value) || value.length !== paymentMethodCodes.length) return null;

  const seen = new Set<string>();
  const methods: CheckoutPaymentMethodSetting[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const method = item as Record<string, unknown>;
    const allowedKeys = new Set(['code', 'name', 'description', 'is_active', 'display_order']);
    if (Object.keys(method).some((key) => !allowedKeys.has(key))) return null;
    if (typeof method.code !== 'string' || !paymentMethodCodes.includes(method.code as CheckoutPaymentMethodSetting['code']) || seen.has(method.code)) return null;
    if (typeof method.name !== 'string' || !method.name.trim() || method.name.trim().length > 100) return null;
    if (method.description !== null && typeof method.description !== 'string') return null;
    if (typeof method.description === 'string' && method.description.length > 500) return null;
    if (typeof method.is_active !== 'boolean') return null;
    if (typeof method.display_order !== 'number' || !Number.isSafeInteger(method.display_order) || method.display_order < 0 || method.display_order > 10_000) return null;

    seen.add(method.code);
    methods.push({
      code: method.code as CheckoutPaymentMethodSetting['code'],
      name: method.name.trim(),
      description: typeof method.description === 'string' ? method.description.trim() || null : null,
      is_active: method.is_active,
      display_order: method.display_order,
    });
  }
  return seen.size === paymentMethodCodes.length ? methods : null;
}
