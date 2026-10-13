import { useState, type FormEvent } from 'react'
import { apiClient } from '../api/client'
import type { FoodProductSuggestion, Material } from '../api/types'
import { formatMoney, resolveCurrencyCode } from '../config/currency'
import { CURATED_UOMS, type CuratedUom } from '../config/uom'
import { usePagination } from '../hooks/usePagination'
import {
  formatDemoMaterialName,
  formatUom,
} from '../i18n/formatters'
import { useI18n } from '../i18n/I18nProvider'
import { ModalDialog } from './ModalDialog'
import { PaginationBar } from './PaginationBar'

interface MaterialViewProps {
  materials: Material[]
  selectedId: string | null
  loading: boolean
  error: string | null
  onSelect: (id: string) => void
  onCreated: () => void
}

type DialogMode = 'create' | 'edit' | null

export function MaterialView({
  materials,
  selectedId,
  loading,
  error,
  onSelect,
  onCreated,
}: MaterialViewProps) {
  const { t, locale } = useI18n()
  const currency = resolveCurrencyCode()
  const pager = usePagination(materials)

  const [dialog, setDialog] = useState<DialogMode>(null)
  const [editing, setEditing] = useState<Material | null>(null)
  const [name, setName] = useState('')
  const [uom, setUom] = useState<CuratedUom>('kg')
  const [listPrice, setListPrice] = useState('0')
  const [reorderPoint, setReorderPoint] = useState('0')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [products, setProducts] = useState<FoodProductSuggestion[]>([])
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [looking, setLooking] = useState(false)

  function openCreate() {
    setEditing(null)
    setName('')
    setUom('kg')
    setListPrice('0')
    setReorderPoint('0')
    setFormError(null)
    setDialog('create')
  }

  function openEdit(m: Material) {
    onSelect(m.id)
    setEditing(m)
    setName(m.name)
    setUom((CURATED_UOMS as readonly string[]).includes(m.uom) ? (m.uom as CuratedUom) : 'unit')
    setListPrice(String(m.list_price))
    setReorderPoint(String(m.reorder_point))
    setFormError(null)
    setDialog('edit')
  }

  function closeDialog() {
    setDialog(null)
    setEditing(null)
    setFormError(null)
  }

  async function saveMaterial(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSaving(true)
    try {
      const body = {
        name: name.trim(),
        uom,
        list_price: Number(listPrice),
        reorder_point: Number(reorderPoint),
      }
      const saved =
        dialog === 'edit' && editing
          ? await apiClient.updateMaterial(editing.id, body)
          : await apiClient.createMaterial(body)
      closeDialog()
      onCreated()
      onSelect(saved.id)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function lookup(e: FormEvent) {
    e.preventDefault()
    setLookupError(null)
    setLooking(true)
    try {
      const res = await apiClient.searchFoodProducts(query)
      setProducts(res.products)
    } catch (err) {
      setProducts([])
      setLookupError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setLooking(false)
    }
  }

  if (loading) {
    return (
      <section className="panel">
        <h2>{t('material.title')}</h2>
        <p className="muted">{t('common.loading')}</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="panel">
        <h2>{t('material.title')}</h2>
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
            <h2>{t('material.title')}</h2>
            <p className="panel-lead">{t('material.lead')}</p>
          </div>
          <button type="button" className="btn-primary" onClick={openCreate}>
            {t('material.add')}
          </button>
        </div>

        {materials.length === 0 ? (
          <p className="muted">{t('material.empty')}</p>
        ) : (
          <>
            <table className="data-table">
              <caption>{t('material.catalog')}</caption>
              <thead>
                <tr>
                  <th>{t('material.name')}</th>
                  <th>{t('material.uom')}</th>
                  <th>{t('material.listPrice')}</th>
                  <th>{t('material.reorder')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {pager.pageItems.map((m) => (
                  <tr
                    key={m.id}
                    className={m.id === selectedId ? 'row-selected' : undefined}
                  >
                    <td>{formatDemoMaterialName(m.id, m.name, t)}</td>
                    <td>{formatUom(m.uom, t)}</td>
                    <td>{formatMoney(m.list_price, currency, locale)}</td>
                    <td>
                      {m.reorder_point} {formatUom(m.uom, t)}
                    </td>
                    <td>
                      <button type="button" onClick={() => openEdit(m)}>
                        {t('common.edit')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          </>
        )}
      </section>

      <section className="panel">
        <h2>{t('material.lookupTitle')}</h2>
        <p className="panel-lead">{t('material.lookupLead')}</p>
        <form className="hitl-form" onSubmit={(e) => void lookup(e)}>
          <label>
            {t('material.searchTerms')}
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
            {looking ? t('material.searching') : t('material.search')}
          </button>
        </form>
        {products.length > 0 && (
          <table className="data-table">
            <caption>{t('material.suggestions')}</caption>
            <thead>
              <tr>
                <th>{t('material.name')}</th>
                <th>{t('material.brand')}</th>
                <th>{t('material.qtyLabel')}</th>
                <th>{t('material.barcode')}</th>
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

      <ModalDialog
        open={dialog !== null}
        title={dialog === 'edit' ? t('material.editTitle') : t('material.createTitle')}
        onClose={closeDialog}
      >
        <form className="dialog-form" onSubmit={(e) => void saveMaterial(e)}>
          <div className="form-row">
            <label>
              {t('material.name')}
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={200}
                placeholder={t('material.namePlaceholder')}
              />
            </label>
            <label>
              {t('material.uom')}
              <select
                value={uom}
                onChange={(e) => setUom(e.target.value as CuratedUom)}
              >
                {CURATED_UOMS.map((u) => (
                  <option key={u} value={u}>
                    {formatUom(u, t)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('material.listPrice')}
              <input
                type="number"
                min={0}
                step="any"
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value)}
                required
              />
            </label>
            <label>
              {t('material.reorder')}
              <input
                type="number"
                min={0}
                step="any"
                value={reorderPoint}
                onChange={(e) => setReorderPoint(e.target.value)}
                required
              />
            </label>
          </div>
          {formError && (
            <p className="error" role="alert">
              {formError}
            </p>
          )}
          <div className="dialog-actions">
            <button type="button" onClick={closeDialog}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? t('material.saving') : t('material.create')}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}
