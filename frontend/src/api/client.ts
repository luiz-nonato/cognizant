/**
 * Typed API client (Week 3 + Sprint 4).
 *
 * - Mock: fixtures when VITE_API_BASE_URL is unset (or VITE_USE_MOCK=true).
 * - Live: fetch against VITE_API_BASE_URL (non-streaming copilot, crewai).
 */

import type {
  ApiErrorBody,
  BusinessFlowApiClient,
  CopilotChatRequest,
  CopilotChatResponse,
  CostingSnapshot,
  DashboardSnapshot,
  FoodProductSearchResponse,
  HitlProposal,
  HitlProposalCreate,
  HitlStatus,
  InventoryItem,
  Material,
  MaterialCreate,
  Order,
  Recipe,
  RecipeCreate,
} from './types'
import {
  COSTING_BREAD,
  INVENTORY_SEED,
  MATERIAL_FLOUR,
  ORDERS_SEED,
  RECIPE_BREAD,
  mockCopilotReply,
  mockFoodProducts,
} from '../mocks/fixtures'

const materialsById: Record<string, Material> = {
  [MATERIAL_FLOUR.id]: MATERIAL_FLOUR,
}

const recipesById: Record<string, Recipe> = {
  [RECIPE_BREAD.id]: RECIPE_BREAD,
}

const costingByRecipeId: Record<string, CostingSnapshot> = {
  [RECIPE_BREAD.id]: COSTING_BREAD,
}

/** Mutable mock HITL queue (session-local). */
const mockProposals: HitlProposal[] = []
let mockInventory: InventoryItem[] = INVENTORY_SEED.map((r) => ({ ...r }))
let mockOrders: Order[] = ORDERS_SEED.map((o) => ({ ...o }))

function notFound(resource: string, id: string): never {
  throw new Error(`${resource} not found: ${id}`)
}

/** Parsed API error envelope `{ error: { code, message, details? } }`. */
export class ApiClientError extends Error {
  readonly code: string
  readonly details?: Record<string, unknown>
  readonly status: number

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.code = code
    this.details = details
  }
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

function resolveBearerToken(): string | undefined {
  const token = import.meta.env.VITE_API_BEARER_TOKEN?.trim()
  return token || undefined
}

async function parseError(res: Response): Promise<ApiClientError> {
  let code = 'http_error'
  let message = res.statusText || `HTTP ${res.status}`
  let details: Record<string, unknown> | undefined
  try {
    const body = (await res.json()) as ApiErrorBody | Record<string, unknown>
    if (
      body &&
      typeof body === 'object' &&
      'error' in body &&
      body.error &&
      typeof body.error === 'object'
    ) {
      const err = (body as ApiErrorBody).error
      code = err.code || code
      message = err.message || message
      details = err.details
    }
  } catch {
    // non-JSON body — keep defaults
  }
  return new ApiClientError(res.status, code, message, details)
}

/**
 * Live HTTP client for Week 3 + Sprint 4 endpoints.
 * Optional Bearer: set VITE_API_BEARER_TOKEN when backend SECRET_KEY is configured.
 */
