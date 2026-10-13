/** MVP payment methods for order create (generic makers). */
export const PAYMENT_METHODS = [
  'cash',
  'card',
  'pix',
  'bank_transfer',
  'other',
] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
