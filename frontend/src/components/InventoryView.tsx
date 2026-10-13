import { useState, type FormEvent } from 'react'
import { apiClient } from '../api/client'
import type { InventoryItem, ItemType } from '../api/types'
import { formatMoney, resolveCurrencyCode } from '../config/currency'
import { usePagination } from '../hooks/usePagination'
import {
  formatDemoMaterialName,
  formatItemType,
  formatUom,
} from '../i18n/formatters'
import { useI18n } from '../i18n/I18nProvider'
import { HitlPanel } from './HitlPanel'
import { ModalDialog } from './ModalDialog'
import { PaginationBar } from './PaginationBar'

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
  const { t, locale } = useI18n()
  const currency = resolveCurrencyCode()
  const pager = usePagination(items)
  const [open, setOpen] = useState(false)
  const [sku, setSku] = useState('')
  const [itemType, setItemType] = useState<ItemType>('RM')
  const [delta, setDelta] = useState('5')
  const [reason, setReason] = useState('')
  const [hitlKey, setHitlKey] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function openAdjust(row?: InventoryItem) {
    setSubmitError(null)
    if (row) {
      setSku(row.sku)
      setItemType(row.item_type)
    } else {
      setSku(items[0]?.sku ?? '')
      setItemType(items[0]?.item_type ?? 'RM')
    }
    setDelta('5')
    setReason('')
    setOpen(true)
  }

  async function proposeAdjust(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    const deltaNum = Number(delta)
    if (!Number.isFinite(deltaNum) || deltaNum === 0) {
      setSubmitError(t('common.error'))
      return
    }
    if (!reason.trim()) {
      setSubmitError(t('inventory.reason'))
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
      setOpen(false)
      setHitlKey((k) => k + 1)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <section className="panel">
        <h2>{t('inventory.title')}</h2>
        <p className="muted">{t('common.loading')}</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="panel">
        <h2>{t('inventory.title')}</h2>
        <p className="error" role="alert">
          {error}
        </p>
      </section>
    )
  }

  return (
    <div className="stack-layout">
      <section className="panel">
        <div className="panel-header-row">
          <div>
            <h2>{t('inventory.title')}</h2>
            <p className="panel-lead">{t('inventory.lead')}</p>
          </div>
          <button type="button" className="btn-primary" onClick={() => openAdjust()}>
            {t('inventory.proposeAdjust')}
          </button>
        </div>

        <table className="data-table">
          <caption>{t('inventory.onHand')}</caption>
          <thead>
            <tr>
              <th>{t('inventory.type')}</th>
              <th>{t('inventory.sku')}</th>
              <th>{t('material.name')}</th>
              <th>{t('inventory.onHand')}</th>
              <th>{t('inventory.reorderCol')}</th>
              <th>{t('inventory.unitCost')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  {t('inventory.empty')}
                </td>
              </tr>
            )}
            {pager.pageItems.map((row) => (
              <tr key={`${row.item_type}-${row.sku}`}>
                <td>{formatItemType(row.item_type, t)}</td>
                <td>
                  <code>{row.sku}</code>
                </td>
                <td>
                  {row.item_type === 'RM'
                    ? formatDemoMaterialName(row.sku, row.name, t)
                    : row.name}
                </td>
                <td>
                  {row.on_hand} {formatUom(row.uom, t)}
                </td>
                <td>
                  {row.reorder_point} {formatUom(row.uom, t)}
                </td>
                <td>
                  {row.unit_cost != null
                    ? formatMoney(row.unit_cost, currency, locale)
                    : '—'}
                </td>
                <td>
                  <button type="button" onClick={() => openAdjust(row)}>
                    {t('inventory.adjust')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length > 0 && (
          <PaginationBar
            page={pager.page}
            pageSize={pager.pageSize}
            total={pager.total}
            totalPages={pager.totalPages}
            rangeStart={pager.rangeStart}
            rangeEnd={pager.rangeEnd}
            onPageChange={pager.goTo}
            onPageSizeChange={pager.setPageSize}
          />
        )}
      </section>

      <HitlPanel
        refreshKey={hitlKey}
        onResolved={() => {
          onChanged()
          setHitlKey((k) => k + 1)
        }}
      />

      <ModalDialog
        open={open}
        title={t('inventory.proposeAdjust')}
        onClose={() => setOpen(false)}
      >
        <form className="dialog-form" onSubmit={(e) => void proposeAdjust(e)}>
          <div className="form-row">
            <label>
              {t('inventory.type')}
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value as ItemType)}
              >
                <option value="RM">{t('inventory.type.RM')}</option>
                <option value="FG">{t('inventory.type.FG')}</option>
              </select>
            </label>
            <label>
              {t('inventory.sku')}
              <select value={sku} onChange={(e) => setSku(e.target.value)} required>
                {items
                  .filter((i) => i.item_type === itemType)
                  .map((i) => (
                    <option key={i.sku} value={i.sku}>
                      {i.item_type === 'RM'
                        ? formatDemoMaterialName(i.sku, i.name, t)
                        : i.name}{' '}
                      ({i.sku})
                    </option>
                  ))}
              </select>
            </label>
            <label>
              {t('inventory.delta')}
              <input
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                inputMode="decimal"
                required
              />
            </label>
          </div>
          <label>
            {t('inventory.reason')}
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
          <div className="dialog-actions">
            <button type="button" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {t('common.submitApproval')}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}