export function createLiveApiClient(baseUrl: string): BusinessFlowApiClient {
  const root = trimTrailingSlash(baseUrl)
  const bearer = resolveBearerToken()

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers)
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json')
    }
    if (init?.body != null && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    if (bearer) {
      headers.set('Authorization', `Bearer ${bearer}`)
    }

    const res = await fetch(`${root}${path}`, { ...init, headers })
    if (!res.ok) {
      throw await parseError(res)
    }
    return (await res.json()) as T
  }

  return {
    async getMaterials() {
      return request<Material[]>('/materials')
    },
    async getMaterial(id) {
      return request<Material>(`/materials/${encodeURIComponent(id)}`)
    },
    async createMaterial(body: MaterialCreate) {
      return request<Material>('/materials', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    },
    async updateMaterial(id, body: MaterialCreate) {
      return request<Material>(`/materials/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      })
    },
    async getRecipes() {
      return request<Recipe[]>('/recipes')
    },
    async getRecipe(id) {
      return request<Recipe>(`/recipes/${encodeURIComponent(id)}`)
    },
    async createRecipe(body: RecipeCreate) {
      return request<Recipe>('/recipes', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    },
    async updateRecipe(id, body: RecipeCreate) {
      return request<Recipe>(`/recipes/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      })
    },
    async getRecipeCosting(id) {
      return request<CostingSnapshot>(
        `/recipes/${encodeURIComponent(id)}/costing`,
      )
    },
    async postCopilotChat(body: CopilotChatRequest): Promise<CopilotChatResponse> {
      return request<CopilotChatResponse>('/copilot/chat', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    },
    async getInventory() {
      return request<InventoryItem[]>('/inventory')
    },
    async getOrders() {
      return request<Order[]>('/orders')
    },
    async createHitlProposal(body: HitlProposalCreate) {
      return request<HitlProposal>('/hitl/proposals', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    },
    async listHitlProposals(status?: HitlStatus) {
      const qs = status ? `?status=${encodeURIComponent(status)}` : ''
      return request<HitlProposal[]>(`/hitl/proposals${qs}`)
    },
    async approveHitlProposal(id, feedback) {
      return request<HitlProposal>(
        `/hitl/proposals/${encodeURIComponent(id)}/approve`,
        {
          method: 'POST',
          body: JSON.stringify({ feedback: feedback ?? null }),
        },
      )
    },
    async rejectHitlProposal(id, feedback) {
      return request<HitlProposal>(
        `/hitl/proposals/${encodeURIComponent(id)}/reject`,
        {
          method: 'POST',
          body: JSON.stringify({ feedback }),
        },
      )
    },
    async searchFoodProducts(query: string) {
      return request<FoodProductSearchResponse>(
        `/external/food-products?q=${encodeURIComponent(query)}`,
      )
    },
    async getDashboard() {
      return request<DashboardSnapshot>('/dashboard')
    },
  }
}

function buildMockDashboard(): DashboardSnapshot {
  const completed = mockOrders.filter((o) => o.status === 'completed')
  let revenue = 0
  let cogs = 0
  const bySku = new Map<
    string,
    { fg_sku: string; name: string; revenue: number; cogs: number }
  >()
  for (const order of completed) {
    const rev = order.revenue ?? order.quantity * order.sell_price
    const lineCogs = (order.cost_at_sale ?? 0) * order.quantity
    revenue += rev
    cogs += lineCogs
    const row = bySku.get(order.fg_sku) ?? {
      fg_sku: order.fg_sku,
      name: order.fg_sku,
      revenue: 0,
      cogs: 0,
    }
    row.revenue += rev
    row.cogs += lineCogs
    bySku.set(order.fg_sku, row)
  }
  const profit = revenue - cogs
  const alerts = mockInventory
    .filter((i) => i.on_hand <= i.reorder_point)
    .map((i) => ({
      item_type: i.item_type,
      sku: i.sku,
      name: i.name,
      on_hand: i.on_hand,
      reorder_point: i.reorder_point,
      uom: i.uom,
    }))
  return {
    period: 'all_time',
    revenue,
    cogs,
    profit,
    margin_pct: revenue > 0 ? profit / revenue : null,
    low_stock_count: alerts.length,
    low_stock_alerts: alerts,
    orders: {
      pending: mockOrders.filter((o) => o.status === 'pending').length,
      in_progress: mockOrders.filter((o) => o.status === 'in_progress').length,
      completed: completed.length,
    },
    top_products: [...bySku.values()]
      .map((r) => ({
        ...r,
        profit: r.revenue - r.cogs,
        margin_pct: r.revenue > 0 ? (r.revenue - r.cogs) / r.revenue : null,
      }))
      .sort((a, b) => b.profit - a.profit),
  }
}

function mockNow(): string {
  return new Date().toISOString()
}

/** Stub client — returns fixtures; HITL mutates local mock state. */
export function createMockApiClient(): BusinessFlowApiClient {
  return {
    async getMaterials() {
      return Object.values(materialsById)
    },
    async getMaterial(id) {
      return materialsById[id] ?? notFound('Material', id)
    },
    async createMaterial(body: MaterialCreate) {
      const id = body.id?.trim() || `mat-mock-${Object.keys(materialsById).length + 1}`
      const material: Material = {
        id,
        name: body.name,
        uom: body.uom,
        list_price: body.list_price,
        reorder_point: body.reorder_point ?? 0,
        last_purchase_price: body.last_purchase_price ?? null,
      }
      materialsById[id] = material
      mockInventory = [
        {
          item_type: 'RM',
          sku: id,
          name: material.name,
          uom: material.uom,
          on_hand: 0,
          reorder_point: material.reorder_point,
          unit_cost: material.list_price,
        },
        ...mockInventory.filter((r) => !(r.item_type === 'RM' && r.sku === id)),
      ]
      return { ...material }
    },
    async updateMaterial(id, body: MaterialCreate) {
      if (!materialsById[id]) notFound('Material', id)
      const material: Material = {
        id,
        name: body.name,
        uom: body.uom,
        list_price: body.list_price,
        reorder_point: body.reorder_point ?? 0,
        last_purchase_price:
          body.last_purchase_price ?? materialsById[id].last_purchase_price,
      }
      materialsById[id] = material
      const existing = mockInventory.find((r) => r.item_type === 'RM' && r.sku === id)
      mockInventory = [
        {
          item_type: 'RM',
          sku: id,
          name: material.name,
          uom: material.uom,
          on_hand: existing?.on_hand ?? 0,
          reorder_point: material.reorder_point,
          unit_cost: material.list_price,
        },
        ...mockInventory.filter((r) => !(r.item_type === 'RM' && r.sku === id)),
      ]
      return { ...material }
    },
    async getRecipes() {
      return Object.values(recipesById)
    },
    async getRecipe(id) {
      return recipesById[id] ?? notFound('Recipe', id)
    },
    async createRecipe(body: RecipeCreate) {
      for (const line of body.lines) {
        const mat = materialsById[line.material_id]
        if (!mat) notFound('Material', line.material_id)
        if (line.uom !== mat.uom) {
          throw new Error('uom_mismatch: Recipe line UoM must equal the material UoM')
        }
      }
      const id = body.id?.trim() || `rcp-mock-${Object.keys(recipesById).length + 1}`
      const recipe: Recipe = {
        id,
        name: body.name,
        yield: body.yield,
        target_margin: body.target_margin ?? 0,
        finished_product_sku: body.finished_product_sku ?? null,
        lines: body.lines.map((l) => ({ ...l })),
      }
      recipesById[id] = recipe

      let total = 0
      const lines = recipe.lines.map((line) => {
        const mat = materialsById[line.material_id]!
        const unit = mat.last_purchase_price ?? mat.list_price
        const lineCost = unit * line.quantity
        total += lineCost
        return {
          material_id: line.material_id,
          material_name: mat.name,
          quantity: line.quantity,
          uom: line.uom,
          input_unit_cost: unit,
          line_cost: lineCost,
          contribution_pct: 0,
          input_unit_cost_method: 'list_price',
        }
      })
      for (const line of lines) {
        line.contribution_pct = total > 0 ? line.line_cost / total : 0
      }
      const unitCost = recipe.yield > 0 ? total / recipe.yield : 0
      const margin = recipe.target_margin
      const recommended =
        unitCost === 0
          ? 0
          : margin > 0 && margin < 1
            ? unitCost / (1 - margin)
            : unitCost
      costingByRecipeId[id] = {
        recipe_id: id,
        recipe_name: recipe.name,
        finished_product_sku: recipe.finished_product_sku,
        yield: recipe.yield,
        target_margin: recipe.target_margin,
        total_material_cost: total,
        unit_cost: unitCost,
        recommended_sell_price: recommended,
        recommended_price_label: unitCost === 0 ? 'n/a / zero cost' : null,
        input_unit_cost_method: 'list_price',
        lines,
        grounding_timestamp: mockNow(),
      }

      if (recipe.finished_product_sku) {
        const sku = recipe.finished_product_sku
        mockInventory = [
          {
            item_type: 'FG',
            sku,
            name: recipe.name,
            uom: 'unit',
            on_hand: 0,
            reorder_point: 0,
            unit_cost: unitCost,
          },
          ...mockInventory.filter((r) => !(r.item_type === 'FG' && r.sku === sku)),
        ]
      }
      return { ...recipe, lines: recipe.lines.map((l) => ({ ...l })) }
    },
    async updateRecipe(id, body: RecipeCreate) {
      if (!recipesById[id]) notFound('Recipe', id)
      for (const line of body.lines) {
        const mat = materialsById[line.material_id]
        if (!mat) notFound('Material', line.material_id)
        if (line.uom !== mat.uom) {
          throw new Error('uom_mismatch: Recipe line UoM must equal the material UoM')
        }
      }
      const recipe: Recipe = {
        id,
        name: body.name,
        yield: body.yield,
        target_margin: body.target_margin ?? 0,
        finished_product_sku: body.finished_product_sku ?? null,
        lines: body.lines.map((l) => ({ ...l })),
      }
      recipesById[id] = recipe
      let total = 0
      const lines = recipe.lines.map((line) => {
        const mat = materialsById[line.material_id]!
        const unit = mat.last_purchase_price ?? mat.list_price
        const lineCost = unit * line.quantity
        total += lineCost
        return {
          material_id: line.material_id,
          material_name: mat.name,
          quantity: line.quantity,
          uom: line.uom,
          input_unit_cost: unit,
          line_cost: lineCost,
          contribution_pct: 0,
          input_unit_cost_method: 'list_price',
        }
      })
      for (const line of lines) {
        line.contribution_pct = total > 0 ? line.line_cost / total : 0
      }
      const unitCost = recipe.yield > 0 ? total / recipe.yield : 0
      const margin = recipe.target_margin
      const recommended =
        unitCost === 0
          ? 0
          : margin > 0 && margin < 1
            ? unitCost / (1 - margin)
            : unitCost
      costingByRecipeId[id] = {
        recipe_id: id,
        recipe_name: recipe.name,
        finished_product_sku: recipe.finished_product_sku,
        yield: recipe.yield,
        target_margin: recipe.target_margin,
        total_material_cost: total,
        unit_cost: unitCost,
        recommended_sell_price: recommended,
        recommended_price_label: unitCost === 0 ? 'n/a / zero cost' : null,
        input_unit_cost_method: 'list_price',
        lines,
        grounding_timestamp: mockNow(),
      }
      return { ...recipe, lines: recipe.lines.map((l) => ({ ...l })) }
    },
    async getRecipeCosting(id) {
      return costingByRecipeId[id] ?? notFound('Costing', id)
    },
    async postCopilotChat(body: CopilotChatRequest): Promise<CopilotChatResponse> {
      if (body.context.screen !== 'recipe') {
        throw new Error(
          `screen_not_implemented: Week 3 mock only supports recipe (got ${body.context.screen})`,
        )
      }
      const entityId = body.context.entity_ids?.[0] ?? RECIPE_BREAD.id
      const costing = costingByRecipeId[entityId] ?? COSTING_BREAD
      return mockCopilotReply(body.message, costing)
    },
    async getInventory() {
      return mockInventory.map((r) => ({ ...r }))
    },
    async getOrders() {
      return mockOrders.map((o) => ({ ...o }))
    },
    async createHitlProposal(body) {
      const proposal: HitlProposal = {
        id: `hitl-mock-${mockProposals.length + 1}`,
        action: body.action,
        summary: body.summary,
        payload: body.payload,
        status: 'pending',
        created_at: mockNow(),
        resolved_at: null,
        feedback: null,
        result: null,
        error: null,
      }
      mockProposals.unshift(proposal)
      return { ...proposal, payload: { ...proposal.payload } }
    },
    async listHitlProposals(status) {
      const rows = status
        ? mockProposals.filter((p) => p.status === status)
        : mockProposals
      return rows.map((p) => ({ ...p, payload: { ...p.payload } }))
    },
    async approveHitlProposal(id, feedback) {
      const proposal = mockProposals.find((p) => p.id === id)
      if (!proposal) notFound('HITL proposal', id)
      if (proposal.status !== 'pending') {
        throw new Error('proposal_not_pending')
      }
      if (proposal.action === 'inventory_adjust') {
        const sku = String(proposal.payload.sku ?? '')
        const delta = Number(proposal.payload.delta ?? 0)
        const row = mockInventory.find((r) => r.sku === sku)
        if (row) {
          row.on_hand += delta
          proposal.result = {
            sku,
            delta,
            resulting_on_hand: row.on_hand,
          }
        }
      }
      if (proposal.action === 'order_create') {
        const recipeId = String(proposal.payload.recipe_id ?? RECIPE_BREAD.id)
        const recipe = recipesById[recipeId] ?? RECIPE_BREAD
        const costing = costingByRecipeId[recipeId] ?? COSTING_BREAD
        const order: Order = {
          id: `ord-mock-${mockOrders.length + 1}`,
          recipe_id: recipeId,
          fg_sku:
            String(proposal.payload.fg_sku ?? '') ||
            recipe.finished_product_sku ||
            'FG-BREAD-001',
          quantity: Number(proposal.payload.quantity ?? 1),
          sell_price: Number(
            proposal.payload.sell_price ?? costing.recommended_sell_price,
          ),
          status: 'pending',
          cost_at_sale: null,
          revenue: null,
          payment_method: (proposal.payload.payment_method as Order['payment_method']) ?? null,
          created_at: mockNow(),
          completed_at: null,
        }
        mockOrders = [order, ...mockOrders]
        proposal.result = { ...order }
      }
      if (proposal.action === 'order_produce') {
        const orderId = String(proposal.payload.order_id ?? '')
        const order = mockOrders.find((o) => o.id === orderId)
        if (order) {
          order.status = 'in_progress'
          proposal.result = { ...order }
        }
      }
      if (proposal.action === 'order_ship') {
        const orderId = String(proposal.payload.order_id ?? '')
        const order = mockOrders.find((o) => o.id === orderId)
        if (order) {
          order.status = 'completed'
          order.cost_at_sale = COSTING_BREAD.unit_cost
          order.revenue = order.quantity * order.sell_price
          order.completed_at = mockNow()
          proposal.result = { ...order }
        }
      }
      proposal.status = 'approved'
      proposal.resolved_at = mockNow()
      proposal.feedback = feedback?.trim() || 'Approved'
      return { ...proposal, payload: { ...proposal.payload } }
    },
    async rejectHitlProposal(id, feedback) {
      const proposal = mockProposals.find((p) => p.id === id)
      if (!proposal) notFound('HITL proposal', id)
      if (proposal.status !== 'pending') {
        throw new Error('proposal_not_pending')
      }
      const trimmed = feedback.trim()
      if (!trimmed) {
        throw new Error('feedback_required')
      }
      proposal.status = 'rejected'
      proposal.feedback = trimmed
      proposal.resolved_at = mockNow()
      return { ...proposal, payload: { ...proposal.payload } }
    },
    async searchFoodProducts(query: string) {
      return mockFoodProducts(query)
    },
    async getDashboard() {
      return buildMockDashboard()
    },
  }
}

/** True when UI should call the live FastAPI backend. */
export function isLiveApiMode(): boolean {
  const forceMock =
    (import.meta.env.VITE_USE_MOCK as string | undefined)?.trim().toLowerCase() ===
    'true'
  if (forceMock) return false
  const base = import.meta.env.VITE_API_BASE_URL?.trim()
  return Boolean(base)
}

function resolveApiClient(): BusinessFlowApiClient {
  if (!isLiveApiMode()) {
    return createMockApiClient()
  }
  const base = import.meta.env.VITE_API_BASE_URL!.trim()
  return createLiveApiClient(base)
}

/** Active client: live when VITE_API_BASE_URL is set (unless VITE_USE_MOCK=true). */
export const apiClient: BusinessFlowApiClient = resolveApiClient()

/** Documented endpoint map (paths relative to VITE_API_BASE_URL). */
export const SPRINT4_ENDPOINTS = {
  health: 'GET /health',
  materials: 'GET|POST /materials',
  materialById: 'GET /materials/{id}',
  recipes: 'GET|POST /recipes',
  recipeById: 'GET /recipes/{id}',
  recipeCosting: 'GET /recipes/{id}/costing',
  inventory: 'GET /inventory',
  orders: 'GET /orders',
  hitlProposals: 'GET|POST /hitl/proposals',
  hitlApprove: 'POST /hitl/proposals/{id}/approve',
  hitlReject: 'POST /hitl/proposals/{id}/reject',
  foodProducts: 'GET /external/food-products?q=',
  dashboard: 'GET /dashboard',
  copilotChat: 'POST /copilot/chat',
} as const

/** @deprecated use SPRINT4_ENDPOINTS */
export const WEEK3_ENDPOINTS = SPRINT4_ENDPOINTS
