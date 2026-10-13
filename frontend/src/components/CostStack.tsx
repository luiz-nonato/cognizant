import type { CostingSnapshot } from '../api/types'
import { formatMoney } from '../config/currency'

interface CostStackProps {
  costing: CostingSnapshot
}

export function CostStack({ costing }: CostStackProps) {
  const showZeroLabel =
    costing.unit_cost === 0 ||
    costing.recommended_price_label === 'n/a / zero cost'

  return (
    <div className="cost-stack">
      <h3>Cost stack / engine figures</h3>
      <p className="muted method-label">
        Cost method: {costing.input_unit_cost_method}
      </p>

      <dl className="detail-grid compact">
        <div>
          <dt>Total material cost</dt>
          <dd>{formatMoney(costing.total_material_cost)}</dd>
        </div>
        <div>
          <dt>Unit cost</dt>
          <dd>{formatMoney(costing.unit_cost)}</dd>
        </div>
        <div>
          <dt>Target margin (% of sell price)</dt>
          <dd>{(costing.target_margin * 100).toFixed(0)}%</dd>
        </div>
        <div>
          <dt>Recommended sell price</dt>
          <dd>
            {showZeroLabel ? (
              <span className="zero-cost-label" data-testid="zero-cost-label">
                n/a / zero cost
              </span>
            ) : (
              formatMoney(costing.recommended_sell_price)
            )}
            {showZeroLabel && (
              <span className="muted numeric-hint">
                {' '}
                (API value: {costing.recommended_sell_price})
              </span>
            )}
          </dd>
        </div>
      </dl>

      <table className="data-table">
        <caption>Line contributions</caption>
        <thead>
          <tr>
            <th scope="col">Material</th>
            <th scope="col">Qty</th>
            <th scope="col">Input unit cost</th>
            <th scope="col">Line cost</th>
            <th scope="col">Contribution</th>
          </tr>
        </thead>
        <tbody>
          {costing.lines.map((line) => (
            <tr key={`${line.material_id}-${line.quantity}`}>
              <td>{line.material_name}</td>
              <td>
                {line.quantity} {line.uom}
              </td>
              <td>{formatMoney(line.input_unit_cost)}</td>
              <td>{formatMoney(line.line_cost)}</td>
              <td>{line.contribution_pct.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
