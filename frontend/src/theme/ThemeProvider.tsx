import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  loadTheme,
  resolveEffectiveTheme,
  saveTheme,
  type ThemePreference,
} from '../prefs/storage'

interface ThemeContextValue {
  theme: ThemePreference
  setTheme: (theme: ThemePreference) => void
  effective: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyTheme(preference: ThemePreference) {
  const effective = resolveEffectiveTheme(preference)
  document.documentElement.dataset.theme = effective
  document.documentElement.style.colorScheme = effective
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    const initial = loadTheme()
    applyTheme(initial)
    return initial
  })

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next)
    saveTheme(next)
    applyTheme(next)
  }, [])

  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      effective: resolveEffectiveTheme(theme),
    }),
    [theme, setTheme],
  )

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
