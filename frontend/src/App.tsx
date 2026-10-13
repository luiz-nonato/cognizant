import { useCallback, useEffect, useState } from 'react'
import { apiClient, isLiveApiMode } from './api/client'
import type {
  CostingSnapshot,
  InventoryItem,
  Material,
  Order,
  Recipe,
} from './api/types'
import { AppShell, type AppView } from './components/AppShell'
import { InventoryView } from './components/InventoryView'
import { MaterialView } from './components/MaterialView'
import { OrdersView } from './components/OrdersView'
import { RecipeView } from './components/RecipeView'
import { MATERIAL_FLOUR, RECIPE_BREAD } from './mocks/fixtures'
import { currencySymbol, resolveCurrencyCode } from './config/currency'

function App() {
  const [view, setView] = useState<AppView>('recipe')
  const [material, setMaterial] = useState<Material | null>(null)
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [costing, setCosting] = useState<CostingSnapshot | null>(null)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [opsLoading, setOpsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [opsError, setOpsError] = useState<string | null>(null)

  const currency = resolveCurrencyCode()

  const loadCore = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [mat, rcp, cost] = await Promise.all([
        apiClient.getMaterial(MATERIAL_FLOUR.id),
        apiClient.getRecipe(RECIPE_BREAD.id),
        apiClient.getRecipeCosting(RECIPE_BREAD.id),
      ])
      setMaterial(mat)
      setRecipe(rcp)
      setCosting(cost)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load core data')
    } finally {
      setLoading(false)
    }
  }, [])

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
      setOpsError(
        err instanceof Error ? err.message : 'Failed to load inventory/orders',
      )
    } finally {
      setOpsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCore()
    void loadOps()
  }, [loadCore, loadOps])

  return (
    <AppShell activeView={view} onNavigate={setView}>
      <p className="currency-banner" aria-live="polite">
        Currency: {currency} ({currencySymbol(currency)}) —{' '}
        {isLiveApiMode()
          ? `live API (${import.meta.env.VITE_API_BASE_URL})`
          : 'mock data (set VITE_API_BASE_URL for live backend)'}
      </p>

      {view === 'material' && (
        <MaterialView material={material} loading={loading} error={error} />
      )}
      {view === 'recipe' && (
        <RecipeView
          recipe={recipe}
          costing={costing}
          loading={loading}
          error={error}
        />
      )}
      {view === 'inventory' && (
        <InventoryView
          items={inventory}
          loading={opsLoading}
          error={opsError}
          onChanged={() => void loadOps()}
        />
      )}
      {view === 'orders' && (
        <OrdersView
          orders={orders}
          loading={opsLoading}
          error={opsError}
          onChanged={() => void loadOps()}
        />
      )}
    </AppShell>
  )
}

export default App
