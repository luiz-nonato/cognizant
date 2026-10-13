import { useState } from 'react'
import type { CostingSnapshot, Recipe } from '../api/types'
import { COSTING_ZERO } from '../mocks/fixtures'
import { CostStack } from './CostStack'
import { CopilotPanel } from './CopilotPanel'

interface RecipeViewProps {
  recipe: Recipe | null
  costing: CostingSnapshot | null
  loading: boolean
  error: string | null
}

export function RecipeView({ recipe, costing, loading, error }: RecipeViewProps) {
  const [showZeroCostDemo, setShowZeroCostDemo] = useState(false)

  if (loading) {
    return (
      <section className="panel">
        <h2>Recipe</h2>
        <p className="muted">Loading recipe and costing…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="panel">
        <h2>Recipe</h2>
        <p className="error" role="alert">
          {error}
        </p>
      </section>
    )
  }

  if (!recipe || !costing) {
    return (
      <section className="panel">
        <h2>Recipe</h2>
        <p className="muted">No recipe registered yet.</p>
      </section>
    )
  }

  const displayCosting = showZeroCostDemo ? COSTING_ZERO : costing

  return (
    <div className="recipe-layout">
      <section className="panel">
        <div className="panel-header-row">
          <h2>Recipe</h2>
          <label className="demo-toggle">
            <input
              type="checkbox"
              checked={showZeroCostDemo}
              onChange={(e) => setShowZeroCostDemo(e.target.checked)}
            />
            Show zero-cost case (DEC-16)
          </label>
        </div>
        <p className="panel-lead">
          Explicit yield, contribution cost stack, and recommended price from the
          domain engine.
        </p>

        <dl className="detail-grid">
          <div>
            <dt>Name</dt>
            <dd>{showZeroCostDemo ? displayCosting.recipe_name : recipe.name}</dd>
          </div>
          <div>
            <dt>ID</dt>
            <dd>
              <code>
                {showZeroCostDemo ? displayCosting.recipe_id : recipe.id}
              </code>
            </dd>
          </div>
          <div>
            <dt>Finished product SKU</dt>
            <dd>
              {displayCosting.finished_product_sku ??
                recipe.finished_product_sku ??
                '—'}
            </dd>
          </div>
          <div>
            <dt>Yield</dt>
            <dd>
              <strong>{displayCosting.yield}</strong> finished units
            </dd>
          </div>
          <div>
            <dt>Target margin</dt>
            <dd>
              {(displayCosting.target_margin * 100).toFixed(0)}% of sell price
            </dd>
          </div>
        </dl>

        <CostStack costing={displayCosting} />
      </section>

      {!showZeroCostDemo && <CopilotPanel recipeId={recipe.id} />}
    </div>
  )
}
