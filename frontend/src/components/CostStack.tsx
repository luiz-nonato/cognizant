import type { CostingSnapshot } from '../api/types'
import { formatMoney, resolveCurrencyCode } from '../config/currency'
import {
  formatCostMethod,
  formatDemoMaterialName,
  formatUom,
} from '../i18n/formatters'
import { useI18n } from '../i18n/I18nProvider'

interface CostStackProps {
  costing: CostingSnapshot
}

export function CostStack({ costing }: CostStackProps) {
  const { t, locale } = useI18n()
  const currency = resolveCurrencyCode()
  const money = (n: number) => formatMoney(n, currency, locale)
  const showZeroLabel =
    costing.unit_cost === 0 ||
    costing.recommended_price_label === 'n/a / zero cost'

  return (
    <div className="cost-stack">
      <h3>{t('recipe.costStack')}</h3>
      <p className="muted method-label">
        {t('recipe.costMethod')}:{' '}
        {formatCostMethod(costing.input_unit_cost_method, t)}
      </p>

      <dl className="detail-grid compact">
        <div>
          <dt>{t('recipe.totalMaterial')}</dt>
          <dd>{money(costing.total_material_cost)}</dd>
        </div>
        <div>
          <dt>{t('recipe.unitCost')}</dt>
          <dd>{money(costing.unit_cost)}</dd>
        </div>
        <div>
          <dt>{t('recipe.targetMargin')}</dt>
          <dd>{(costing.target_margin * 100).toFixed(0)}%</dd>
        </div>
        <div>
          <dt>{t('recipe.recommended')}</dt>
          <dd>
            {showZeroLabel ? (
              <span className="zero-cost-label" data-testid="zero-cost-label">
                {t('cost.zeroLabel')}
              </span>
            ) : (
              money(costing.recommended_sell_price)
            )}
            {showZeroLabel && (
              <span className="muted numeric-hint">
                {' '}
                ({costing.recommended_sell_price})
              </span>
            )}
          </dd>
        </div>
      </dl>

      <table className="data-table">
        <caption>{t('recipe.costStack')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('material.name')}</th>
            <th scope="col">{t('orders.qty')}</th>
            <th scope="col">{t('inventory.unitCost')}</th>
            <th scope="col">{t('dashboard.cogs')}</th>
            <th scope="col">{t('dashboard.margin')}</th>
          </tr>
        </thead>
        <tbody>
          {costing.lines.map((line) => (
            <tr key={`${line.material_id}-${line.quantity}`}>
              <td>
                {formatDemoMaterialName(
                  line.material_id,
                  line.material_name,
                  t,
                )}
              </td>
              <td>
                {line.quantity} {formatUom(line.uom, t)}
              </td>
              <td>{money(line.input_unit_cost)}</td>
              <td>{money(line.line_cost)}</td>
              <td>{line.contribution_pct.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
