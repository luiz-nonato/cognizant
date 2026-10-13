import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  LOCALE_LABELS,
  MESSAGES,
  localeToBcp47,
  type Locale,
  type MessageKey,
} from './messages'
import { loadLocale, saveLocale } from '../prefs/storage'

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: MessageKey) => string
  bcp47: string
  localeLabels: typeof LOCALE_LABELS
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => loadLocale())

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    saveLocale(next)
    document.documentElement.lang = next === 'pt' ? 'pt-BR' : next === 'es' ? 'es' : 'en'
  }, [])

  const value = useMemo<I18nContextValue>(() => {
    const catalog = MESSAGES[locale]
    return {
      locale,
      setLocale,
      t: (key) => catalog[key] ?? MESSAGES.en[key] ?? key,
      bcp47: localeToBcp47(locale),
      localeLabels: LOCALE_LABELS,
    }
  }, [locale, setLocale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return ctx
}
