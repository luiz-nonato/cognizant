import type { Locale } from '../i18n/messages'

export type ThemePreference = 'light' | 'dark' | 'system'

const LOCALE_KEY = 'bf.locale'
const THEME_KEY = 'bf.theme'

export function loadLocale(): Locale {
  const raw = localStorage.getItem(LOCALE_KEY)
  if (raw === 'en' || raw === 'pt' || raw === 'es') return raw
  return 'en'
}

export function saveLocale(locale: Locale): void {
  localStorage.setItem(LOCALE_KEY, locale)
}

export function loadTheme(): ThemePreference {
  const raw = localStorage.getItem(THEME_KEY)
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  return 'system'
}

export function saveTheme(theme: ThemePreference): void {
  localStorage.setItem(THEME_KEY, theme)
}

export function resolveEffectiveTheme(
  preference: ThemePreference,
): 'light' | 'dark' {
  if (preference === 'light' || preference === 'dark') return preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}
