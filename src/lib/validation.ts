import { z } from 'zod'

/**
 * Shared Zod schemas used by both client forms and API routes so the two
 * sides can never drift apart.
 */

// UK sort code: 6 digits, with or without hyphens/spaces (12-34-56, 123456).
export const sortCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{2}[- ]?\d{2}[- ]?\d{2}$/, 'Sort code must be 6 digits (e.g. 12-34-56)')

// UK account number: exactly 8 digits.
export const accountNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{8}$/, 'Account number must be exactly 8 digits')

/** Normalise a valid sort code to the canonical XX-XX-XX form. */
export function normaliseSortCode(value: string): string {
  const digits = value.replace(/\D/g, '')
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`
}

export const bankAccountSchema = z.object({
  nickname: z.string().max(40).optional().default(''),
  bank_name: z.string().max(80).optional().default(''),
  account_name: z.string().min(1, 'Account name is required').max(120),
  sort_code: sortCodeSchema,
  account_number: accountNumberSchema,
})

// Invoice line items: quantity must be a positive number, unit price a sane
// non-negative amount. Guards against NaN/negative values from free-text
// number inputs.
export const lineItemSchema = z.object({
  description: z.string().trim().min(1, 'Description is required').max(300),
  quantity: z.coerce
    .number('Quantity must be a number')
    .positive('Quantity must be greater than 0')
    .max(999, 'Quantity is too large'),
  unit_price: z.coerce
    .number('Rate must be a number')
    .nonnegative('Rate cannot be negative')
    .max(10000, 'Rate is too large'),
})

export const parentEmailSchema = z
  .string()
  .trim()
  .email('Enter a valid email address')

// Positive money amount for rates and expenses.
export const moneyAmountSchema = z.coerce
  .number('Amount must be a number')
  .nonnegative('Amount cannot be negative')
  .max(100000, 'Amount is too large')

/**
 * Payment links are injected into parent-facing emails and the public
 * invoice page — https only, no other schemes.
 */
export const paymentLinkSchema = z
  .string()
  .trim()
  .url('Enter a full link (https://…)')
  .startsWith('https://', 'Link must start with https://')
  .max(500)
