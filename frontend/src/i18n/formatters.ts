import type { MessageKey } from './messages'

type Translate = (key: MessageKey) => string

const UOM_KEYS: Record<string, MessageKey> = {
  kg: 'uom.kg',
  g: 'uom.g',
  L: 'uom.L',
  ml: 'uom.ml',
  unit: 'uom.unit',
  pack: 'uom.pack',
}

const DEMO_MATERIAL_NAMES: Record<string, MessageKey> = {
  'mat-flour-001': 'demo.flour',
}

const DEMO_RECIPE_NAMES: Record<string, MessageKey> = {
  'rcp-bread-001': 'demo.bread',
}

/** Localized label for curated UoM codes (API values stay kg/g/L/ml/unit/pack). */
export function formatUom(code: string | null | undefined, t: Translate): string {
  if (!code) return '—'
  const key = UOM_KEYS[code]
  return key ? t(key) : code
}

export function formatDemoMaterialName(
  id: string,
  fallbackName: string,
  t: Translate,
): string {
  const key = DEMO_MATERIAL_NAMES[id]
  return key ? t(key) : fallbackName
}

export function formatDemoRecipeName(
  id: string,
  fallbackName: string,
  t: Translate,
): string {
  const key = DEMO_RECIPE_NAMES[id]
  return key ? t(key) : fallbackName
}

export function formatItemType(
  type: 'RM' | 'FG',
  t: Translate,
): string {
  return type === 'RM' ? t('inventory.type.RM') : t('inventory.type.FG')
}

export function formatCostMethod(method: string, t: Translate): string {
  if (method === 'list_price') return t('cost.method.list_price')
  if (method === 'weighted_avg' || method === 'weighted_average') {
    return t('cost.method.weighted_avg')
  }
  if (method === 'last_purchase' || method === 'last_purchase_price') {
    return t('cost.method.last_purchase')
  }
  return method
}
