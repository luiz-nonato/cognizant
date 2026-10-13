import { useRef, useState, type FormEvent } from 'react'
import { apiClient } from '../api/client'
import type {
  CostingSnapshot,
  InventoryItem,
  Material,
  Recipe,
  RecipeLine,
} from '../api/types'
import { COSTING_ZERO } from '../mocks/fixtures'
import { usePagination } from '../hooks/usePagination'
import {
  formatDemoMaterialName,
  formatDemoRecipeName,
  formatUom,
} from '../i18n/formatters'
import { useI18n } from '../i18n/I18nProvider'
import { CostStack } from './CostStack'
import { CopilotPanel } from './CopilotPanel'
import { ModalDialog } from './ModalDialog'
import { PaginationBar } from './PaginationBar'

interface DraftLine {
  material_id: string
  quantity: string
}

interface RecipeViewProps {
  recipes: Recipe[]
  materials: Material[]
  inventory: InventoryItem[]
  selectedId: string | null
  costing: CostingSnapshot | null
  loading: boolean
  error: string | null
  onSelect: (id: string) => void
  onCreated: () => void
}

function rmOnHand(inventory: InventoryItem[], materialId: string): number | null {
  const row = inventory.find((i) => i.item_type === 'RM' && i.sku === materialId)
  return row ? row.on_hand : null
}

type DialogMode = 'create' | 'edit' | null

