import type {
  CostingSnapshot,
  CopilotChatResponse,
  FoodProductSearchResponse,
  InventoryItem,
  Material,
  Order,
  Recipe,
} from '../api/types'

/** Seed aligned with backend InMemoryRepository / engine smoke fixture. */
export const MATERIAL_FLOUR: Material = {
  id: 'mat-flour-001',
  name: 'Flour',
  uom: 'kg',
  list_price: 2.0,
  reorder_point: 5,
  last_purchase_price: null,
  supplier_id: null,
}

/** Mock inventory aligned with backend seed (RM flour on-hand 100). */
export const INVENTORY_SEED: InventoryItem[] = [
  {
    item_type: 'RM',
    sku: 'mat-flour-001',
    name: 'Flour',
    uom: 'kg',
    on_hand: 100,
    reorder_point: 5,
    unit_cost: 2.0,
  },
  {
    item_type: 'FG',
    sku: 'FG-BREAD-001',
    name: 'Simple Bread',
    uom: 'unit',
    on_hand: 0,
    reorder_point: 0,
    unit_cost: 1.0,
  },
]

/** Empty orders list for mock; create via HITL. */
export const ORDERS_SEED: Order[] = []

export const RECIPE_BREAD: Recipe = {
  id: 'rcp-bread-001',
  name: 'Simple Bread',
  yield: 10,
  target_margin: 0.4,
  finished_product_sku: 'FG-BREAD-001',
  lines: [
    {
      material_id: 'mat-flour-001',
      quantity: 5,
      uom: 'kg',
    },
  ],
}

const GROUNDING_TS = '2026-10-13T15:00:00+00:00'

/** Normal path: unit_cost 1.0, recommended ≈ 1.666… */
export const COSTING_BREAD: CostingSnapshot = {
  recipe_id: 'rcp-bread-001',
  recipe_name: 'Simple Bread',
  finished_product_sku: 'FG-BREAD-001',
  yield: 10,
  target_margin: 0.4,
  total_material_cost: 10,
  unit_cost: 1.0,
  recommended_sell_price: 1.6666666666666667,
  recommended_price_label: null,
  input_unit_cost_method: 'registered list/last price (no purchases)',
  lines: [
    {
      material_id: 'mat-flour-001',
      material_name: 'Flour',
      quantity: 5,
      uom: 'kg',
      input_unit_cost: 2.0,
      line_cost: 10,
      contribution_pct: 100,
      input_unit_cost_method: 'registered list/last price (no purchases)',
    },
  ],
  grounding_timestamp: GROUNDING_TS,
}

/**
 * DEC-16 path: unit_cost 0 → recommended_sell_price numeric 0,
 * recommended_price_label "n/a / zero cost".
 */
export const COSTING_ZERO: CostingSnapshot = {
  recipe_id: 'rcp-zero-001',
  recipe_name: 'Zero-Cost Demo Batch',
  finished_product_sku: 'FG-ZERO-001',
  yield: 10,
  target_margin: 0.4,
  total_material_cost: 0,
  unit_cost: 0,
  recommended_sell_price: 0,
  recommended_price_label: 'n/a / zero cost',
  input_unit_cost_method: 'registered list/last price (no purchases)',
  lines: [
    {
      material_id: 'mat-flour-001',
      material_name: 'Flour',
      quantity: 5,
      uom: 'kg',
      input_unit_cost: 0,
      line_cost: 0,
      contribution_pct: 0,
      input_unit_cost_method: 'registered list/last price (no purchases)',
    },
  ],
  grounding_timestamp: GROUNDING_TS,
}

export function mockCopilotReply(
  message: string,
  costing: CostingSnapshot = COSTING_BREAD,
): CopilotChatResponse {
  const priceLabel =
    costing.recommended_price_label ??
    String(costing.recommended_sell_price)
  const reply = [
    `Unit cost for ${costing.recipe_name} is ${costing.unit_cost} per finished unit`,
    `(total material cost ${costing.total_material_cost} ÷ yield ${costing.yield}).`,
    `Target margin is ${(costing.target_margin * 100).toFixed(0)}% of sell price.`,
    `Recommended sell price: ${priceLabel}.`,
    `Cost method: ${costing.input_unit_cost_method}.`,
    message.trim()
      ? `You asked: “${message.trim()}”.`
      : '',
  ]
    .filter(Boolean)
    .join(' ')

  return {
    reply,
    citations: costing,
    grounding_timestamp: costing.grounding_timestamp,
    agent: 'costing_analyst',
  }
}

/** Offline stand-in for Open Food Facts (no network). */
export function mockFoodProducts(query: string): FoodProductSearchResponse {
  const q = query.trim() || 'product'
  return {
    query: q,
    products: [
      {
        name: `${q} (mock)`,
        brands: 'Mock Brand',
        barcode: '0000000000000',
        quantity_label: '1 kg',
        source: 'open_food_facts',
      },
    ],
  }
}
