/**
 * API contracts aligned with FastAPI schemas (Week 3 + Sprint 4).
 */

export type CurrencyCode = 'USD' | 'BRL'

export type CopilotScreen = 'recipe' | 'inventory' | 'orders' | 'dashboard'

export type ItemType = 'RM' | 'FG'

export type OrderStatus = 'pending' | 'in_progress' | 'completed'

export type HitlAction =
  | 'inventory_adjust'
  | 'order_create'
  | 'order_produce'
  | 'order_ship'

export type HitlStatus = 'pending' | 'approved' | 'rejected' | 'failed'

export interface Material {
  id: string
  name: string
  uom: string
  list_price: number
  reorder_point: number
  last_purchase_price: number | null
  supplier_id?: string | null
}

export interface MaterialCreate {
  name: string
  uom: string
  list_price: number
  reorder_point?: number
  last_purchase_price?: number | null
  id?: string
}

export interface RecipeCreate {
  name: string
  /** API field `yield` — finished-goods units produced. */
  yield: number
  target_margin?: number
  finished_product_sku?: string | null
  lines: RecipeLine[]
  id?: string
}

export interface RecipeLine {
  material_id: string
  quantity: number
  uom: string
}

export interface Recipe {
  id: string
  name: string
  /** Finished-goods units produced by this recipe (API field `yield`). */
  yield: number
  target_margin: number
  finished_product_sku: string | null
  lines: RecipeLine[]
}

export interface CostingLine {
  material_id: string
  material_name: string
  quantity: number
  uom: string
  input_unit_cost: number
  line_cost: number
  contribution_pct: number
  input_unit_cost_method: string
}

export interface CostingSnapshot {
  recipe_id: string
  recipe_name: string
  finished_product_sku: string | null
  yield: number
  target_margin: number
  total_material_cost: number
  unit_cost: number
  recommended_sell_price: number
  /** DEC-16: "n/a / zero cost" when unit_cost is 0; else null */
  recommended_price_label: string | null
  input_unit_cost_method: string
  lines: CostingLine[]
  grounding_timestamp: string
}

export interface InventoryItem {
  item_type: ItemType
  sku: string
  name: string
  uom: string
  on_hand: number
  reorder_point: number
  unit_cost: number | null
}

export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'pix'
  | 'bank_transfer'
  | 'other'

export interface Order {
  id: string
  recipe_id: string
  fg_sku: string
  quantity: number
  sell_price: number
  status: OrderStatus
  cost_at_sale: number | null
  revenue: number | null
  payment_method?: PaymentMethod | null
  created_at: string
  completed_at: string | null
}

export interface HitlProposal {
  id: string
  action: HitlAction
  summary: string
  payload: Record<string, unknown>
  status: HitlStatus
  created_at: string
  resolved_at: string | null
  feedback: string | null
  result: Record<string, unknown> | null
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  } | null
}

export interface HitlProposalCreate {
  action: HitlAction
  summary: string
  payload: Record<string, unknown>
}

export interface FoodProductSuggestion {
  name: string
  brands: string | null
  barcode: string | null
  quantity_label: string | null
  source: string
}

export interface FoodProductSearchResponse {
  query: string
  products: FoodProductSuggestion[]
}

export interface OrderPipelineCounts {
  pending: number
  in_progress: number
  completed: number
}

export interface ProductProfitRow {
  fg_sku: string
  name: string
  revenue: number
  cogs: number
  profit: number
  margin_pct: number | null
}

export interface LowStockAlert {
  item_type: ItemType
  sku: string
  name: string
  on_hand: number
  reorder_point: number
  uom: string
}

export interface DashboardSnapshot {
  period: string
  revenue: number
  cogs: number
  profit: number
  margin_pct: number | null
  low_stock_count: number
  low_stock_alerts: LowStockAlert[]
  orders: OrderPipelineCounts
  top_products: ProductProfitRow[]
}

export interface CopilotContext {
  screen: CopilotScreen
  entity_ids?: string[]
}

export interface CopilotChatRequest {
  message: string
  context: CopilotContext
}

export interface CopilotChatResponse {
  reply: string
  citations: CostingSnapshot | Record<string, unknown>
  grounding_timestamp: string
  agent: string
  /** Week 4 bonus — crew-level plan text (null when fallback / none captured). */
  crew_plan?: string | null
  /** Week 4 bonus — agent reasoning status / note. */
  agent_reasoning?: string | null
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

/** Thin client surface for Week 3 + Sprint 4 + catalog create. */
export interface BusinessFlowApiClient {
  getMaterials(): Promise<Material[]>
  getMaterial(id: string): Promise<Material>
  createMaterial(body: MaterialCreate): Promise<Material>
  updateMaterial(id: string, body: MaterialCreate): Promise<Material>
  getRecipes(): Promise<Recipe[]>
  getRecipe(id: string): Promise<Recipe>
  createRecipe(body: RecipeCreate): Promise<Recipe>
  updateRecipe(id: string, body: RecipeCreate): Promise<Recipe>
  getRecipeCosting(id: string): Promise<CostingSnapshot>
  postCopilotChat(body: CopilotChatRequest): Promise<CopilotChatResponse>
  getInventory(): Promise<InventoryItem[]>
  getOrders(): Promise<Order[]>
  createHitlProposal(body: HitlProposalCreate): Promise<HitlProposal>
  listHitlProposals(status?: HitlStatus): Promise<HitlProposal[]>
  approveHitlProposal(
    id: string,
    feedback?: string | null,
  ): Promise<HitlProposal>
  rejectHitlProposal(id: string, feedback: string): Promise<HitlProposal>
  searchFoodProducts(query: string): Promise<FoodProductSearchResponse>
  getDashboard(): Promise<DashboardSnapshot>
}
