import type { CurrencyCode } from '../api/types'
import { localeToBcp47, type Locale } from '../i18n/messages'

const SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  BRL: 'R$',
}

/**
 * Deployment currency for display (ADR-14).
 * FE reads VITE_CURRENCY_CODE; backend uses CURRENCY_CODE.
 * Default USD when unset or invalid.
 */
export function resolveCurrencyCode(): CurrencyCode {
  const raw = (import.meta.env.VITE_CURRENCY_CODE as string | undefined)?.trim()
  if (raw === 'BRL' || raw === 'USD') return raw
  return 'USD'
}

export function currencySymbol(code: CurrencyCode = resolveCurrencyCode()): string {
  return SYMBOLS[code]
}

export function formatMoney(
  amount: number,
  code: CurrencyCode = resolveCurrencyCode(),
  locale: Locale = 'en',
): string {
  const symbol = currencySymbol(code)
  const formatted = amount.toLocaleString(localeToBcp47(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })
  return `${symbol}${formatted}`
}

export function formatPercent(
  ratio: number | null | undefined,
  locale: Locale = 'en',
): string {
  if (ratio == null || Number.isNaN(ratio)) return '—'
  return `${(ratio * 100).toLocaleString(localeToBcp47(locale), {
    maximumFractionDigits: 1,
  })}%`
}
