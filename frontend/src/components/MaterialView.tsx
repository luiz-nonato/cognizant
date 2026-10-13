import { useState, type FormEvent } from 'react'
import { apiClient } from '../api/client'
import type { FoodProductSuggestion, Material } from '../api/types'
import { formatMoney } from '../config/currency'

interface MaterialViewProps {
  material: Material | null
  loading: boolean
  error: string | null
}

export function MaterialView({ material, loading, error }: MaterialViewProps) {
  const [query, setQuery] = useState('flour')
  const [products, setProducts] = useState<FoodProductSuggestion[]>([])
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [looking, setLooking] = useState(false)

  async function lookup(e: FormEvent) {
    e.preventDefault()
    setLookupError(null)
    setLooking(true)
    try {
      const res = await apiClient.searchFoodProducts(query)
      setProducts(res.products)
    } catch (err) {
      setProducts([])
      setLookupError(err instanceof Error ? err.message : 'Lookup failed')
    } finally {
      setLooking(false)
    }
  }

  if (loading) {
    return (
      <section className="panel">
        <h2>Material</h2>
        <p className="muted">Loading material…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="panel">
        <h2>Material</h2>
        <p className="error" role="alert">
          {error}
        </p>
      </section>
    )
  }

  if (!material) {
    return (
      <section className="panel">
        <h2>Material</h2>
        <p className="muted">No material registered yet.</p>
      </section>
    )
  }

  const lastPrice =
    material.last_purchase_price != null
      ? formatMoney(material.last_purchase_price)
      : '—'

  return (
    <div className="stack-layout">
      <section className="panel">
        <h2>Material</h2>
        <p className="panel-lead">
          Registered input plus optional Open Food Facts enrichment (read-only;
          does not write materials).
        </p>

        <dl className="detail-grid">
          <div>
            <dt>Name</dt>
            <dd>{material.name}</dd>
          </div>
          <div>
            <dt>ID</dt>
            <dd>
              <code>{material.id}</code>
            </dd>
          </div>
          <div>
            <dt>Unit of measure</dt>
            <dd>{material.uom}</dd>
          </div>
          <div>
            <dt>List price</dt>
            <dd>{formatMoney(material.list_price)}</dd>
          </div>
          <div>
            <dt>Last purchase price</dt>
            <dd>{lastPrice}</dd>
          </div>
          <div>
            <dt>Reorder point</dt>
            <dd>
              {material.reorder_point} {material.uom}
            </dd>
          </div>
        </dl>
      </section>

      <section className="panel">
        <h2>External product lookup</h2>
        <p className="panel-lead">
          Calls Open Food Facts via the backend (<code>/external/food-products</code>
          ). Suggestions stay advisory.
        </p>
        <form className="hitl-form" onSubmit={(e) => void lookup(e)}>
          <label>
            Search terms
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              required
            />
          </label>
          {lookupError && (
            <p className="error" role="alert">
              {lookupError}
            </p>
          )}
          <button type="submit" className="btn-primary" disabled={looking}>
            {looking ? 'Searching…' : 'Search Open Food Facts'}
          </button>
        </form>

        {products.length > 0 && (
          <table className="data-table">
            <caption>Suggestions</caption>
            <thead>
              <tr>
                <th>Name</th>
                <th>Brand</th>
                <th>Qty label</th>
                <th>Barcode</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={`${p.barcode ?? p.name}-${p.brands ?? ''}`}>
                  <td>{p.name}</td>
                  <td>{p.brands ?? '—'}</td>
                  <td>{p.quantity_label ?? '—'}</td>
                  <td>
                    <code>{p.barcode ?? '—'}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