export function RecipeView({
  recipes,
  materials,
  inventory,
  selectedId,
  costing,
  loading,
  error,
  onSelect,
  onCreated,
}: RecipeViewProps) {
  const { t } = useI18n()
  const recipe = recipes.find((r) => r.id === selectedId) ?? null
  const pager = usePagination(recipes)
  const [showZeroCostDemo, setShowZeroCostDemo] = useState(false)

  const [dialog, setDialog] = useState<DialogMode>(null)
  const [editing, setEditing] = useState<Recipe | null>(null)
  const [name, setName] = useState('')
  const [yieldQty, setYieldQty] = useState('1')
  const [targetMargin, setTargetMargin] = useState('0.4')
  const [fgSku, setFgSku] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([{ material_id: '', quantity: '1' }])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const stockDialogRef = useRef<HTMLDialogElement>(null)
  const [stockAlert, setStockAlert] = useState<{
    materialName: string
    onHand: number | null
    uom: string
  } | null>(null)

  function resetForm() {
    setName('')
    setYieldQty('1')
    setTargetMargin('0.4')
    setFgSku('')
    setLines([{ material_id: '', quantity: '1' }])
    setFormError(null)
  }

  function openCreate() {
    setEditing(null)
    resetForm()
    setDialog('create')
  }

  function openEdit(r: Recipe) {
    onSelect(r.id)
    setEditing(r)
    setName(r.name)
    setYieldQty(String(r.yield))
    setTargetMargin(String(r.target_margin))
    setFgSku(r.finished_product_sku ?? '')
    setLines(
      r.lines.length > 0
        ? r.lines.map((l) => ({
            material_id: l.material_id,
            quantity: String(l.quantity),
          }))
        : [{ material_id: '', quantity: '1' }],
    )
    setFormError(null)
    setDialog('edit')
  }

  function closeDialog() {
    setDialog(null)
    setEditing(null)
    setFormError(null)
  }

  function checkStockAndMaybeAlert(materialId: string) {
    if (!materialId) return
    const mat = materials.find((m) => m.id === materialId)
    if (!mat) return
    const onHand = rmOnHand(inventory, materialId)
    if (onHand === null || onHand <= 0) {
      setStockAlert({
        materialName: mat.name,
        onHand,
        uom: mat.uom,
      })
      stockDialogRef.current?.showModal()
    }
  }

  function updateLine(index: number, patch: Partial<DraftLine>) {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    )
    if (patch.material_id !== undefined) {
      checkStockAndMaybeAlert(patch.material_id)
    }
  }

  async function saveRecipe(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    const recipeLines: RecipeLine[] = []
    for (const line of lines) {
      if (!line.material_id) {
        setFormError(t('recipe.selectMaterial'))
        return
      }
      const mat = materials.find((m) => m.id === line.material_id)
      if (!mat) {
        setFormError(t('recipe.selectMaterial'))
        return
      }
      const qty = Number(line.quantity)
      if (!(qty > 0)) {
        setFormError(t('recipe.qtyPositive'))
        return
      }
      recipeLines.push({
        material_id: mat.id,
        quantity: qty,
        uom: mat.uom,
      })
    }

    setSaving(true)
    try {
      const body = {
        name: name.trim(),
        yield: Number(yieldQty),
        target_margin: Number(targetMargin),
        finished_product_sku: fgSku.trim() || null,
        lines: recipeLines,
      }
      const saved =
        dialog === 'edit' && editing
          ? await apiClient.updateRecipe(editing.id, body)
          : await apiClient.createRecipe(body)
      closeDialog()
      onCreated()
      onSelect(saved.id)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="panel">
        <h2>{t('recipe.title')}</h2>
        <p className="muted">{t('common.loading')}</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="panel">
        <h2>{t('recipe.title')}</h2>
        <p className="error" role="alert">
          {error}
        </p>
      </section>
    )
  }

  const displayCosting =
    showZeroCostDemo && costing ? COSTING_ZERO : costing

  return (
    <div className="recipe-layout">
      <dialog
        ref={stockDialogRef}
        className="stock-dialog"
        onClose={() => setStockAlert(null)}
      >
        <h3>{t('recipe.stockAlertTitle')}</h3>
        <p>
          {stockAlert
            ? t('recipe.stockAlertBody')
                .replace('{name}', stockAlert.materialName)
                .replace(
                  '{qty}',
                  stockAlert.onHand === null
                    ? t('recipe.stockMissing')
                    : `${stockAlert.onHand} ${formatUom(stockAlert.uom, t)}`,
                )
            : ''}
        </p>
        <p className="muted">{t('recipe.stockAlertHint')}</p>
        <form method="dialog">
          <button type="submit" className="btn-primary">
            {t('common.done')}
          </button>
        </form>
      </dialog>

      <section className="panel">
        <div className="panel-header-row">
          <div>
            <h2>{t('recipe.title')}</h2>
            <p className="panel-lead">{t('recipe.lead')}</p>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={openCreate}
            disabled={materials.length === 0}
          >
            {t('recipe.add')}
          </button>
        </div>
        {materials.length === 0 && (
          <p className="error" role="alert">
            {t('recipe.needMaterials')}
          </p>
        )}

        {recipes.length === 0 ? (
          <p className="muted">{t('recipe.empty')}</p>
        ) : (
          <>
            <table className="data-table">
              <caption>{t('recipe.catalog')}</caption>
              <thead>
                <tr>
                  <th>{t('material.name')}</th>
                  <th>{t('recipe.yield')}</th>
                  <th>{t('recipe.targetMargin')}</th>
                  <th>{t('recipe.fgSku')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {pager.pageItems.map((r) => (
                  <tr
                    key={r.id}
                    className={r.id === selectedId ? 'row-selected' : undefined}
                  >
                    <td>
                      <button
                        type="button"
                        className="linkish"
                        onClick={() => onSelect(r.id)}
                      >
                        {formatDemoRecipeName(r.id, r.name, t)}
                      </button>
                    </td>
                    <td>{r.yield}</td>
                    <td>{(r.target_margin * 100).toFixed(0)}%</td>
                    <td>{r.finished_product_sku ?? '—'}</td>
                    <td>
                      <button type="button" onClick={() => openEdit(r)}>
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

      {recipe && displayCosting && (
        <section className="panel">
          <div className="panel-header-row">
            <h3>{formatDemoRecipeName(recipe.id, recipe.name, t)}</h3>
            <label className="demo-toggle">
              <input
                type="checkbox"
                checked={showZeroCostDemo}
                onChange={(e) => setShowZeroCostDemo(e.target.checked)}
              />
              {t('recipe.zeroCost')}
            </label>
          </div>
          <dl className="detail-grid">
            <div>
              <dt>{t('material.id')}</dt>
              <dd>
                <code>{showZeroCostDemo ? displayCosting.recipe_id : recipe.id}</code>
              </dd>
            </div>
            <div>
              <dt>{t('recipe.fgSku')}</dt>
              <dd>
                {displayCosting.finished_product_sku ??
                  recipe.finished_product_sku ??
                  '—'}
              </dd>
            </div>
            <div>
              <dt>{t('recipe.yield')}</dt>
              <dd>
                <strong>{displayCosting.yield}</strong>
              </dd>
            </div>
            <div>
              <dt>{t('recipe.targetMargin')}</dt>
              <dd>{(displayCosting.target_margin * 100).toFixed(0)}%</dd>
            </div>
          </dl>
          <CostStack costing={displayCosting} />
        </section>
      )}

      {recipe && !showZeroCostDemo && <CopilotPanel recipeId={recipe.id} />}

      <ModalDialog
        open={dialog !== null}
        title={dialog === 'edit' ? t('recipe.editTitle') : t('recipe.createTitle')}
        onClose={closeDialog}
        wide
      >
        <form className="dialog-form" onSubmit={(e) => void saveRecipe(e)}>
          <div className="form-row">
            <label>
              {t('material.name')}
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={200}
                placeholder={t('recipe.namePlaceholder')}
              />
            </label>
            <label>
              {t('recipe.yield')}
              <input
                type="number"
                min={0.0001}
                step="any"
                value={yieldQty}
                onChange={(e) => setYieldQty(e.target.value)}
                required
              />
            </label>
            <label>
              {t('recipe.targetMargin')}
              <input
                type="number"
                min={0}
                max={0.999}
                step="0.01"
                value={targetMargin}
                onChange={(e) => setTargetMargin(e.target.value)}
                required
              />
            </label>
            <label>
              {t('recipe.fgSku')}
              <input
                value={fgSku}
                onChange={(e) => setFgSku(e.target.value)}
                placeholder="FG-…"
              />
            </label>
          </div>

          <h4 className="form-subtitle">{t('recipe.lines')}</h4>
          {lines.map((line, index) => {
            const mat = materials.find((m) => m.id === line.material_id)
            const onHand =
              line.material_id !== ''
                ? rmOnHand(inventory, line.material_id)
                : null
            return (
              <div className="form-row recipe-line-row" key={index}>
                <label>
                  {t('recipe.material')}
                  <select
                    value={line.material_id}
                    onChange={(e) =>
                      updateLine(index, { material_id: e.target.value })
                    }
                    required
                  >
                    <option value="">{t('recipe.selectMaterial')}</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {formatDemoMaterialName(m.id, m.name, t)} (
                        {formatUom(m.uom, t)})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('recipe.lineQty')}
                  <input
                    type="number"
                    min={0.0001}
                    step="any"
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(index, { quantity: e.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  {t('material.uom')}
                  <input
                    value={mat ? formatUom(mat.uom, t) : '—'}
                    readOnly
                    disabled
                  />
                </label>
                <label>
                  {t('inventory.onHand')}
                  <input
                    value={
                      line.material_id === ''
                        ? '—'
                        : onHand === null
                          ? t('recipe.stockMissing')
                          : String(onHand)
                    }
                    readOnly
                    disabled
                  />
                </label>
                <div className="line-actions" aria-label={t('recipe.lines')}>
                  <button
                    type="button"
                    className="line-icon-btn"
                    title={t('recipe.removeLine')}
                    aria-label={t('recipe.removeLine')}
                    onClick={() =>
                      setLines((prev) =>
                        prev.length <= 1
                          ? prev
                          : prev.filter((_, i) => i !== index),
                      )
                    }
                    disabled={lines.length <= 1}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    className="line-icon-btn"
                    title={t('recipe.addLine')}
                    aria-label={t('recipe.addLine')}
                    onClick={() =>
                      setLines((prev) => {
                        const next = [...prev]
                        next.splice(index + 1, 0, {
                          material_id: '',
                          quantity: '1',
                        })
                        return next
                      })
                    }
                  >
                    +
                  </button>
                </div>
              </div>
            )
          })}
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
              {saving ? t('recipe.saving') : t('recipe.create')}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}
