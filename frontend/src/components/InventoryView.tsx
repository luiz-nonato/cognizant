import { useState, type FormEvent } from 'react'
import { apiClient } from '../api/client'
import type { InventoryItem, ItemType } from '../api/types'
import { formatMoney } from '../config/currency'
import { HitlPanel } from './HitlPanel'

interface InventoryViewProps {
  items: InventoryItem[]
  loading: boolean
  error: string | null
  onChanged: () => void
}

export function InventoryView({
  items,
  loading,
  error,
  onChanged,
}: InventoryViewProps) {
  const [sku, setSku] = useState('mat-flour-001')
  const [itemType, setItemType] = useState<ItemType>('RM')
  const [delta, setDelta] = useState('5')
  const [reason, setReason] = useState('Opening / correction (HITL)')
  const [hitlKey, setHitlKey] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function proposeAdjust(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    const deltaNum = Number(delta)
    if (!Number.isFinite(deltaNum) || deltaNum === 0) {
      setSubmitError('Delta must be a non-zero number.')
      return
    }
    if (!reason.trim()) {
      setSubmitError('Reason is required.')
      return
    }
    setSubmitting(true)
    try {
      await apiClient.createHitlProposal({
        action: 'inventory_adjust',
        summary: `Adjust ${itemType} ${sku} by ${deltaNum}`,
        payload: {
          item_type: itemType,
          sku,
          delta: deltaNum,
          reason: reason.trim(),
        },
      })
      setHitlKey((k) => k + 1)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Propose failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <section className="panel">
        <h2>Inventory</h2>
        <p className="muted">Loading inventory…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="panel">
        <h2>Inventory</h2>
        <p className="error" role="alert">
          {error}
        </p>
      </section>
    )
  }

  return (
    <div className="stack-layout">
      <section className="panel">
        <h2>Inventory</h2>
        <p className="panel-lead">
          On-hand balances. Stock changes require a HITL proposal and human
          approval (agents never write inventory).
        </p>

        <table className="data-table">
          <caption>On-hand</caption>
          <thead>
            <tr>
              <th>Type</th>
              <th>SKU</th>
              <th>Name</th>
              <th>On hand</th>
              <th>Reorder</th>
              <th>Unit cost</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={`${row.item_type}-${row.sku}`}>
                <td>{row.item_type}</td>
                <td>
                  <code>{row.sku}</code>
                </td>
                <td>{row.name}</td>
                <td>
                  {row.on_hand} {row.uom}
                </td>
                <td>
                  {row.reorder_point} {row.uom}
                </td>
                <td>
                  {row.unit_cost != null ? formatMoney(row.unit_cost) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <form className="hitl-form" onSubmit={(e) => void proposeAdjust(e)}>
          <h3>Propose manual adjustment</h3>
          <div className="form-row">
            <label>
              Type
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value as ItemType)}
              >
                <option value="RM">RM</option>
                <option value="FG">FG</option>
              </select>
            </label>
            <label>
              SKU
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                required
              />
            </label>
            <label>
              Delta
              <input
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                inputMode="decimal"
                required
              />
            </label>
          </div>
          <label>
            Reason
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </label>
          {submitError && (
            <p className="error" role="alert">
              {submitError}
            </p>
          )}
          <button type="submit" className="btn-primary" disabled={submitting}>
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
