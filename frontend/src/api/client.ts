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
  FoodProductSearchResponse,
  HitlProposal,
  HitlProposalCreate,
  HitlStatus,
  InventoryItem,
  Material,
  Order,
  Recipe,
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
    async getRecipes() {
      return request<Recipe[]>('/recipes')
    },
    async getRecipe(id) {
      return request<Recipe>(`/recipes/${encodeURIComponent(id)}`)
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
    async getRecipes() {
      return Object.values(recipesById)
    },
    async getRecipe(id) {
      return recipesById[id] ?? notFound('Recipe', id)
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
        const order: Order = {
          id: `ord-mock-${mockOrders.length + 1}`,
          recipe_id: String(proposal.payload.recipe_id ?? RECIPE_BREAD.id),
          fg_sku: 'FG-BREAD-001',
          quantity: Number(proposal.payload.quantity ?? 1),
          sell_price: Number(
            proposal.payload.sell_price ?? COSTING_BREAD.recommended_sell_price,
          ),
          status: 'pending',
          cost_at_sale: null,
          revenue: null,
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
  materials: 'GET /materials',
  materialById: 'GET /materials/{id}',
  recipes: 'GET /recipes',
  recipeById: 'GET /recipes/{id}',
  recipeCosting: 'GET /recipes/{id}/costing',
  inventory: 'GET /inventory',
  orders: 'GET /orders',
  hitlProposals: 'GET|POST /hitl/proposals',
  hitlApprove: 'POST /hitl/proposals/{id}/approve',
  hitlReject: 'POST /hitl/proposals/{id}/reject',
  foodProducts: 'GET /external/food-products?q=',
  copilotChat: 'POST /copilot/chat',
} as const

/** @deprecated use SPRINT4_ENDPOINTS */
export const WEEK3_ENDPOINTS = SPRINT4_ENDPOINTS
