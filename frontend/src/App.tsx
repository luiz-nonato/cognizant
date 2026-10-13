import { useCallback, useEffect, useState } from 'react'
import { apiClient, isLiveApiMode } from './api/client'
import type {
  CostingSnapshot,
  DashboardSnapshot,
  InventoryItem,
  Material,
  Order,
  Recipe,
} from './api/types'
import { AppShell, type AppView } from './components/AppShell'
import { DashboardView } from './components/DashboardView'
import { InventoryView } from './components/InventoryView'
import { MaterialView } from './components/MaterialView'
import { OrdersView } from './components/OrdersView'
import { RecipeView } from './components/RecipeView'
import { currencySymbol, resolveCurrencyCode } from './config/currency'
import { useI18n } from './i18n/I18nProvider'

function App() {
  const { t } = useI18n()
  const [view, setView] = useState<AppView>('dashboard')
  const [materials, setMaterials] = useState<Material[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(
    null,
  )
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [costing, setCosting] = useState<CostingSnapshot | null>(null)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [opsLoading, setOpsLoading] = useState(false)
  const [dashLoading, setDashLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [opsError, setOpsError] = useState<string | null>(null)
  const [dashError, setDashError] = useState<string | null>(null)

  const currency = resolveCurrencyCode()

  const loadCore = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [mats, rcps] = await Promise.all([
        apiClient.getMaterials(),
        apiClient.getRecipes(),
      ])
      setMaterials(mats)
      setRecipes(rcps)
      setSelectedMaterialId((prev) => {
        if (prev && mats.some((m) => m.id === prev)) return prev
        return mats[0]?.id ?? null
      })
      setSelectedRecipeId((prev) => {
        if (prev && rcps.some((r) => r.id === prev)) return prev
        return rcps[0]?.id ?? null
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [t])

  const loadOps = useCallback(async () => {
    setOpsLoading(true)
    setOpsError(null)
    try {
      const [inv, ords] = await Promise.all([
        apiClient.getInventory(),
        apiClient.getOrders(),
      ])
      setInventory(inv)
      setOrders(ords)
    } catch (err) {
      setOpsError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setOpsLoading(false)
    }
  }, [t])

  const loadDashboard = useCallback(async () => {
    setDashLoading(true)
    setDashError(null)
    try {
      setDashboard(await apiClient.getDashboard())
    } catch (err) {
      setDashError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setDashLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadCore()
    void loadOps()
    void loadDashboard()
  }, [loadCore, loadOps, loadDashboard])

  useEffect(() => {
    if (!selectedRecipeId) {
      setCosting(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const snap = await apiClient.getRecipeCosting(selectedRecipeId)
        if (!cancelled) setCosting(snap)
      } catch {
        if (!cancelled) setCosting(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedRecipeId, recipes])

  function refreshOpsAndDash() {
    void loadOps()
    void loadDashboard()
  }

  function refreshAfterCatalogChange() {
    void loadCore()
    void loadOps()
    void loadDashboard()
  }

  return (
    <AppShell activeView={view} onNavigate={setView}>
      <p className="currency-banner" aria-live="polite">
        {t('banner.currency')}: {currency} ({currencySymbol(currency)}) —{' '}
        {isLiveApiMode()
          ? `${t('banner.live')} (${import.meta.env.VITE_API_BASE_URL})`
          : t('banner.mock')}
      </p>

      {view === 'dashboard' && (
        <DashboardView
          data={dashboard}
          loading={dashLoading}
          error={dashError}
        />
      )}
      {view === 'material' && (
        <MaterialView
          materials={materials}
          selectedId={selectedMaterialId}
          loading={loading}
          error={error}
          onSelect={setSelectedMaterialId}
          onCreated={refreshAfterCatalogChange}
        />
      )}
      {view === 'recipe' && (
        <RecipeView
          recipes={recipes}
          materials={materials}
          inventory={inventory}
          selectedId={selectedRecipeId}
          costing={costing}
          loading={loading}
          error={error}
          onSelect={setSelectedRecipeId}
          onCreated={refreshAfterCatalogChange}
        />
      )}
      {view === 'inventory' && (
        <InventoryView
          items={inventory}
          loading={opsLoading}
          error={opsError}
          onChanged={refreshOpsAndDash}
        />
      )}
      {view === 'orders' && (
        <OrdersView
          orders={orders}
          recipes={recipes}
          loading={opsLoading}
          error={opsError}
          onChanged={refreshOpsAndDash}
        />
      )}
    </AppShell>
  )
}

export default App
