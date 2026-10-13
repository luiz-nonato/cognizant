import type { ReactNode } from 'react'
import { FutureWorkBadge } from './FutureWorkBadge'

export type AppView = 'material' | 'recipe' | 'inventory' | 'orders'

const FUTURE_NAV = [
  'Dashboard',
  'Suppliers',
  'Customers',
  'Purchases',
  'Reports',
] as const

interface AppShellProps {
  activeView: AppView
  onNavigate: (view: AppView) => void
  children: ReactNode
}

export function AppShell({ activeView, onNavigate, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <h1>BusinessFlow</h1>
          <p className="tagline">Recipe costing for makers</p>
        </div>
      </header>

      <div className="app-body">
        <nav className="app-nav" aria-label="Primary">
          <p className="nav-section-label">Sprint 4</p>
          <button
            type="button"
            className={activeView === 'material' ? 'nav-item active' : 'nav-item'}
            onClick={() => onNavigate('material')}
          >
            Materials
          </button>
          <button
            type="button"
            className={activeView === 'recipe' ? 'nav-item active' : 'nav-item'}
            onClick={() => onNavigate('recipe')}
          >
            Recipes
          </button>
          <button
            type="button"
            className={
              activeView === 'inventory' ? 'nav-item active' : 'nav-item'
            }
            onClick={() => onNavigate('inventory')}
          >
            Inventory
          </button>
          <button
            type="button"
            className={activeView === 'orders' ? 'nav-item active' : 'nav-item'}
            onClick={() => onNavigate('orders')}
          >
            Orders
          </button>

          <p className="nav-section-label deferred">Deferred P0</p>
          <ul className="future-nav-list">
            {FUTURE_NAV.map((label) => (
              <li key={label}>
                <button type="button" className="nav-item stub" disabled>
                  <span>{label}</span>
                  <FutureWorkBadge />
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <main className="app-main">{children}</main>
      </div>
    </div>
  )
}
