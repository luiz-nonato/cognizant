import type { ReactNode } from 'react'
import { FutureWorkBadge } from './FutureWorkBadge'
import { UserMenu } from './UserMenu'
import { useI18n } from '../i18n/I18nProvider'
import {
  IconCustomers,
  IconDashboard,
  IconInventory,
  IconMaterials,
  IconOrders,
  IconPurchases,
  IconRecipes,
  IconReports,
  IconSuppliers,
} from './NavIcons'
import type { MessageKey } from '../i18n/messages'

export type AppView =
  | 'dashboard'
  | 'material'
  | 'recipe'
  | 'inventory'
  | 'orders'

const WORKSPACE_NAV: {
  view: AppView
  labelKey: MessageKey
  icon: ReactNode
}[] = [
  { view: 'dashboard', labelKey: 'nav.dashboard', icon: <IconDashboard /> },
  { view: 'material', labelKey: 'nav.materials', icon: <IconMaterials /> },
  { view: 'recipe', labelKey: 'nav.recipes', icon: <IconRecipes /> },
  { view: 'inventory', labelKey: 'nav.inventory', icon: <IconInventory /> },
  { view: 'orders', labelKey: 'nav.orders', icon: <IconOrders /> },
]

const FUTURE_NAV: {
  labelKey: MessageKey
  icon: ReactNode
}[] = [
  { labelKey: 'nav.suppliers', icon: <IconSuppliers /> },
  { labelKey: 'nav.customers', icon: <IconCustomers /> },
  { labelKey: 'nav.purchases', icon: <IconPurchases /> },
  { labelKey: 'nav.reports', icon: <IconReports /> },
]

interface AppShellProps {
  activeView: AppView
  onNavigate: (view: AppView) => void
  children: ReactNode
}

export function AppShell({ activeView, onNavigate, children }: AppShellProps) {
  const { t } = useI18n()

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <img
            className="brand-logo"
            src="/nexo-custo-logo.jpg"
            alt=""
            width={36}
            height={36}
          />
          <div className="brand-text">
            <h1>Nexo Custo</h1>
            <p className="tagline">{t('app.tagline')}</p>
          </div>
        </div>
        <UserMenu />
      </header>

      <div className="app-body">
        <nav className="app-nav" aria-label="Primary">
          <p className="nav-section-label">{t('nav.section')}</p>
          <div className="nav-list">
            {WORKSPACE_NAV.map((item) => (
              <button
                key={item.view}
                type="button"
                className={
                  activeView === item.view ? 'nav-row active' : 'nav-row'
                }
                onClick={() => onNavigate(item.view)}
              >
                <span className="nav-row-icon">{item.icon}</span>
                <span className="nav-row-text">
                  <span className="nav-row-label">{t(item.labelKey)}</span>
                </span>
              </button>
            ))}
          </div>

          <p className="nav-section-label deferred">{t('nav.deferred')}</p>
          <div className="nav-list deferred">
            {FUTURE_NAV.map((item) => (
              <button
                key={item.labelKey}
                type="button"
                className="nav-row stub"
                disabled
              >
                <span className="nav-row-icon">{item.icon}</span>
                <span className="nav-row-text">
                  <span className="nav-row-label">{t(item.labelKey)}</span>
                  <FutureWorkBadge />
                </span>
              </button>
            ))}
          </div>
        </nav>

        <main className="app-main">{children}</main>
      </div>
    </div>
  )
}
