import { useEffect, useState, type FormEvent } from 'react'
import { apiClient } from '../api/client'
import type { Order, PaymentMethod, Recipe } from '../api/types'
import { formatMoney, resolveCurrencyCode } from '../config/currency'
import { PAYMENT_METHODS } from '../config/payment'
import { usePagination } from '../hooks/usePagination'
import { formatDemoRecipeName, formatUom } from '../i18n/formatters'
import { useI18n } from '../i18n/I18nProvider'
import { HitlPanel } from './HitlPanel'
import { ModalDialog } from './ModalDialog'
import { PaginationBar } from './PaginationBar'

interface OrdersViewProps {
  orders: Order[]
  recipes: Recipe[]
  loading: boolean
  error: string | null
  onChanged: () => void
}

export function OrdersView({
  orders,
  recipes,
  loading,
  error,
  onChanged,
}: OrdersViewProps) {
  const { t, locale } = useI18n()
  const currency = resolveCurrencyCode()
  const pager = usePagination(orders)
  const orderable = recipes.filter((r) => r.finished_product_sku)

  const [open, setOpen] = useState(false)
  const [recipeId, setRecipeId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [sellPrice, setSellPrice] = useState('')
  const [payment, setPayment] = useState<PaymentMethod>('pix')
  const [notes, setNotes] = useState('')
  const [hitlKey, setHitlKey] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null)

  useEffect(() => {
    if (!recipeId) {
      setSuggestedPrice(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const snap = await apiClient.getRecipeCosting(recipeId)
        if (!cancelled) {
          setSuggestedPrice(snap.recommended_sell_price)
          if (!sellPrice) {
            setSellPrice(String(snap.recommended_sell_price))
          }
        }
      } catch {
        if (!cancelled) setSuggestedPrice(null)
      }
    })()
    return () => {
      cancelled = true
    }
    // Only refetch when recipe changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId])

  function openCreate() {
    setSubmitError(null)
    setRecipeId(orderable[0]?.id ?? '')
    setQuantity('1')
    setSellPrice('')
    setPayment('pix')
    setNotes('')
    setOpen(true)
  }

  function closeCreate() {
    setOpen(false)
    setSubmitError(null)
  }

  async function proposeCreate(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    const selected = recipes.find((r) => r.id === recipeId)
    if (!selected?.finished_product_sku) {
      setSubmitError(t('orders.needProduct'))
      return
    }
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0) {
      setSubmitError(t('common.error'))
      return
    }
    const price = sellPrice.trim() === '' ? null : Number(sellPrice)
    if (price != null && (!Number.isFinite(price) || price < 0)) {
      setSubmitError(t('common.error'))
      return
    }
    setBusy(true)
    try {
      await apiClient.createHitlProposal({
        action: 'order_create',
        summary: `Create order for ${selected.name} qty ${qty} (${payment})`,
        payload: {
          recipe_id: selected.id,
          quantity: qty,
          sell_price: price,
          payment_method: payment,
          notes: notes.trim() || null,
          fg_sku: selected.finished_product_sku,
          product_name: selected.name,
          uom: 'unit',
        },
      })
      closeCreate()
      setHitlKey((k) => k + 1)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('common.error'))
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
      const label =
        action === 'order_produce'
          ? t('orders.proposeProduce')
          : t('orders.proposeShip')
      await apiClient.createHitlProposal({
        action,
        summary: `${label} ${order.id}`,
        payload: { order_id: order.id },
      })
      setHitlKey((k) => k + 1)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  function recipeName(id: string): string {
    const r = recipes.find((x) => x.id === id)
    return r ? formatDemoRecipeName(r.id, r.name, t) : id
  }

  function paymentLabel(method: PaymentMethod | null | undefined): string {
    if (!method) return '—'
    return t(`orders.payment.${method}`)
  }

  if (loading) {
    return (
      <section className="panel">
        <h2>{t('orders.title')}</h2>
        <p className="muted">{t('common.loading')}</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="panel">
        <h2>{t('orders.title')}</h2>
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
            <h2>{t('orders.title')}</h2>
            <p className="panel-lead">{t('orders.lead')}</p>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={openCreate}
            disabled={orderable.length === 0}
          >
            {t('orders.proposeCreate')}
          </button>
        </div>
        {orderable.length === 0 && (
          <p className="error" role="alert">
            {t('orders.needProduct')}
          </p>
        )}

        <table className="data-table">
          <caption>{t('orders.title')}</caption>
          <thead>
            <tr>
              <th>{t('material.id')}</th>
              <th>{t('orders.product')}</th>
              <th>{t('recipe.fgSku')}</th>
              <th>{t('orders.qty')}</th>
              <th>{t('orders.uom')}</th>
              <th>{t('orders.sellPrice')}</th>
              <th>{t('orders.payment')}</th>
              <th>{t('orders.status')}</th>
              <th>{t('orders.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={9} className="muted">
                  {t('orders.empty')}
                </td>
              </tr>
            )}
            {pager.pageItems.map((order) => (
              <tr key={order.id}>
                <td>
                  <code>{order.id.slice(0, 8)}…</code>
                </td>
                <td>{recipeName(order.recipe_id)}</td>
                <td>
                  <code>{order.fg_sku}</code>
                </td>
                <td>{order.quantity}</td>
                <td>{formatUom('unit', t)}</td>
                <td>{formatMoney(order.sell_price, currency, locale)}</td>
                <td>{paymentLabel(order.payment_method)}</td>
                <td>
                  <span className={`status-pill status-${order.status}`}>
                    {t(`orders.status.${order.status}` as 'orders.status.pending')}
                  </span>
                </td>
                <td className="order-actions">
                  {order.status === 'pending' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void proposeTransition(order, 'order_produce')
                      }
                    >
                      {t('orders.proposeProduce')}
                    </button>
                  )}
                  {order.status === 'in_progress' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void proposeTransition(order, 'order_ship')
                      }
                    >
                      {t('orders.proposeShip')}
                    </button>
                  )}
                  {order.status === 'completed' && (
                    <span className="muted">{t('common.done')}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length > 0 && (
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
        {submitError && !open && (
          <p className="error" role="alert">
            {submitError}
          </p>
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
        title={t('orders.createTitle')}
        onClose={closeCreate}
        wide
      >
        <form className="dialog-form" onSubmit={(e) => void proposeCreate(e)}>
          <div className="form-row">
            <label>
              {t('orders.product')}
              <select
                value={recipeId}
                onChange={(e) => {
                  setRecipeId(e.target.value)
                  setSellPrice('')
                }}
                required
              >
                <option value="">{t('orders.selectProduct')}</option>
                {orderable.map((r) => (
                  <option key={r.id} value={r.id}>
                    {formatDemoRecipeName(r.id, r.name, t)} (
                    {r.finished_product_sku})
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('orders.quantityFg')}
              <input
                type="number"
                min={0.0001}
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </label>
            <label>
              {t('orders.uom')}
              <input value={formatUom('unit', t)} readOnly disabled />
            </label>
            <label>
              {t('orders.sellPrice')}
              <input
                type="number"
                min={0}
                step="any"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                placeholder={
                  suggestedPrice != null
                    ? String(suggestedPrice)
                    : t('orders.priceHint')
                }
              />
            </label>
            <label>
              {t('orders.payment')}
              <select
                value={payment}
                onChange={(e) => setPayment(e.target.value as PaymentMethod)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {t(`orders.payment.${m}` as 'orders.payment.cash')}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            {t('orders.notes')}
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('orders.notesPlaceholder')}
            />
          </label>
          {suggestedPrice != null && (
            <p className="muted">
              {t('orders.suggestedPrice')}:{' '}
              {formatMoney(suggestedPrice, currency, locale)}
            </p>
          )}
          {submitError && (
            <p className="error" role="alert">
              {submitError}
            </p>
          )}
          <div className="dialog-actions">
            <button type="button" onClick={closeCreate}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {t('common.submitApproval')}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}
