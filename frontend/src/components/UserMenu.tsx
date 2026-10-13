import { useEffect, useId, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { useTheme } from '../theme/ThemeProvider'
import type { Locale } from '../i18n/messages'
import type { ThemePreference } from '../prefs/storage'

const LOCALES: Locale[] = ['en', 'pt', 'es']
const THEMES: ThemePreference[] = ['light', 'dark', 'system']

export function UserMenu() {
  const { t, locale, setLocale, localeLabels } = useI18n()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className={`user-menu-trigger${open ? ' open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t('prefs.account')}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="user-avatar" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
            <circle cx="12" cy="8.5" r="3.25" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M5.5 18.75c1.4-2.7 3.55-4 6.5-4s5.1 1.3 6.5 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>

      {open && (
        <div className="user-menu-panel" id={menuId} role="menu">
          <div className="user-menu-header">
            <span className="user-menu-owner">{t('prefs.owner')}</span>
            <span className="user-menu-meta">BusinessFlow</span>
          </div>

          <div className="user-menu-section">
            <p className="user-menu-label">{t('prefs.language')}</p>
            <div className="segmented" role="group" aria-label={t('prefs.language')}>
              {LOCALES.map((code) => (
                <button
                  key={code}
                  type="button"
                  role="menuitemradio"
                  aria-checked={locale === code}
                  className={locale === code ? 'seg active' : 'seg'}
                  onClick={() => setLocale(code)}
                >
                  {localeLabels[code]}
                </button>
              ))}
            </div>
          </div>

          <div className="user-menu-section">
            <p className="user-menu-label">{t('prefs.theme')}</p>
            <div className="segmented" role="group" aria-label={t('prefs.theme')}>
              {THEMES.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={theme === value}
                  className={theme === value ? 'seg active' : 'seg'}
                  onClick={() => setTheme(value)}
                >
                  {t(`prefs.theme.${value}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
