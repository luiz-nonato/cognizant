import type { DashboardSnapshot } from '../api/types'
import { formatMoney, formatPercent } from '../config/currency'
import {
  formatDemoMaterialName,
  formatItemType,
  formatUom,
} from '../i18n/formatters'
import { useI18n } from '../i18n/I18nProvider'
import { resolveCurrencyCode } from '../config/currency'

interface DashboardViewProps {
  data: DashboardSnapshot | null
  loading: boolean
  error: string | null
}

export function DashboardView({ data, loading, error }: DashboardViewProps) {
  const { t, locale } = useI18n()
  const currency = resolveCurrencyCode()

  if (loading) {
    return (
      <section className="panel">
        <h2>{t('dashboard.title')}</h2>
        <p className="muted">{t('common.loading')}</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="panel">
        <h2>{t('dashboard.title')}</h2>
        <p className="error" role="alert">
          {error}
        </p>
      </section>
    )
  }

  if (!data) {
    return (
      <section className="panel">
        <h2>{t('dashboard.title')}</h2>
        <p className="muted">{t('dashboard.empty')}</p>
      </section>
    )
  }

  const money = (n: number) => formatMoney(n, currency, locale)

  return (
    <div className="stack-layout">
      <section className="panel">
        <h2>{t('dashboard.title')}</h2>
        <p className="panel-lead">{t('dashboard.lead')}</p>
        <p className="muted">{t('dashboard.period')}</p>

        <div className="kpi-row" role="group" aria-label={t('dashboard.title')}>
          <div className="kpi">
            <span className="kpi-label">{t('dashboard.revenue')}</span>
            <span className="kpi-value">{money(data.revenue)}</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">{t('dashboard.cogs')}</span>
            <span className="kpi-value">{money(data.cogs)}</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">{t('dashboard.profit')}</span>
            <span className="kpi-value">{money(data.profit)}</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">{t('dashboard.margin')}</span>
            <span className="kpi-value">
              {formatPercent(data.margin_pct, locale)}
            </span>
          </div>
          <div className="kpi">
            <span className="kpi-label">{t('dashboard.lowStock')}</span>
            <span className="kpi-value">{data.low_stock_count}</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <h3>{t('dashboard.pipeline')}</h3>
        <dl className="detail-grid compact">
          <div>
            <dt>{t('dashboard.pending')}</dt>
            <dd>{data.orders.pending}</dd>
          </div>
          <div>
            <dt>{t('dashboard.inProgress')}</dt>
            <dd>{data.orders.in_progress}</dd>
          </div>
          <div>
            <dt>{t('dashboard.completed')}</dt>
            <dd>{data.orders.completed}</dd>
          </div>
        </dl>
      </section>

      <section className="panel">
        <h3>{t('dashboard.alerts')}</h3>
        {data.low_stock_alerts.length === 0 ? (
          <p className="muted">0</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('inventory.type')}</th>
                <th>{t('inventory.sku')}</th>
                <th>{t('material.name')}</th>
                <th>{t('inventory.onHand')}</th>
                <th>{t('inventory.reorderCol')}</th>
              </tr>
            </thead>
            <tbody>
              {data.low_stock_alerts.map((a) => (
                <tr key={`${a.item_type}-${a.sku}`}>
                  <td>{formatItemType(a.item_type, t)}</td>
                  <td>
                    <code>{a.sku}</code>
                  </td>
                  <td>
                    {a.item_type === 'RM'
                      ? formatDemoMaterialName(a.sku, a.name, t)
                      : a.name}
                  </td>
                  <td>
                    {a.on_hand} {formatUom(a.uom, t)}
                  </td>
                  <td>
                    {a.reorder_point} {formatUom(a.uom, t)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <h3>{t('dashboard.topProducts')}</h3>
        {data.top_products.length === 0 ? (
          <p className="muted">{t('dashboard.empty')}</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('material.name')}</th>
                <th>{t('dashboard.revenue')}</th>
                <th>{t('dashboard.cogs')}</th>
                <th>{t('dashboard.profit')}</th>
                <th>{t('dashboard.margin')}</th>
              </tr>
            </thead>
            <tbody>
              {data.top_products.map((p) => (
                <tr key={p.fg_sku}>
                  <td>
                    {p.name} <code>{p.fg_sku}</code>
                  </td>
                  <td>{money(p.revenue)}</td>
                  <td>{money(p.cogs)}</td>
                  <td>{money(p.profit)}</td>
                  <td>{formatPercent(p.margin_pct, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
