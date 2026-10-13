import { useState, type FormEvent } from 'react'
import { apiClient } from '../api/client'
import type { Order } from '../api/types'
import { formatMoney } from '../config/currency'
import { HitlPanel } from './HitlPanel'
import { RECIPE_BREAD } from '../mocks/fixtures'

interface OrdersViewProps {
  orders: Order[]
  loading: boolean
  error: string | null
  onChanged: () => void
}

export function OrdersView({
  orders,
  loading,
  error,
  onChanged,
}: OrdersViewProps) {
  const [quantity, setQuantity] = useState('5')
  const [hitlKey, setHitlKey] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function proposeCreate(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0) {
      setSubmitError('Quantity must be greater than 0.')
      return
    }
    setBusy(true)
    try {
      await apiClient.createHitlProposal({
        action: 'order_create',
        summary: `Create order for ${RECIPE_BREAD.name} qty ${qty}`,
        payload: {
          recipe_id: RECIPE_BREAD.id,
          quantity: qty,
        },
      })
      setHitlKey((k) => k + 1)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Propose failed')
    } finally {
      setBusy(false)
    }
  }

  async function proposeTransition(
    order: Order,
    action: 'order_produce' | 'order_ship',
  ) {
    setSubmitError(null)
    setBusy(true)
    try {
      const label = action === 'order_produce' ? 'Produce' : 'Ship'
      await apiClient.createHitlProposal({
        action,
        summary: `${label} order ${order.id}`,
        payload: { order_id: order.id },
      })
      setHitlKey((k) => k + 1)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Propose failed')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <section className="panel">
        <h2>Orders</h2>
        <p className="muted">Loading orders…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="panel">
        <h2>Orders</h2>
        <p className="error" role="alert">
          {error}
        </p>
      </section>
    )
  }

  return (
    <div className="stack-layout">
      <section className="panel">
        <h2>Orders</h2>
        <p className="panel-lead">
          Three-state flow: pending → in_progress → completed. Create, produce,
          and ship each require HITL approval.
        </p>

        <table className="data-table">
          <caption>Orders</caption>
          <thead>
            <tr>
              <th>ID</th>
              <th>FG SKU</th>
              <th>Qty</th>
              <th>Sell price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No orders yet. Propose one below.
                </td>
              </tr>
            )}
            {orders.map((order) => (
              <tr key={order.id}>
                <td>
                  <code>{order.id.slice(0, 8)}…</code>
                </td>
                <td>
                  <code>{order.fg_sku}</code>
                </td>
                <td>{order.quantity}</td>
                <td>{formatMoney(order.sell_price)}</td>
                <td>{order.status}</td>
                <td className="order-actions">
                  {order.status === 'pending' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void proposeTransition(order, 'order_produce')}
                    >
                      Propose produce
                    </button>
                  )}
                  {order.status === 'in_progress' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void proposeTransition(order, 'order_ship')}
                    >
                      Propose ship
                    </button>
                  )}
                  {order.status === 'completed' && (
                    <span className="muted">Done</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <form className="hitl-form" onSubmit={(e) => void proposeCreate(e)}>
          <h3>Propose new order</h3>
          <p className="muted">
            Recipe: {RECIPE_BREAD.name} (<code>{RECIPE_BREAD.id}</code>)
          </p>
          <label>
            Quantity (FG units)
            <input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              inputMode="decimal"
              required
            />
          </label>
          {submitError && (
            <p className="error" role="alert">
              {submitError}
            </p>
          )}
          <button type="submit" className="btn-primary" disabled={busy}>
            Submit for approval
          </button>
        </form>
      </section>

      <HitlPanel
        refreshKey={hitlKey}
        onResolved={() => {
          onChanged()
          setHitlKey((k) => k + 1)
        }}
      />
    </div>
  )
}
